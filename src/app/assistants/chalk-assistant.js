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

            this.controller.get('contents').update(
                this.chalk.contents.escapeHTML()
            );

            this.controller.get('meta').update([
                BlockChalk.formatDate(this.chalk.datetime),
                this.chalk.distance
            ].join(' ').escapeHTML());

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
                    itemTemplate:  'chalk/threadlist-item',
                    listTemplate:  'chalk/threadlist-container',
                    emptyTemplate: 'chalk/threadlist-empty',
                    formatters: {
                        datetime: BlockChalk.formatDate
                    }
                },
                this.threadlist_model
            );

            if (['nearby','home'].indexOf(BlockChalk.service.getLocationContext()) !== -1) {
                this.controller.get('chalk-scene')
                    .addClassName('can-chalkback');
                this.controller.setupWidget(
                    'chalk-message', 
                    {
                        modelProperty: 'message',
                        hintText: $L('Write a comment...'),
                        multiline: true,
                        focus: false,
                        enterSubmits: true,
                        textFieldName: "chalk-message",
                        className: " ",
                        changeOnKeyPress: true
                    }, 
                    this.model
                );
            }

            Decafbad.Utils.setupLoadingSpinner(this);
        },

        /**
         * Refresh the chalk thread list in the scene.
         */
        refresh: function (bottom) {
            // Reset the post field.
            this.model.message = '';
            this.controller.modelChanged(this.model);
            this.model.submit_disabled = false;
            this.updateRemainingChars();

            Decafbad.Utils.showLoadingSpinner(this);

            BlockChalk.service.getThreadChalks(
                BlockChalk.gps_fix, 
                this.chalk.threadId,
                function (chalks) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    this.updateThreadDisplay(chalks, bottom);
                }.bind(this),
                function () {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    // TODO: Error handler.
                }.bind(this)
            );
        },

        /**
         * Update the thread display from a list of chalks.
         */
        updateThreadDisplay: function (chalks, bottom) {

            // Fixup items with a few status flags, process dates, then sort by
            // timestamps in reverse chron order.
            this.threadlist_model.items = chalks
                .filter(function (chalk) {
                    return chalk.id != this.chalk.threadId;
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

            var scroller = this.controller
                .get('mojo-scene-chalk-scene-scroller').mojo;
            if (bottom) {
                scroller.revealBottom();
            } else {
                var chalk_el = this.controller
                    .get('blockchalk-'+ this.chalk.id);
                if (chalk_el) {
                    var dim = chalk_el.getDimensions();
                    scroller.revealElement(chalk_el);
                    scroller.adjustBy(0, 0 - dim.height - 5);
                }
            }
        
            chain.next();
        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            var listeners = [
                ['chalk-reply-button', Mojo.Event.tap, this.handleReply],
                ['chalk-bury-button', Mojo.Event.tap, this.handleBury],
                ['chalk-email-button', Mojo.Event.tap, this.handleEmail],
                ['threadlist', Mojo.Event.listTap, this.handleChalkTap]
            ];
            if (['nearby','home'].indexOf(BlockChalk.service.getLocationContext()) !== -1) {
                // Wire up the chalkback button if allowed.
                listeners.push(['chalk-post', 
                    Mojo.Event.tap, this.handlePostSubmit]);
                listeners.push(['chalk-message',
                    Mojo.Event.propertyChange, this.handlePostChange]);
            }
            if (this.chalk.place) {
                // Wire up the location button if necessary.
                listeners.push(['chalk-view-location-button', 
                    Mojo.Event.tap, this.handleViewLocation]);
            }

            Decafbad.Utils.setupListeners(listeners, this);

            this.refresh();
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
                                Decafbad.Utils.showSimpleBanner('Chalk reported.');
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

            counter.update(''+remaining);
            return remaining;
        },

        /**
         * Handle changes to the message field, mainly to update counter.
         */
        handlePostChange: function (ev) {
            var remaining = this.updateRemainingChars();

            // If enter is pressed, pretend the post button was tapped.
            if (ev && Mojo.Char.isEnterKey(ev.originalEvent.keyCode)) {
                this.handlePostSubmit(ev);
            }
        },

        /**
         * Handle a tap on the submit button to post the chalk.
         */
        handlePostSubmit: function (ev) {
            
            // Prevent duplicate submissions
            if (this.model.submit_disabled) { return; }
            
            // Refuse to submit messages over the limit
            var remaining = this.updateRemainingChars();
            if (remaining < 0) { return; }

            // Flag this submission as in progress
            this.model.submit_disabled = true;
            this.controller.modelChanged(this.model);

            Decafbad.Utils.showLoadingSpinner(this);

            BlockChalk.service.createNewChalk(
                this.model.message, BlockChalk.gps_fix, BlockChalk.user_id,
                this.chalk.id,
                function (new_chalk) {

                    Decafbad.Utils.hideLoadingSpinner(this);
                    this.refresh(true);

                }.bind(this),
                function (resp) {

                    Decafbad.Utils.hideLoadingSpinner(this);
                    Decafbad.Utils.showSimpleBanner(
                        $L('Chalk creation failed. Try again?')
                    );
                    this.model.submit_disabled = false;
                    this.controller.modelChanged(this.model);

                    Mojo.Log.error("CHALK FAILED %j", resp);

                }.bind(this)
            );

        },

        /**
         * Summon a pop up menu on chalk thread list tap.
         */
        handleChalkTap: function (ev) {
            this.controller.popupSubmenu({
                placeNear: ev.originalEvent.target,
                items: [
                    { command: 'reply', label: 'Reply Privately' },
                    { command: 'bury',  label: 'Report' }
                ],
                onChoose: function (command) {
                    switch (command) {
                        case 'reply':
                            return this.controller.stageController
                                .pushScene('reply', ev.item);
                        case 'bury':
                            return this.handleBuryChalk(ev);
                    }
                }.bind(this)
            });
        },

        /**
         * Bury a chalk to hide it from view.
         */
        handleBuryChalk: function (ev) {
            Decafbad.Utils.showLoadingSpinner(this);
            BlockChalk.service.buryChalk(
                ev.item.id, BlockChalk.user_id,
                function (resp) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    Decafbad.Utils.showSimpleBanner('Chalk reported.');
                    this.refresh();
                }.bind(this),
                function (resp) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    Decafbad.Utils.showSimpleBanner('Chalk report FAILED!');
                }.bind(this)
            );
        },

        EOF: null
    };

}());
