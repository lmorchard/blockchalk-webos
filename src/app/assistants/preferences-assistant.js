/**
 * @fileOverview Preferences scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function PreferencesAssistant() {
}

PreferencesAssistant.prototype = (function () { /** @lends PreferencesAssistant# */

    return {

        /**
         * Setup the application.
         */
        setup: function () {

            // We don't need no stinking menu here
            this.controller.setupWidget(
                Mojo.Menu.appMenu, 
                { omitDefaultItems: true }, 
                { visible: false, items: [ ] }
            );

            this.controller.setupWidget(
                'profanity_filter',
                { modelProperty: 'profanity_filter' },
                BlockChalk.prefs_model
            );

            this.controller.setupWidget(
                'reset_user_id',
                { label: $L('Reset user ID') },
                {}
            );

        },

        /**
         * React to card activation.
         */
        activate: function (ev) {
            Decafbad.Utils.setupListeners([
                ['profanity_filter', Mojo.Event.propertyChange, 
                    this.handlePropertyChange],
                ['reset_user_id', Mojo.Event.tap, 
                    this.handleResetUserID]
            ], this);
        },

        /**
         * Handle changes to prefs model
         */
        handlePropertyChange: function (ev) {
            BlockChalk.updatePrefs();
        },

        /**
         * React to user ID reset tap
         */
        handleResetUserID: function (ev) {

            var currentScene = Mojo.Controller.stageController.activeScene();
            currentScene.showAlertDialog({
                title: $L("Reset your user ID?"),
                message: $L(
                    "Are you sure? After reset, you will no longer " + 
                    "receive replies to chalks posted with your previous ID."
                ),
                choices: [ 
                    {label:$L("Reset user ID"), value:"yes", type:"negative"},
                    {label:$L("Cancel"),  value:"no", type:"dismiss"}
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
         * React for card deactivation.
         */
        deactivate: function (ev) {
            Decafbad.Utils.clearListeners(this);
        },

        /**
         * Handle ultimate card clean up.
         */
        cleanup: function (ev) {
        },

        EOF:null
    };
}());
