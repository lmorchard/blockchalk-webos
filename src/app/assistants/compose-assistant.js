/**
 * @fileOverview Chalk composition scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function ComposeAssistant(chalkback_item) {
    this.chalkback_item = chalkback_item;
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
                message: '',
                submit_disabled: false
            };

            if (!this.chalkback_item) {
                // Remove the 'Post a new chalkback' title.
                // TODO: Change this to a CSS-driven mode.
                this.controller.get('chalkback').remove();
            } else {
                this.controller.get('contents').update(
                    this.chalkback_item.contents.escapeHTML()
                );
                this.controller.get('meta').update([
                    BlockChalk.formatDate(this.chalkback_item.datetime),
                    ", ",
                    this.chalkback_item.distance
                ].join('').escapeHTML());
            }

            // Setup the posting text field.
            this.controller.setupWidget(
                'chalk-message',
                {
                    'modelProperty': 'message',
                    'hintText': '',
                    'multiline':true,
                    'enterSubmits':true,
                    'autoFocus':true,
                    'changeOnKeyPress': true,
                    'autoReplace': true
                },
                this.model
            );

            // Dynamically update text field hint text from the posting hint
            // API resource.
            BlockChalk.service.getPostingHint(
                BlockChalk.gps_fix,
                function (data) {
                    $$('#chalk-message .multiline-hint-text')[0]
                        .update(data.hint.short);
                }
            );

            this.controller.setupWidget(
                'chalk-post', 
                { 
                    label: $L('post'),
                    disabledProperty: 'submit_disabled'
                }, 
                this.model
            );

            if (!this.chalkback_item) {
                this.controller.get('compose-scene').className = 'here';
                this.controller.get('helptext-chalkback').hide();
            } else {
                this.controller.get('compose-scene').className = 'chalkback';
                this.controller.get('helptext-chalkback').show();
            }

            this.updateRemainingChars();

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {

            /*
            var chain = new Decafbad.Chain([
                BlockChalk.acquireGPSFix
            ], this, function (e) { }).next();
            */

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

            BlockChalk.service.createNewChalk(
                this.model.message, BlockChalk.gps_fix, BlockChalk.user_id,
                (this.chalkback_item) ? this.chalkback_item.id : null,
                function (new_chalk) {

                    Decafbad.Utils.showSimpleBanner($L('New chalk created'));
                    this.controller.stageController.popScene({ refresh: true });

                }.bind(this),
                function (resp) {

                    Decafbad.Utils.showSimpleBanner(
                        $L('Chalk creation failed. Try again?'));
                    this.model.submit_disabled = false;
                    this.controller.modelChanged(this.model);

                    Mojo.Log.error("CHALK FAILED %j", resp);

                }.bind(this)
            );

        },

        EOF: null
    };

}());
