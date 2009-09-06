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
                        // { label: "Preferences...", command: 'MenuWhereami' },
                        { label: "Where am I?", command: 'MenuWhereami' },
                        { label: "About", command: 'MenuAbout' }
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
