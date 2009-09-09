/**
 * @fileOverview Help scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function HelpAssistant() {
}

HelpAssistant.prototype = (function () { /** @lends HomeAssistant# */

    return {

        /**
         * Setup the application.
         */
        setup: function () {
            BlockChalk.setupGlobalMenu(this.controller);

            this.controller.setupWidget(
                'close', { label: $L('start chalking!') }, {}
            );
        },

        /**
         * React to card activation.
         */
        activate: function (ev) {
            Decafbad.Utils.setupListeners([
                ['close', Mojo.Event.tap, function (ev) {
                    this.controller.stageController.popScene();
                }]
            ], this);
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

        /**
         * Handle menu commands.
         */
        handleCommand: function (event) {
        },

        EOF:null
    };
}());
