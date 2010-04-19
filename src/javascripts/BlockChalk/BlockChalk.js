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

        // Current logged in user ID
        user_id: null,
        // Current GPS fix
        gps_fix: null,
        // Current location for chalk search
        search_location: null,
        // Last count of replies
        replies_count: null,
        // BlockChalk API service
        service: null,
        // Cookie containing prefs
        prefs_cookie: null,
        // Prefs model object
        prefs_model: null,
        // GPS tracking subscription handle
        tracking_handle: null,

        /**
         * Package initialization.
         */
        init: function () {
            return this;
        },

        /**
         * Set up app menu across scenes
         */
        setupGlobalMenu: function (controller, disable_prefs, disable_help) {
            controller.setupWidget(
                Mojo.Menu.appMenu, 
                { omitDefaultItems: true }, 
                {
                    visible: true,
                    items: [
                        Mojo.Menu.editItem,
                        { label: "Preferences", command: 'MenuPreferences',
                            disabled: disable_prefs },
                        { label: "Help", command: 'MenuHelp',
                            disabled: disable_help }
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

            var out = '';
            if ( (new Date()).toDateString() == dt.toDateString() ) {
                out = prettyDate(dt);
            } else {
                out = ( new SimpleDateFormat("EEE MMM dd, yyyy, ").format(dt) ) +
                    ( new SimpleDateFormat('hh:mm a').format(dt).toLowerCase() );
            }

            return out;
        },

        /**
         * Global app-wide initialization.
         */
        onLaunch: function (launch_params) {
            this.initService();
            // this.initModel();
            this.refreshPrefs();
        },

        initModel: function () {
        },

        /**
         * Initialize the web service
         */
        initService: function () {
            this.service = new BlockChalk.Service();
        },

        /**
         * Refresh preferences from cookie.
         */
        refreshPrefs: function () {
            this.prefs_cookie = new Mojo.Model.Cookie('blockchalk_prefs');
            this.prefs_model = this.prefs_cookie.get() || {
                profanity_filter: true
            };

            this.service.profanity_filter = this.prefs_model.profanity_filter;
        },

        /**
         * Write and refresh changes to prefs.
         */
        updatePrefs: function () {
            this.prefs_cookie.put(this.prefs_model);
            this.refreshPrefs();
        },

        /**
         * Acquire a GPS fix on our location, stash it in BlockChalk.gps_fix if
         * successful.
         *
         * Intended to be bound to a scene assistant.
         */
        acquireGPSFix: function (chain) {

            if (BlockChalk.tracking_handle && BlockChalk.gps_fix) {
                // Skip acquisition if tracking is working and we have a fix.
                BlockChalk.search_location = BlockChalk.gps_fix;
                return chain.next();
            }

            Decafbad.Utils.showSimpleBanner('Finding your block...');

            // Set up a periodic banner while GPS fix still in progress...
            var gps_timer = setInterval(function () {
                var msgs = [
                        $L("Still looking for your block..."),
                        $L("Waiting for GPS fix..."),
                        $L("Any second now..."),
                        $L("Bouncing off the satellites..."),
                        $L("Almost found your block...")
                    ],
                    msg = msgs[ Math.floor(msgs.length * Math.random()) ];
                Decafbad.Utils.showSimpleBanner(msg);
            }.bind(this), 15000);

            this.controller.serviceRequest("palm://com.palm.location", { 
                method: "getCurrentPosition", 
                parameters: {
                    maximumAge: 30,
                    accuracy: 1,
                    responseTime: 1,
                    subscribe: false
                }, 
                onSuccess: function (gps_fix) {
                    clearInterval(gps_timer); // Cancel the GPS fix banner.
                    Decafbad.Utils.showSimpleBanner('Found your block!');
                    BlockChalk.gps_fix = gps_fix;
                    BlockChalk.search_location = gps_fix;
                    Mojo.log('GPS fix acquired: %j', gps_fix);
                    chain.next();
                }.bind(this),
                onFailure: function () {
                    clearInterval(gps_timer); // Cancel the GPS fix banner.
                    this.controller.showAlertDialog({
                        title: $L("Location service failure"),
                        message: $L(
                            "Unable to access location services. " +
                            "You may need to turn on your GPS."
                        ),
                        choices: [
                            {label:$L("Ok"),  value:"ok", type:"dismiss"}
                        ],
                        onChoose: function(value) {
                        }.bind(this)
                    });
                    Decafbad.Utils.showSimpleBanner("Couldn't find your block!");
                    chain.on_error('getCurrentPosition');
                }.bind(this)
            }); 
        },

        /**
         * Setup continuous GPS tracking
         */
        setupGPSTracking: function (that) {
            if (BlockChalk.tracking_handle) { return; }
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
                    }.bind(that),
                    onFailure: function (resp) {
                        this.controller.showAlertDialog({
                            title: $L("Location service failure"),
                            message: $L(
                                "Unable to access location services. " +
                                "You may need to turn on your GPS."
                            ),
                            choices: [
                                {label:$L("Ok"),  value:"ok", type:"dismiss"}
                            ],
                            onChoose: function(value) {
                            }.bind(that)
                        });
                        Decafbad.Utils.showSimpleBanner("Couldn't find your block!");
                    }.bind(that)
                }); 
        },

        /**
         * Login to BlockChalk by acquiring a new user ID, or using the ID
         * previously cached in a cookie.
         */
        loginToBlockChalk: function (chain) {
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

                // Set up a timeout to fire in error if login doesn't happen in
                // a timely manner.
                var error_timeout = (function () {
                    Decafbad.Utils.showSimpleBanner('Login timed out!');
                    chain.on_error('login_timeout');
                }).bind(this).delay(10);

                BlockChalk.service.getNewUserID(
                    function (user_id, resp) {
                        Mojo.log("USER ID (fresh) = %s", user_id);
                        cookie.put(BlockChalk.user_id = user_id);
                        clearTimeout(error_timeout);
                        if (!(user_id && /^[0-9A-Za-z]+$/.test(user_id))) {
                            chain.on_error('getNewUserID');
                        } else {
                            Decafbad.Utils.showSimpleBanner('Logged in.');
                            chain.next();
                        }
                    },
                    chain.errorCallback('getNewUserID')
                );
            }
        },

        EOF: null
    };

}());
