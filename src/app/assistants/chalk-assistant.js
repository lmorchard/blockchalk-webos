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

            this.controller.get('contents').update(
                this.chalk.contents.escapeHTML()
            );

            this.controller.get('meta').update([
                BlockChalk.formatDate(this.chalk.datetime),
                ", ",
                this.chalk.distance
            ].join('').escapeHTML());

            // Hide the location button, or set it up if a place is present.
            if (!this.chalk.place) {
                this.controller.get('chalk-view-location-button').remove();
            } else {
                this.controller.setupWidget(
                    'chalk-view-location-button', 
                    { label: $L('View attached location') }, {}
                );
            }

            // Hide the view chalkback button, unless there's a chalkbackTo
            if (!this.chalk.chalkbackTo) {
                this.controller.get('chalk-view-chalkback-button').remove();
            } else {
                this.controller.setupWidget(
                    'chalk-view-chalkback-button', 
                    { label: $L('See original chalk') }, {}
                );
            }

            this.controller.setupWidget(
                'chalk-chalkback-button', { label: $L('Chalkback') }, {}
            );
            this.controller.setupWidget(
                'chalk-reply-button', { label: $L('Reply privately') }, {}
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
            var listeners = [
                ['chalk-chalkback-button', Mojo.Event.tap, this.handleChalkback],
                ['chalk-reply-button', Mojo.Event.tap, this.handleReply],
                ['chalk-bury-button', Mojo.Event.tap, this.handleBury]
                //['chalk-share-button', Mojo.Event.tap, this.handleShare]
            ];
            if (this.chalk.place) {
                listeners.push([
                    'chalk-view-location-button', 
                    Mojo.Event.tap, this.handleViewLocation
                ]);
            }
            if (this.chalk.chalkbackTo) {
                listeners.push([
                    'chalk-view-chalkback-button', 
                    Mojo.Event.tap, this.handleViewChalkback
                ]);
            }

            Decafbad.Utils.setupListeners(listeners, this);
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
            this.chalk.kind = 'chalk';
            this.controller.stageController.pushScene('reply', this.chalk);
        },

        /**
         * Handle tap on the chalkback reply button.
         */
        handleChalkback: function (ev) {
            return this.controller.stageController.pushScene(
                'compose', this.chalk
            );
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
         * Handle tap on the view attached location button
         */
        handleViewLocation: function (ev) {
            this.controller.serviceRequest('palm://com.palm.applicationManager', {
                method: 'launch',
                parameters: {
                    id: "com.palm.app.maps",
                    params: { "query": this.chalk.place }
                }
            });
        },

        /**
         * Handle tap on the view original chalkback button
         */
        handleViewChalkback: function (ev) {
            BlockChalk.service.getChalk(
                this.chalk.chalkbackTo,
                function (chalk) {
                    this.controller.stageController.pushScene('chalk', chalk);
                }.bind(this),
                function (resp) {
                    Decafbad.Utils.showSimpleBanner(
                        $L('Original chalk not found!')
                    );
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

