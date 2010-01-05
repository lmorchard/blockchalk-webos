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
                this.chalk.distance
            ].join(' ').escapeHTML());

            if (['here','home'].indexOf(BlockChalk.location_mode) === -1) {
                // User browsing another location, disallow chalkbacks.
                this.controller.get('chalkback-wrapper').remove();
                this.controller.get('reply-wrapper').width = "100%";
            } else {
                // Chalkbacks allowed here, so setup up the button.
                this.controller.setupWidget(
                    'chalk-chalkback-button', { label: $L('Chalkback') }, {}
                );
             }

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
                $$('.chalk-scene')[0].addClassName('chalkback');
                this.controller.setupWidget(
                    'chalk-view-chalkback-button', 
                    { label: $L('See original chalk') }, {}
                );
            }

            this.controller.setupWidget(
                'chalk-reply-button', { label: $L('Reply privately') }, {}
            );
            this.controller.setupWidget(
                'chalk-bury-button', { label: $L('Bury') }, {}
            );
            this.controller.setupWidget(
                'chalk-tweet-button', { label: $L('Tweet this') }, {}
            );

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            var listeners = [
                ['chalk-reply-button', Mojo.Event.tap, this.handleReply],
                ['chalk-bury-button', Mojo.Event.tap, this.handleBury],
                ['chalk-tweet-button', Mojo.Event.tap, this.handleTweet]
            ];
            if (['here','home'].indexOf(BlockChalk.location_mode) !== -1) {
                // Wire up the chalkback button if allowed.
                listeners.push([
                    'chalk-chalkback-button', 
                    Mojo.Event.tap, this.handleChalkback
                ]);
            }
            if (this.chalk.place) {
                // Wire up the location button if necessary.
                listeners.push([
                    'chalk-view-location-button', 
                    Mojo.Event.tap, this.handleViewLocation
                ]);
            }
            if (this.chalk.chalkbackTo) {
                // Wire up the view chalkback button if necessary.
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
            this.controller.showAlertDialog({
                title: $L("Bury this chalk?"),
                message: $L("Burying a chalk hides it from your view and helps us fight abuse."),
                choices: [
                    {label:$L("Bury"), value:"yes", type:"negative"},
                    {label:$L("Cancel"),  value:"no", type:"dismiss"}
                ],
                onChoose: function(value) {
                    if ('yes' == value) {
                        BlockChalk.service.buryChalk(
                            this.chalk.id, BlockChalk.user_id,
                            function (resp) {
                                this.controller.stageController
                                    .popScene({ refresh: true });
                            }.bind(this),
                            function (resp) {
                                Decafbad.Utils.showSimpleBanner($L('Bury failed!'));
                            }.bind(this)
                        );
                    }
                }.bind(this)
            });
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
         * Handle tap on the tweet button
         */
        handleTweet: function (ev) {
            var url = "http://m.twitter.com/home?status=" +
                encodeURIComponent(
                    'Check out this chalk on my block ' +
                    'http://blockchalk.com/'+this.chalk.id+'#chalk'
                );
            Mojo.log("Tweet this URL: %s", url);
            this.controller.serviceRequest("palm://com.palm.applicationManager", {
                method: "open",
                parameters:  {
                    id: 'com.palm.app.browser',
                    params: { target: url }
                }
            });
        },

        EOF: null
    };

}());
