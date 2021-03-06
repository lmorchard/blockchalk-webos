/**
 * @fileOverview Chalk reply scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function ReplyAssistant(reply_item) {
    this.reply_item = reply_item;
}

ReplyAssistant.prototype = (function () { /** @lends ReplyAssistant# */

    var MAX_MESSAGE_LENGTH = 256;

    return {

        /**
         * Set up the whole card.
         */
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller);

            this.model = {
                message: '',
                submit_disabled: false
            };

            if (this.reply_item.kind) {
                this.controller.get('kind').update(
                    this.reply_item.kind.escapeHTML()
                );
            }

            this.controller.get('contents').update(
                this.reply_item.contents.escapeHTML()
            );

            this.controller.get('meta').update([
                BlockChalk.formatDate(this.reply_item.datetime),
                ", ",
                this.reply_item.distance
            ].join('').escapeHTML());

            this.controller.setupWidget(
                'chalk-message',
                {
                    'modelProperty': 'message',
                    'hintText': $L('Insert your genius reply here.'),
                    'multiline': true,
                    'enterSubmits': true,
                    'autoFocus': true,
                    'changeOnKeyPress': true,
                    'autoReplace': true
                },
                this.model
            );

            this.controller.setupWidget(
                'chalk-post',
                { 
                    label: $L('post'),
                    disabledProperty: 'submit_disabled'
                }, 
                this.model
            );

            this.updateRemainingChars();

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            var chain = new Decafbad.Chain([
                BlockChalk.acquireGPSFix
            ], this, function (e) { }).next();

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

            counter.update('<span>'+remaining+'</span> characters');
            return remaining;
        },

        /**
         * Handle changes to the message field, mainly to update counter.
         */
        handleChange: function (ev) {
            var remaining = this.updateRemainingChars();

            // If enter is pressed, pretend the post button was tapped.
            if (ev && Mojo.Char.isEnterKey(ev.originalEvent.keyCode)) {
                this.handleSubmit(ev);
            }
        },

        /**
         * Handle a tap on the submit button to post the chalk.
         */
        handleSubmit: function (ev) {
            
            // Prevent duplicate submissions
            if (this.model.submit_disabled) { return; }
            
            // Refuse to submit messages over the limit
            var remaining = this.updateRemainingChars();
            if (remaining < 0) { return; }

            // Flag this submission as in progress
            this.model.submit_disabled = true;
            this.controller.modelChanged(this.model);

            BlockChalk.service.createNewReply(

                this.reply_item.id, this.model.message, 
                BlockChalk.gps_fix, BlockChalk.user_id,

                function (new_chalk) {

                    Decafbad.Utils.showSimpleBanner($L('Reply sent'));
                    this.controller.stageController.popScene({ refresh: true });

                }.bind(this),

                function (resp) {
                    
                    Decafbad.Utils.showSimpleBanner($L('Reply failed!'));
                    this.model.submit_disabled = false;
                    this.controller.modelChanged(this.model);

                }.bind(this)

            );

        },

        EOF: null
    };

}());

