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
            if (false && !first_run_complete) {
                // Display help on first run, as an introduction.
                this.controller.pushScene('instructions');
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
         * Help menu command
         */
        handleCommandMenuPreferences: function (event) {
            return this.controller.pushScene('preferences');
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
