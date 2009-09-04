/**
 * @fileOverview Chalk detail scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, Ajax, $, $L, $A, $H, SimpleDateFormat */
function ChalkAssistant(chalk) {
    this.chalk = chalk;
}

ChalkAssistant.prototype = (function () { /** @lends ChalkAssistant# */

    return {

        /**
         * Set up the whole card.
         */
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller);

            this.controller.setupWidget(
                'search-button', { label: $L('browse') }, {}
            );

            Mojo.log("VIEWING CHALK %j", this.chalk);

            this.controller.get('contents').update(
                this.chalk.contents.escapeHTML()
            );

            this.controller.get('meta').update([
                BlockChalk.formatDate(this.chalk.datetime),
                ", ",
                this.chalk.distance
            ].join('').escapeHTML());

            this.controller.setupWidget(
                'chalk-reply-button', { label: $L('Reply') }, {}
            );
            this.controller.setupWidget(
                'chalk-bury-button', { label: $L('Bury') }, {}
            );
            this.controller.setupWidget(
                'chalk-share-button', { label: $L('Share') }, {}
            );

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            Decafbad.Utils.setupListeners([
                ['chalk-reply-button', Mojo.Event.tap, this.handleReply],
                ['chalk-bury-button', Mojo.Event.tap, this.handleBury],
                ['chalk-share-button', Mojo.Event.tap, this.handleShare]
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
         * Handle tap on the reply button.
         */
        handleReply: function (ev) {
            this.controller.stageController.pushScene('reply', this.chalk);
        },

        /**
         * Handle tap on the bury button
         */
        handleBury: function (ev) {
            BlockChalk.service.buryChalk(
                this.chalk.id, BlockChalk.user_id,
                function (resp) {
                    this.controller.stageController.popScene({ refresh: true });
                }.bind(this),
                function (resp) {
                    Decafbad.Utils.showSimpleBanner($L('Bury failed!'));
                }.bind(this)
            );
        },

        /**
         * Handle tap on the share button
         */
        handleShare: function (ev) {

        },

        EOF: null
    };

}());

