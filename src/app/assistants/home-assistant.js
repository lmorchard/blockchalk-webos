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
    var REPLIES_CHECK_PERIOD = 1000 * 60 * 1;

    return {

        view_mode: 'Here',

        scrim: null,

        /**
         * Setup the application.
         */
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller);

            BlockChalk.setupGPSTracking(this);

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

            this.controller.setupWidget(
                'sethome-button',
                {
                    label: $L('Set as Home Neighborhood')
                },
                {}
            );

            this.command_menu_model = {items: [
                {items: [ 
                    { command:'NewChalk', label: $L('+ New ...'), 
                        icon: 'new', shortcut: 'N' }
                ]},
                {
                    toggleCmd: 'Here', 
                    items: [ 
                        { command:'Here', label: $L('Here'), 
                            icon: 'here' },
                        { command:'Home', label: $L('Home'),
                            icon: 'home', shortcut: 'H' },
                        { command:'Search', label: $L('Search'), 
                            icon: 'search', shortcut: 'S' },
                        { command:'Replies', label: $L('Replies'), 
                            icon: 'conversation', shortcut: 'R' }
                    ]
                },
                {items: [ 
                    { command:'Refresh', label: $L('Refresh'), 
                        icon: 'refresh' }
                ]}
            ]};
            this.controller.setupWidget(
                Mojo.Menu.commandMenu, {}, this.command_menu_model
            );

            Decafbad.Utils.setupLoadingSpinner(this);

            this.login();
        },

        /**
         * Set the view mode for scene, highlighting appropriate tab and
         * locator type.
         */
        setViewMode: function (mode) {
            if (!mode) { 
                // If no mode supplied, just reset the current mode.
                mode = this.view_mode; 
            } else {
                // Set the new mode.
                this.view_mode = mode;
            }

            this.view_mode = ''+this.view_mode;

            // HACK: Hide the new chalk command button in non-{home,here} modes.
            setTimeout(function () {
                var first_cmd_group = 
                    $$('#mojo-scene-home .command-menu .palm-menu-group')[0];
                if (['here'].indexOf(this.view_mode.toLowerCase()) === -1) {
                    first_cmd_group.setStyle('opacity: 0');
                } else {
                    first_cmd_group.setStyle('');
                }
            }.bind(this), 0.1);

            this.controller.get('home-scene').className = mode.toLowerCase();
            this.command_menu_model.items[1].toggleCmd = mode;
            this.controller.modelChanged(this.command_menu_model);
            this.updateRepliesBadge();
        },

        /**
         * Try logging into BlockChalk.`
         */
        login: function () {
            Decafbad.Utils.showLoadingSpinner(this);

            var chain = new Decafbad.Chain([
                BlockChalk.loginToBlockChalk,
                'getHomeLocation',
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
                ['chalklist', Mojo.Event.listDelete, this.handleBuryChalk],
                ['sethome-button', Mojo.Event.tap, this.handleCommandMenuMakeHome]
            ], this);

            // Handle cues coming back from other scenes.
            if (typeof ev !== 'undefined') {
                if ('undefined' !== typeof ev.command) {
                    // Accept commands from popped scenes.
                    var func = this['handleCommand'+ev.command];
                    if (typeof func !== 'undefined') {
                        return func.apply(this, [event]);
                    }
                }
                if (typeof ev.refresh !== 'undefined') {
                    // Accept a refresh signal from popped scene.
                    this.handleCommandRefresh();
                }
                if (typeof ev.search_location !== 'undefined') {
                    // Accept a change in search location from popped scene.
                    BlockChalk.service.setLocationContext('browse');
                    this.useSearchLocation(ev.search_location, ev.search_text);
                }
            }

            this.setViewMode();
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

            if ('nearby' == BlockChalk.service.getLocationContext()) {
                // If using 'here', make sure search location is up to date
                // with GPS fix.
                BlockChalk.search_location = BlockChalk.gps_fix;
            }

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

            // Force scroll to top, since scroll position is stuck otherwise
            this.controller.get('mojo-scene-home-scene-scroller').mojo.revealTop();

            // Clear any homeless state that might be stuck.
            this.controller.get('home-scene').removeClassName('homeless');

            // Fixup items with a few status flags, process dates, then sort by
            // timestamps in reverse chron order.
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

            // Update the list itself in the UI.
            var chalk_list = this.controller.get('chalklist');
            chalk_list.mojo.noticeUpdatedItems(0, this.chalklist_model.items);
            chalk_list.mojo.setLength(this.chalklist_model.items.length);

            // Find the name of the neighborhood.
            var neighborhood = this.determineNeighborhoodFromChalks();

            if ('home' === BlockChalk.service.getLocationContext()) {
                // This is 'home', adjust the neighborhood name.
                BlockChalk.home_location.neighborhood = neighborhood;
            }

            // If this is home, hide the set-as-home button. Show otherwise.
            if (BlockChalk.home_location &&
                    (neighborhood === BlockChalk.home_location.neighborhood)) {
                this.controller.get('sethome-button').hide();
            } else {
                this.controller.get('sethome-button').show();
            }

            // Display the location and search text in applicable view modes.
            this.controller.get('location').innerText = neighborhood;
            this.controller.get('search_text').innerText = BlockChalk.search_text;

            /* TODO: Enable later for debugging?
            this.controller.get('coordinates').innerText =
                BlockChalk.search_location.latitude + ', ' +
                BlockChalk.search_location.longitude;
            */
            
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
                if (!neighborhood && curr) {
                    neighborhood = curr;
                }
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
                    Decafbad.Utils.showSimpleBanner('Chalk report FAILED!');
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
         * Set the current location as home.
         */
        handleCommandMenuMakeHome: function (event) {
            BlockChalk.home_location = BlockChalk.gps_fix;
            BlockChalk.service.setHomeLocation(
                BlockChalk.user_id,
                BlockChalk.search_location,
                function () {
                    this.handleCommandHome();
                    Decafbad.Utils.showSimpleBanner('Home location set.');
                }.bind(this),
                function () {
                    Decafbad.Utils.showSimpleBanner('Home location failed.');
                }.bind(this)
            );
        },

        /**
         * Launch new chalk composition card.
         */
        handleCommandNewChalk: function (event) {
            if (['here'].indexOf(this.view_mode.toLowerCase()) === -1) {
                // Ignore taps when not in home or here view modes.
                return;
            }
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
            this.updateRepliesBadge();
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
                function (chain) {
                    BlockChalk.service.setLocationContext('nearby');
                    chain.next();
                },
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    this.setViewMode('Here');
                    Decafbad.Utils.hideLoadingSpinner(this);
                }
            ], this, (function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failed to fetch chalks from server!');
            }).bind(this)).next();
        },

        /**
         * Switch search location to saved home, refresh chalks.
         */
        handleCommandHome: function (event) {
            var chain = new Decafbad.Chain([
                function (chain) {
                    Decafbad.Utils.showLoadingSpinner(this);
                    chain.next();
                },
                BlockChalk.loginToBlockChalk,
                'getHomeLocation',
                function (chain) {
                    if (null === BlockChalk.home_location) {
                        // Set the homeless state in the view, stop the spinner.
                        this.controller.get('home-scene').addClassName('homeless');
                        Decafbad.Utils.hideLoadingSpinner(this);
                    } else {
                        // We got a location, so proceed with it as search
                        // location.
                        BlockChalk.service.setLocationContext('home');
                        BlockChalk.search_location = BlockChalk.home_location;
                        chain.next();
                    }
                },
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    this.setViewMode('Home');
                    Decafbad.Utils.hideLoadingSpinner(this);
                }
            ], this, (function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failed to fetch home from server!');
            }).bind(this)).next();
        },

        /**
         * Fetch the current home location
         */
        getHomeLocation: function (chain) {
            BlockChalk.service.getHomeLocation(
                BlockChalk.user_id,
                function (data) {
                    BlockChalk.home_location = data;
                    chain.next();
                }.bind(this),
                chain.errorCallback()
            );
        },

        /**
         * Set a new search location and update display.
         */
        useSearchLocation: function (search_location, search_text) {
            BlockChalk.search_location = search_location;
            BlockChalk.search_text = search_text;
            this.handleCommandRefresh(null, "Search");
        },

        /**
         * Refresh the displayed chalks, after first getting a new GPS fix
         */
        handleCommandRefresh: function (event, mode_after) {
            if (!BlockChalk.user_id) {
                return this.login();
            }
            var chain = new Decafbad.Chain([
                function (chain) {
                    Decafbad.Utils.showLoadingSpinner(this);
                    // Reset the view mode, which helps in the homeless state.
                    this.setViewMode();
                    chain.next();
                },
                BlockChalk.loginToBlockChalk,
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    if (mode_after) {
                        this.setViewMode(mode_after);
                    }
                    this.checkReplies(true);
                    Decafbad.Utils.hideLoadingSpinner(this);
                }
            ], this, (function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failed to fetch chalks from server!');
            }).bind(this)).next();
        },

        /**
         * Update the badge display of new replies.
         */
        updateRepliesBadge: function () {
            // Create the reply counter badge, if not already present.
            if (!this.controller.get('reply-count')) {
                document.body.select('.conversation')[0].insert(
                    '<div id="reply-count">99</div>'
                );
                this.controller.get('reply-count').hide();
            }
            var badge = this.controller.get('reply-count');

            // If the count is over zero, show the badge and update it.
            var count = BlockChalk.replies_count + BlockChalk.chalkbacks_count;
            if (count > 0) {
                badge.update(count);
                badge.show();
            } else {
                badge.hide();
            }
        },

        /**
         * Check for replies and update the counter if necessary.
         */
        checkReplies: function (force_check) {

            // Try to ensure that reply checking doesn't happen too frequently
            if (!force_check && BlockChalk.last_replies_check) {
                var last   = BlockChalk.last_replies_check,
                    now    = new Date(),
                    period = (now.getTime() - last.getTime());
                if ( period < REPLIES_CHECK_PERIOD ) { return; }
            }
            BlockChalk.last_replies_check = new Date();

            // Try getting the timestamp of last replies read.
            var replies_cookie = new Mojo.Model.Cookie('blockchalk_replies_read'),
                replies_read = replies_cookie.get(),
                replies_count = 0,
                chalkbacks_cookie = new Mojo.Model.Cookie('blockchalk_chalkbacks_read'),
                chalkbacks_read = chalkbacks_cookie.get(),
                chalkbacks_count = 0;

            // Check replies and chalkbacks to assemble count of unseen items.
            // TODO: This seems kind of ugly.  Find a better way?
            var chain = new Decafbad.Chain([
                function (chain) {
                    // Get replies and count any newer than last replies read
                    // date.
                    BlockChalk.service.getRecentReplies(
                        BlockChalk.user_id,
                        function (items) {
                            items.each(function (item) {
                                var item_time = item.datetime.getTime();
                                if (!replies_read || item_time > replies_read) {
                                    replies_count++;
                                }
                            }, this);
                            // Update the global replies counter.
                            BlockChalk.replies_count = replies_count;
                            chain.next();
                        }.bind(this)
                    );
                },
                function (chain) {
                    // Get chalkbacks and count any newer than last chalkbacks
                    // read date.
                    BlockChalk.service.getRecentChalkbacks(
                        BlockChalk.user_id,
                        function (items) {
                            items.each(function (item) {
                                var item_time = item.datetime.getTime();
                                if (!chalkbacks_read || item_time > chalkbacks_read) {
                                    chalkbacks_count++;
                                }
                            }, this);
                            // Update the global chalkbacks counter.
                            BlockChalk.chalkbacks_count = chalkbacks_count;
                            chain.next();
                        }.bind(this)
                    );
                },
                function () {
                    // Finally, update the replies badge from counters.
                    this.updateRepliesBadge();
                }
            ], this, function (e) {
            }).next();

        },

        EOF:null
    };
}());
