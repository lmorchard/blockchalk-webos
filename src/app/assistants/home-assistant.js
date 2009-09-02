/**
 * @fileOverview Home stage assistant
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

            this.controller.setupWidget(
                Mojo.Menu.appMenu, 
                { omitDefaultItems: true }, 
                {
                    visible: true,
                    items: [
                        Mojo.Menu.editItem,
                        { label: "Preferences...", command: 'MenuPreferences' },
                        { label: "Where am I?", command: 'MenuWhereami' },
                        { label: "About", command: 'MenuAbout' }
                    ]
                }
            );
            
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
                        datetime: this._formatDate.bind(this)
                    }
                },
                this.chalklist_model
            );

            var command_menu_model = {items: [
                {items: [ 
                    { command:'NewChalk', label: $L('+ New ...'), 
                        icon: 'send', shortcut: 'N' }
                ]},
                {items: [ 
                    { command:'Refresh', label: $L('Refresh'), 
                        icon: 'refresh', shortcut: 'R' }
                ]}
            ]};
            this.controller.setupWidget(
                Mojo.Menu.commandMenu, {}, command_menu_model
            );

            var chain = new Decafbad.Chain([
                function (chain) {
                    this.showLoadingSpinner();
                    chain.next();
                },
                'loginToBlockChalk',
                'acquireGPSFix',
                'getLocalRecentChalks',
                'updateChalkList',
                function (chain) {
                    this.hideLoadingSpinner();
                    chain.next();
                }
            ], this, function (e) {
                this.hideLoadingSpinner();
                Decafbad.Utils.showSimpleBanner('Failure in startup');
                Mojo.Log.error("ERROR ERROR ERROR %j", $A(arguments));        
            }).next();

        },

        /**
         * React to card activation.
         */
        activate: function (ev) {

            Decafbad.Utils.setupListeners([
                // ['chalklist', Mojo.Event.listTap, this.handleViewChalk],
                ['chalklist', Mojo.Event.listDelete, this.handleBuryChalk]
            ], this);

            // Handle refresh cues coming back from other scenes.
            if (typeof ev !== 'undefined') {
                if (typeof ev.refresh !== 'undefined') {
                    this.handleCommandRefresh();
                }
                if (typeof ev.quick_refresh !== 'undefined') {
                    this.handleCommandQuickRefresh();
                }
            }

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
                    chain.next();
                },
                onError: chain.errorCallback('getCurrentPosition')
            }); 
        },

        /**
         * Get local recent chalks using current BlockChalk.gps_fix
         */
        getLocalRecentChalks: function (chain) {
            Decafbad.Utils.showSimpleBanner('Finding recent chalks...');

            BlockChalk.service.getRecentChalks(
                BlockChalk.gps_fix, BlockChalk.user_id,
                chain.nextCallback(),
                chain.errorCallback('getRecentChalks')
            );
        },

        /**
         * Update the chalks list.
         */
        updateChalkList: function (chain, chalks) {
            Decafbad.Utils.showSimpleBanner('Welcome to the neighborhood!');

            this.chalklist_model.items = chalks.map(function (chalk) {
                chalk.time = chalk.datetime.toLocaleTimeString();
                chalk.date = chalk.datetime.toLocaleDateString();
                return chalk;
            }, this);

            var chalk_list = this.controller.get('chalklist');
            chalk_list.mojo.noticeUpdatedItems(0, this.chalklist_model.items);
            chalk_list.mojo.setLength(this.chalklist_model.items.length);
            
            chain.next();
        },

        /**
         * Weekdays for _formatDate
         */
        weekdays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],

        /**
         * Months for _formatDate
         */
        months: ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul', 'Aug','Sep','Oct','Nov','Dec'],

        /**
         * Convert a date to a human-friendly string.
         * 11:34pm on Tue, Sep 01
         */
        _formatDate: function(dt, model) {
            if (typeof dt === 'undefined') { return ''; }

            var out = [
                dt.getHours() % 12, 
                ':', 
                ('00' + (''+dt.getMinutes())).substr(-2),
                ( dt.getHours() < 12 ) ? 'am' : 'pm'
            ];

            if ( (new Date()).toDateString() !== dt.toDateString() ) {
                out = out.concat([
                    ' on ', this.weekdays[dt.getDay()], ', ',
                    this.months[dt.getMonth()], ' ',
                    dt.getDate()
                ]);
            }

            return out.join('');
        },

        /**
         * Launch chalk detail view card
         */
        handleViewChalk: function (ev) {
            this.controller.stageController.pushScene('chalk', ev.item.id);
        },

        /**
         * Bury a chalk to hide it from view.
         */
        handleBuryChalk: function (ev) {
            BlockChalk.service.buryChalk(
                ev.item.id, BlockChalk.user_id,
                function (resp) {
                    Decafbad.Utils.showSimpleBanner('Buried a chalk from view');
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
         * Refresh the displayed chalks, after first getting a new GPS fix
         */
        handleCommandRefresh: function (event) {
            var chain = new Decafbad.Chain([
                function (chain) {
                    this.showLoadingSpinner();
                    chain.next();
                },
                'acquireGPSFix',
                'getLocalRecentChalks',
                'updateChalkList',
                function (chain) {
                    this.hideLoadingSpinner();
                    chain.next();
                }
            ], this, function (e) {
                this.hideLoadingSpinner();
                Decafbad.Utils.showSimpleBanner('Failure in refresh');
                Mojo.Log.info("ERROR ERROR ERROR %j", $A(arguments));        
            }).next();
        },

        /**
         * Refresh the displayed chalks, after first getting a new GPS fix
         */
        handleCommandQuickRefresh: function (event) {
            var chain = new Decafbad.Chain([
                'getLocalRecentChalks',
                'updateChalkList'
            ], this, function (e) {
                this.hideLoadingSpinner();
                Decafbad.Utils.showSimpleBanner('Failure in refresh');
                Mojo.Log.info("ERROR ERROR ERROR %j", $A(arguments));        
            }).next();
        },

        /**
         * Show the loading spinner, setting it up first if necessary.
         */
        showLoadingSpinner: function () {
            if (!this.scrim) { this.setupLoadingSpinner(); }
            this.scrim.show();
        },

        /**
         * Hide the loading spinner, setting it up first if necessary.
         */
        hideLoadingSpinner: function () {
            if (!this.scrim) { this.setupLoadingSpinner(); }
            this.scrim.hide();
        },

        /**
         * Set up the loading spinner, including an instance of a semi-opaque
         * scrim.
         */
        setupLoadingSpinner: function () {
            this.controller.setupWidget(
                "loading-spinner",
                { spinnerSize: Mojo.Widget.spinnerLarge },
                { spinning: true }
            );
            this.scrim = Mojo.View.createScrim(
                this.controller.document,
                { scrimClass:'palm-scrim' }
            );
            this.controller.get("loading-scrim")
                .appendChild(this.scrim)
                .appendChild($('loading-spinner'));
        },

        EOF:null
    };
}());
