/**
 * @fileOverview Home scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function HomeAssistant() {
}

HomeAssistant.prototype = (function () { /** @lends HomeAssistant# */

    // Only check for new replies every 3 minutes.
    var REPLIES_CHECK_PERIOD = 1000 * 60 * 3;

    return {

        scrim: null,

        /**
         * Setup the application.
         */
        setup: function () {

            // BlockChalk.setupGPSTracking(this);
            BlockChalk.setupGlobalMenu(this.controller);
            
            this.chalklist_model = { items: [ ] };

            this.controller.setupWidget(
                'chalklist',
                {
                    reorderable:   false,
                    swipeToDelete: true,
                    itemTemplate:  'home/chalklist-item',
                    listTemplate:  'home/chalklist-container',
                    emptyTemplate: 'home/chalklist-empty',
                    formatters: {
                        datetime: BlockChalk.formatDate
                    }
                },
                this.chalklist_model
            );

            var command_menu_model = {items: [
                {items: [ 
                    { command:'NewChalk', label: $L('+ New ...'), 
                        icon: 'new', shortcut: 'N' }
                ]},
                {items: [ 
                    { command:'Here', label: $L('Here'), 
                        icon: 'here', shortcut: 'H' },
                    { command:'Replies', label: $L('Replies'), 
                        icon: 'conversation', shortcut: 'R' },
                    { command:'Search', label: $L('Search'), 
                        icon: 'search', shortcut: 'S' }
                ]},
                {items: [ 
                    { command:'Refresh', label: $L('Refresh'), 
                        icon: 'refresh' }
                ]}
            ]};
            this.controller.setupWidget(
                Mojo.Menu.commandMenu, {}, command_menu_model
            );

            Decafbad.Utils.setupLoadingSpinner(this);

            this.login();
        },

        /**
         * Try logging into BlockChalk.`
         */
        login: function () {
            Decafbad.Utils.showLoadingSpinner(this);

            var chain = new Decafbad.Chain([
                BlockChalk.loginToBlockChalk,
                function (chain) {
                    this.handleCommandHere();
                    chain.next();
                }
            ], this, function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                this.controller.showAlertDialog({
                    title: $L("Login failed"),
                    message: $L(
                        "Unable to contact BlockChalk server.  Check your network " +
                        "connection and retry, or cancel to try later."
                    ),
                    choices: [
                        {label:$L("Retry"),  value:"retry", type:"dismiss"},
                        {label:$L("Cancel"), value:"cancel", type:"negative"}
                    ],
                    onChoose: function(value) {
                        if ('retry' === value) {
                            return this.login();
                        }
                    }.bind(this)
                });
            }.bind(this)).next();
        },

        /**
         * React to card activation.
         */
        activate: function (ev) {

            Decafbad.Utils.setupListeners([
                ['chalklist', Mojo.Event.listTap, this.handleChalkTap],
                ['chalklist', Mojo.Event.listDelete, this.handleBuryChalk]
            ], this);

            // Handle refresh cues coming back from other scenes.
            if (typeof ev !== 'undefined') {
                if (typeof ev.refresh !== 'undefined') {
                    this.handleCommandRefresh();
                }
                if (typeof ev.search_location !== 'undefined') {
                    this.useSearchLocation(ev.search_location, ev.search_text);
                }
            }

            this.checkReplies();
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
            delete this.scrim;
            Decafbad.Utils.clearListeners(this);
        },

        /**
         * Get local recent chalks using current BlockChalk.gps_fix
         */
        getSearchLocationRecentChalks: function (chain) {
            Decafbad.Utils.showSimpleBanner('Finding recent chalks...');

            BlockChalk.service.getRecentChalks(
                BlockChalk.search_location, BlockChalk.user_id,
                chain.nextCallback(),
                chain.errorCallback('getRecentChalks')
            );
        },

        /**
         * Update the chalks list.
         */
        updateChalkList: function (chain, chalks) {

            this.chalklist_model.items = chalks.map(function (chalk) {
                chalk.hasLocation = (chalk.place) ? 'has-location' : '';
                chalk.hasChalkback = (chalk.chalkbackTo) ? 'has-chalkback' : '';
                chalk.time = chalk.datetime.toLocaleTimeString();
                chalk.date = chalk.datetime.toLocaleDateString();
                return chalk;
            }, this).sort(function (ca, cb) {
                var a = ca.datetime.getTime(),
                    b = cb.datetime.getTime();
                return (b - a);
            });

            var chalk_list = this.controller.get('chalklist');
            chalk_list.mojo.noticeUpdatedItems(0, this.chalklist_model.items);
            chalk_list.mojo.setLength(this.chalklist_model.items.length);

            if (BlockChalk.gps_fix === BlockChalk.search_location) {
                var neighborhood = this.determineNeighborhoodFromChalks();
                this.controller.get('subtitle').update(
                    'Looks like you\'re in<br />' +
                    '<span class="neighborhood">' + neighborhood + '</span>'
                );
            } else {
                this.controller.get('subtitle').update(
                    'Chalks nearby<br />' +
                    '"' + BlockChalk.search_text + '" <br />' +
                    '('+
                    BlockChalk.search_location.latitude + ', ' +
                    BlockChalk.search_location.longitude + ')'
                );
            }
            
            chain.next();
        },

        /**
         * Count the neighborhoods found in the list of chalks, return the name
         * of the neighborhood with the most appearances.
         */
        determineNeighborhoodFromChalks: function () {
            var counts = {},
                top = {},
                neighborhood = '';

            this.chalklist_model.items.forEach(function (chalk, idx) {
                var curr = chalk.neighborhood;
                if (!counts[curr]) {
                    // First appearance of this neighborhood.
                    top = { n: curr, c: 0 };
                    counts[curr] = 1;
                } else {
                    // Increment the neighborhood count.
                    counts[curr]++;
                    if (counts[curr] > top.c) {
                        // This neighborhood is now the top count.
                        top = { n: curr, c: counts[curr] };
                        neighborhood = curr;
                    }
                }
            }, this);

            return neighborhood;
        },

        /**
         * Launch chalk context menu
         */
        handleChalkTap: function (ev) {
            return this.controller.stageController.pushScene(
                'chalk', ev.item
            );
        },

        /**
         * Bury a chalk to hide it from view.
         */
        handleBuryChalk: function (ev) {
            BlockChalk.service.buryChalk(
                ev.item.id, BlockChalk.user_id,
                function (resp) {
                    // Decafbad.Utils.showSimpleBanner('Buried a chalk from view');
                },
                function (resp) {
                    Decafbad.Utils.showSimpleBanner('Chalk bury FAILED!');
                }
            );
        },

        /**
         * Menu command dispatcher.
         */
        handleCommand: function (event) {
            if(event.type !== Mojo.Event.command) { return; }
            var func = this['handleCommand'+event.command];
            if (typeof func !== 'undefined') {
                return func.apply(this, [event]);
            }
        },

        /**
         * Launch new chalk composition card.
         */
        handleCommandNewChalk: function (event) {
            this.controller.stageController.pushScene('compose');
        },
        
        /**
         * Launch location search card.
         */
        handleCommandSearch: function (event) {
            this.controller.stageController.pushScene('search');
        },
        
        /**
         * Launch location search card.
         */
        handleCommandReplies: function (event) {
            this.controller.stageController.pushScene('replies');
        },
        
        /**
         * Refresh the displayed chalks, after first getting a new GPS fix
         */
        handleCommandHere: function (event) {
            var chain = new Decafbad.Chain([
                function (chain) {
                    Decafbad.Utils.showLoadingSpinner(this);
                    chain.next();
                },
                BlockChalk.loginToBlockChalk,
                BlockChalk.acquireGPSFix,
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                }
            ], this, (function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failed to fetch chalks from server!');
            }).bind(this)).next();
        },

        /**
         * Set a new search location and update display.
         */
        useSearchLocation: function (search_location, search_text) {
            BlockChalk.search_location = search_location;
            BlockChalk.search_text = search_text;
            this.handleCommandRefresh();
        },

        /**
         * Refresh the displayed chalks, after first getting a new GPS fix
         */
        handleCommandRefresh: function (event) {
            if (!BlockChalk.user_id) {
                return this.login();
            }
            var chain = new Decafbad.Chain([
                function (chain) {
                    Decafbad.Utils.showLoadingSpinner(this);
                    chain.next();
                },
                BlockChalk.loginToBlockChalk,
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                }
            ], this, (function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failed to fetch chalks from server!');
            }).bind(this)).next();
        },

        /**
         * Check for replies and update the counter if necessary.
         */
        checkReplies: function (chain) {

            // Create the reply counter badge, if not already present.
            if (!this.controller.get('reply-count')) {
                document.body.select('.conversation')[0].insert(
                    '<div id="reply-count">99</div>'
                );
                this.controller.get('reply-count').hide();
            }

            // Try getting the timestamp of last replies read.
            var cookie = new Mojo.Model.Cookie('blockchalk_replies_read'),
                replies_read = cookie.get(),
                badge = this.controller.get('reply-count');

            // Try to ensure that reply checking doesn't happen too frequently
            if (BlockChalk.last_replies_check) {
                var last   = BlockChalk.last_replies_check,
                    now    = new Date(),
                    period = (now.getTime() - last.getTime());

                if ( period < REPLIES_CHECK_PERIOD ) {
                    if (replies_read > last.getTime()) {
                        // Hide the badge if last view of replies happened
                        // since last check.
                        badge.hide();
                    }
                    return;
                }
            }
            BlockChalk.last_replies_check = new Date();

            // Fetch replies, look for any new since last fetch
            BlockChalk.service.getRecentReplies(
                BlockChalk.user_id,
                function (replies) {

                    if (!replies.length) {
                        // Just hide the counter if there are none at all.
                        badge.hide();
                    } else {
                        // Count all the replies newer than the timestamp...
                        var count = 0;
                        replies.each(function (reply) {
                            if (!replies_read || reply.datetime.getTime() > replies_read) {
                                count++;
                            }
                        }, this);

                        if (count > 0) {
                            // Show the batch with the new replies count
                            badge.update(count);
                            badge.show();
                        } else {
                            // No new replies, so hide the counter.
                            badge.hide();
                        }
                        badge = null;
                    }
                }.bind(this)
            );

        },

        EOF:null
    };
}());
