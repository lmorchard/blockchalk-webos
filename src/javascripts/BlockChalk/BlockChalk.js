/**
 * @fileOverview BlockChalk global package.
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Mojo, $L, $H */
var BlockChalk = (function () {

    /** @lends Memento */
    return {

        /**
         * Package initialization.
         */
        init: function () {
            return this;
        },

        /**
         * Set up app menu across scenes
         */
        setupGlobalMenu: function (controller) {
            controller.setupWidget(
                Mojo.Menu.appMenu, 
                { omitDefaultItems: true }, 
                {
                    visible: true,
                    items: [
                        // Mojo.Menu.editItem,
                        { label: "About", command: 'MenuAbout' },
                        { label: "Help", command: 'MenuHelp' },
                        // { label: "Preferences...", command: 'MenuPreferences' },
                        { label: "Reset user ID", command: 'MenuResetUserID' },
                        { label: "Report GPS status", command: 'MenuWhereami' }
                    ]
                }
            );
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
        formatDate: function(dt, model) {
            if (typeof dt === 'undefined') { return ''; }
            var out = new SimpleDateFormat('hh:mma').format(dt).toLowerCase();
            if ( (new Date()).toDateString() !== dt.toDateString() ) {
                out += new SimpleDateFormat("' on 'EEE', 'MMM dd").format(dt);
            }
            return out;
        },

        /**
         * Global app-wide initialization.
         */
        onLaunch: function (launch_params) {
            // this.refreshPrefs();
            // this.initModel();
            this.initService();
        },

        refreshPrefs: function () {
        },

        initModel: function () {
        },

        initService: function () {
            this.service = new BlockChalk.Service();
        },

        /**
         * Acquire a GPS fix on our location, stash it in BlockChalk.gps_fix if
         * successful.
         *
         * Intended to be bound to a scene assistant.
         */
        acquireGPSFix: function (chain) {
            Decafbad.Utils.showSimpleBanner('Finding your block...');
            this.controller.serviceRequest("palm://com.palm.location", { 
                method: "getCurrentPosition", 
                parameters: {
                    maximumAge: 0,
                    accuracy: 1,
                    responseTime: 2,
                    subscribe: false
                }, 
                onSuccess: function (gps_fix) {
                    Decafbad.Utils.showSimpleBanner('Found your block');
                    BlockChalk.gps_fix = gps_fix;
                    BlockChalk.search_location = gps_fix;
                    chain.next();
                },
                onError: chain.errorCallback('getCurrentPosition')
            }); 
        },

        /**
         * Login to BlockChalk by acquiring a new user ID, or using the ID
         * previously cached in a cookie.
         */
        loginToBlockChalk: function (chain) {
            Mojo.log("loginToBlockChalk");
            var cookie  = new Mojo.Model.Cookie('blockchalk_user_id'),
                user_id = cookie.get();

            if (user_id && /^[0-9A-Za-z]+$/.test(user_id)) {
                // Ensure the cookie contents are valid, ignore if not. Covers an
                // error case where the server API returned HTML for the user ID
                // on login.
                BlockChalk.user_id = user_id;
                Mojo.log("USER ID (cached) = %s", user_id);
                chain.next();
            } else {
                // Otherwise, request a new user ID from the server
                Decafbad.Utils.showSimpleBanner('Logging into BlockChalk...');
                BlockChalk.service.getNewUserID(
                    function (user_id, resp) {
                        Mojo.log("USER ID (fresh) = %s", user_id);
                        cookie.put(BlockChalk.user_id = user_id);
                        chain.next();
                    },
                    chain.errorCallback('getNewUserID')
                );
            }
        },

        /**
         * Setup continuous GPS tracking
         */
        setupGPSTracking: function (that) {
            BlockChalk.tracking_handle = 
                that.controller.serviceRequest("palm://com.palm.location", { 
                    method: "startTracking", 
                    parameters: {
                        maximumAge: 0,
                        accuracy: 1,
                        responseTime: 2,
                        subscribe: true
                    }, 
                    onSuccess: function (gps_fix) {
                        BlockChalk.gps_fix = gps_fix;
                        BlockChalk.search_location = gps_fix;
                    },
                    onError: function (resp) {
                    }
                }); 
        },

        EOF: null
    };

}());
