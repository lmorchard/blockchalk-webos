/**
 * @fileOverview Chalk composition stage assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function ComposeAssistant() {
}

ComposeAssistant.prototype = (function () { /** @lends ComposeAssistant# */

    var MAX_MESSAGE_LENGTH = 256;

    return {

        /**
         * Set up the whole card.
         */
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller);

            this.model = {
                message: ''
            };

            this.controller.setupWidget(
                'chalk-message',
                {
                    'modelProperty': 'message',
                    'hintText': $L('Insert your genius prose here.'),
                    'multiline':true,
                    'enterSubmits':true,
                    'autoFocus':true,
                    'changeOnKeyPress': true,
                    'autoReplace': true
                },
                this.model
            );

            this.controller.setupWidget(
                'chalk-post', { label: $L('post') }, {}
            );

            this.updateRemainingChars();

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            Decafbad.Utils.setupListeners([
                ['chalk-message', Mojo.Event.propertyChange, this.handleChange],
                ['chalk-post', Mojo.Event.tap, this.handleSubmit]
            ], this);
        },

        /**
         * Unhook listeners on card deactivation.
         */
        deactivate: function (event) {
            Decafbad.Utils.clearListeners(this);
        },

        /**
         * Clean everything up.
         */
        cleanup: function (event) {
        },

        /**
         * Update the remaining character counter, returning the count.
         */
        updateRemainingChars: function () {
            var remaining = MAX_MESSAGE_LENGTH - this.model.message.length;
            var counter = this.controller.get('character-count');
            
            if (remaining < 0) {
                counter.addClassName('over');
            } else {
                counter.removeClassName('over');
            }

            counter.update('<span>'+remaining+'</span> chars, stay calm');
            return remaining;
        },

        /**
         * Handle changes to the message field, mainly to update counter.
         */
        handleChange: function (ev) {
            var remaining = this.updateRemainingChars();
        },

        /**
         * Handle a tap on the submit button to post the chalk.
         */
        handleSubmit: function (ev) {
            var remaining = this.updateRemainingChars();
            if (remaining < 0) { return; }

            BlockChalk.service.createNewChalk(
                this.model.message, BlockChalk.gps_fix, BlockChalk.user_id,
                function (new_chalk) {
                    Decafbad.Utils.showSimpleBanner($L('New chalk created'));
                    this.controller.stageController.popScene({ refresh: true });
                }.bind(this),
                function (resp) {
                    this.controller.showAlertDialog({
                        onChoose: function(value) {},
                        title: $L("BlockChalk"),
                        message: "FAILED " + $A(arguments).toJSON(),
                        choices: [
                            {label:$L("OK"), value:""}
                        ]
                    });
                }.bind(this)
            );

        },

        EOF: null
    };

}());
