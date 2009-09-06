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

    return {

        scrim: null,

        /**
         * Setup the application.
         */
        setup: function () {

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

            var chain = new Decafbad.Chain([
                'loginToBlockChalk',
                function (chain) {
                    this.handleCommandHere();
                    chain.next();
                }
            ], this, function (e) {
                Decafbad.Utils.showSimpleBanner('Failure in startup');
                Mojo.Log.error("ERROR ERROR ERROR %j", $A(arguments));        
            }).next();

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
         * Login to BlockChalk by acquiring a new user ID, or using the ID
         * previously cached in a cookie.
         */
        loginToBlockChalk: function (chain) {
            Decafbad.Utils.showSimpleBanner('Logging into BlockChalk...');
            var cookie  = new Mojo.Model.Cookie('blockchalk_user_id'),
                user_id = cookie.get();
            if (user_id) {
                BlockChalk.user_id = user_id;
                chain.next();
            } else {
                BlockChalk.service.getNewUserID(
                    function (user_id) {
                        cookie.put(BlockChalk.user_id = user_id);
                        chain.next();
                    },
                    chain.errorCallback('getNewUserID')
                );
            }
        },

        /**
         * Acquire a GPS fix on our location, stash it in BlockChalk.gps_fix if
         * successful.
         */
        acquireGPSFix: function (chain) {
            Decafbad.Utils.showSimpleBanner('Finding your block...');
            this.controller.serviceRequest("palm://com.palm.location", { 
                method: "getCurrentPosition", 
                parameters: {
                    maximumAge: 0,
                    accuracy: 2,
                    responseTime: 2,
                    subscribe: false
                }, 
                onSuccess: function (gps_fix) {
                    BlockChalk.gps_fix = gps_fix;
                    BlockChalk.search_location = gps_fix;
                    chain.next();
                },
                onError: chain.errorCallback('getCurrentPosition')
            }); 
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

            if (BlockChalk.gps_fix === BlockChalk.search_location) {
                this.controller.get('subtitle')
                    .update('recent chalks near you');
            } else {
                this.controller.get('subtitle').update(
                    'recent chalks near <br />' + 
                    '"' + BlockChalk.search_text + '" <br />' +
                    '('+
                    BlockChalk.search_location.latitude + ', ' +
                    BlockChalk.search_location.longitude + ')'
                );
            }

            this.chalklist_model.items = chalks.map(function (chalk) {
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
            
            chain.next();
        },

        /**
         * Launch chalk detail view card
         */
        handleChalkTap: function (ev) {
            this.controller.popupSubmenu({
                placeNear: ev.target,
                items: [
                    { command: 'reply', label: 'Reply' },
                    { command: 'view',  label: 'View' }/*,
                    { command: 'share', label: 'Share' }*/
                ],
                onChoose: function (command) {
                    switch (command) {
                        case 'reply':
                            return this.controller.stageController.pushScene(
                                'reply', ev.item
                            );
                        case 'view':
                            return this.controller.stageController.pushScene(
                                'chalk', ev.item
                            );
                        case 'share':
                            return; // TODO
                    }
                }.bind(this)
            });
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
                'acquireGPSFix',
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    chain.next();
                }
            ], this, function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failure in refresh');
                Mojo.Log.info("ERROR ERROR ERROR %j", $A(arguments));        
            }).next();
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
            var chain = new Decafbad.Chain([
                function (chain) {
                    Decafbad.Utils.showLoadingSpinner(this);
                    chain.next();
                },
                'getSearchLocationRecentChalks',
                'updateChalkList',
                function (chain) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    chain.next();
                }
            ], this, function (e) {
                Decafbad.Utils.hideLoadingSpinner(this);
                Decafbad.Utils.showSimpleBanner('Failure in refresh');
                Mojo.Log.info("ERROR ERROR ERROR %j", $A(arguments));        
            }).next();
        },

        /**
         * Check for replies and update the counter if necessary.
         */
        checkReplies: function (chain) {

            // Create the reply counter, if not already present.
            if (!this.controller.get('reply-count')) {
                document.body.select('.conversation')[0].insert(
                    '<div id="reply-count">99</div>'
                );
                this.controller.get('reply-count').hide();
            }

            BlockChalk.service.getRecentReplies(
                BlockChalk.user_id,
                function (replies) {
                    if (!replies.length) {
                        this.controller.get('reply-count').hide();
                    } else {

                        var cookie = new Mojo.Model.Cookie('blockchalk_replies_read'),
                            replies_read = cookie.get(),
                            count = 0;

                        replies.each(function (reply) {
                            if (!replies_read || reply.datetime.getTime() > replies_read) {
                                count++;
                            }
                        }, this);

                        Mojo.log("REPLIES %s / %s / %s", 
                            count, replies.length, replies_read);

                        if (count > 0) {
                            this.controller.get('reply-count').update(count);
                            this.controller.get('reply-count').show();
                        } else {
                            this.controller.get('reply-count').hide();
                        }

                    }
                }.bind(this),
                function () {
                    Decafbad.Utils.showSimpleBanner('Replies get failed.');
                }
            );

        },

        EOF:null
    };
}());
