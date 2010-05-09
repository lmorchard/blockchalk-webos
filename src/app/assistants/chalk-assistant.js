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

            /*
            if (['nearby','home'].indexOf(BlockChalk.service.getLocationContext()) === -1) {
                // User browsing another location, disallow chalkbacks.
                this.controller.get('chalkback-wrapper').remove();
                this.controller.get('reply-wrapper').width = "100%";
            } else {
                // Chalkbacks allowed here, so setup up the button.
                this.controller.setupWidget(
                    'chalk-chalkback-button', { label: $L('Chalkback') }, {}
                );
             }
             */

            // Hide the location button, or set it up if a place is present.
            /*
            if (!this.chalk.place) {
                this.controller.get('chalk-view-location-button').remove();
            } else {
                this.controller.setupWidget(
                    'chalk-view-location-button', 
                    { label: $L('View attached location') }, {}
                );
            }
            */

            this.threadlist_model = { items: [ ] };
           
            this.controller.setupWidget(
                'threadlist',
                {
                    reorderable:   false,
                    swipeToDelete: true,
                    itemTemplate:  'chalk/threadlist-item',
                    listTemplate:  'chalk/threadlist-container',
                    emptyTemplate: 'chalk/threadlist-empty',
                    formatters: {
                        datetime: BlockChalk.formatDate
                    }
                },
                this.threadlist_model
            );

            BlockChalk.service.getThreadChalks(
                BlockChalk.gps_fix, 
                this.chalk.threadId,
                this.updateThreadDisplay.bind(this),
                function () {
                    // TODO: Error handler.
                }
            );

        },

        /**
         * Update the thread display from a list of chalks.
         */
        updateThreadDisplay: function (chalks) {

            // Fixup items with a few status flags, process dates, then sort by
            // timestamps in reverse chron order.
            this.threadlist_model.items = chalks
                .filter(function (chalk) {
                    return chalk.id != this.chalk.threadId
                }.bind(this))
                .map(function (chalk) {
                    chalk.isCurrent = (this.chalk.id == chalk.id) ?
                        'is-current' : '';
                    chalk.hasLocation = (chalk.place) ? 'has-location' : '';
                    chalk.hasChalkback = (chalk.chalkbackTo) ? 'has-chalkback' : '';
                    chalk.indicatorKind = (chalk.threadCount > 1) ? 
                        'indicator-kind-many' : 'indicator-kind-one';
                    
                    chalk.time = chalk.datetime.toLocaleTimeString();
                    chalk.date = chalk.datetime.toLocaleDateString();
                    return chalk;
                }, this);

            var first_chalk = chalks.shift();

            this.controller.get('contents').update(
                first_chalk.contents.escapeHTML()
            );

            this.controller.get('meta').update([
                BlockChalk.formatDate(first_chalk.datetime),
                first_chalk.distance
            ].join(' ').escapeHTML());

            // Update the list itself in the UI.
            var thread_list = this.controller.get('threadlist');
            thread_list.mojo.noticeUpdatedItems(0, this.threadlist_model.items);
            thread_list.mojo.setLength(this.threadlist_model.items.length);
        
            chain.next();
        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {

            var listeners = [
                ['chalk-reply-button', Mojo.Event.tap, this.handleReply],
                ['chalk-bury-button', Mojo.Event.tap, this.handleBury],
                ['chalk-tweet-button', Mojo.Event.tap, this.handleTweet],
                ['chalk-email-button', Mojo.Event.tap, this.handleEmail]
            ];
            if (['nearby','home'].indexOf(BlockChalk.service.getLocationContext()) !== -1) {
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
                title: $L("Report this chalk?"),
                message: $L("Reporting a chalk hides it from your view and helps us fight abuse."),
                choices: [
                    {label:$L("Report"), value:"yes", type:"negative"},
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
                                Decafbad.Utils.showSimpleBanner($L('Report failed!'));
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

        /**
         * Handle tap on the email button
         */
        handleEmail: function (ev) {
            this.controller.serviceRequest('palm://com.palm.applicationManager', {
                method: 'open',
                parameters: {
                    id: 'com.palm.app.email',
                    params: {
                        summary: 'Check out this post from BlockChalk',
                        text: $L(
                            "Hey, I wanted you to see this post from BlockChalk:\n\n"+
                            "http://blockchalk.com/"
                        )+this.chalk.id,
                        recipients: [ ]
                    }
                }
            });
        },

        EOF: null
    };

}());
