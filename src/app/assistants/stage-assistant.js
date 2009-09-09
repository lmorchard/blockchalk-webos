/**
 * @fileOverview Main stage assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function StageAssistant() {
}

StageAssistant.prototype = (function () { /** @lends StageAssistant# */

    return {

        setup: function() {
            this.controller.setWindowOrientation('free');
            this.controller.pushScene('home');

            // Use a cookie to try to track the first run after installation.
            var first_run_cookie = new Mojo.Model.Cookie('blockchalk_first_run'),
                first_run_complete = first_run_cookie.get();
            if (!first_run_complete) {
                // Display help on first run, as an introduction.
                this.controller.pushScene('help');
            }
            first_run_cookie.put(true);
        },

        /**
         * Menu command dispatcher.
         */
        handleCommand: function (event) {
            if(event.type !== Mojo.Event.command) { return; }
            var func = this['handleCommand'+event.command];
            if (typeof func !== 'undefined') {
                return func.apply(this, [event]);
            }
        },

        /**
         * Help menu command
         */
        handleCommandMenuHelp: function (event) {
            return this.controller.pushScene('help');
        },

        /**
         * About dialog menu command
         */
        handleCommandMenuAbout: function (event) {
            var currentScene = Mojo.Controller.stageController.activeScene();
            currentScene.showAlertDialog({
                onChoose: function(value) {},
                title: $L("BlockChalk for webOS"),
                message: $L("by l.m.orchard@pobox.com, http://blockchalk.com/"),
                choices: [ {label:$L("OK"), value:""} ]
            });
            return;
        },

        /**
         * Handle reset user ID menu command.
         */
        handleCommandMenuResetUserID: function (event) {

            var currentScene = Mojo.Controller.stageController.activeScene();
            currentScene.showAlertDialog({
                title: $L("Reset your user ID?"),
                message: $L(
                    "Are you sure? After reset, you will no longer " + 
                    "receive replies to chalks posted with your previous ID."
                ),
                choices: [ 
                    {label:$L("Reset user ID"), value:"yes", type:"negative"},
                    {label:$L("Cancel"),  value:"no", type:"dismiss"},
                ],
                onChoose: function(value) {
                    if ('yes' == value) {

                        // Clear the cookie
                        var cookie  = new Mojo.Model.Cookie('blockchalk_user_id');
                        cookie.put(null);

                        // Queue up a new get.
                        var chain = new Decafbad.Chain([
                            BlockChalk.loginToBlockChalk,
                            function (chain) {
                                Decafbad.Utils.showSimpleBanner('User ID has been reset');
                                Mojo.Log.error("USER ID = " + BlockChalk.user_id);
                                return chain.next();
                            }
                        ], this).next();

                    }
                }.bind(this)
            });


        },

        /**
         * Debugging command to report GPS status.
         */
        handleCommandMenuWhereami: function (event) {
            var currentScene = Mojo.Controller.stageController.activeScene();
            currentScene.showAlertDialog({
                onChoose: function(value) {},
                title: $L("BlockChalk"),
                message: (!BlockChalk.gps_fix) ?
                    "I don't know" : $H(BlockChalk.gps_fix).toJSON(),
                choices: [ {label:$L("OK"), value:""} ]
            });
        }

    };

}());
