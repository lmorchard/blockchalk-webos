/**
 * @fileOverview BlockChalk.Service  package.
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Class, Ajax, Decafbad, BlockChalk, Mojo, $A, $L, $H */
BlockChalk.Service = Class.create(/** @lends BlockChalk.Service */{

    // Current location context (nearby, home, browse)
    location_context: 'nearby',

    /**
     * BlockChalk service wrapper
     *
     * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
     * @constructs
     */
    initialize: function (options) {
        this.options = Object.extend({
            base_url:   'http://blockchalk.com/api/v0.6',
            user_agent: 'blockchalk-decafbad-webos'
        }, options || {});

        this.profanity_filter = false;

        this.user_id = null;

        return this;
    },

    /**
     * Set the current location context from the set of home, nearby, browse.
     */
    setLocationContext: function (context) {
        if (['home', 'nearby', 'browse'].indexOf(context) !== -1) {
            this.location_context = context;
        }
        return this.location_context;
    },

    /**
     * Return the current location context.
     */
    getLocationContext: function () {
        return this.location_context;
    },

    /**
     * Set the default user ID for requests.
     *
     * @param {string} user_id User ID to use by default
     */
    setUserID: function (user_id) {
        this.user_id = user_id;
    },

    /**
     * Get a new user ID
     *
     * @param {function} on_success Success callback, passed user ID
     * @param {function} on_failure Failure callback
     */
    getNewUserID: function (on_success, on_failure) {
        return this.apiRequest('/user/new', {
            method: 'get',
            onSuccess: function (data, resp) {
                on_success(resp.responseText, resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Look up recent chalks near a given location
     *
     * @param {object}   gps_fix           GPS location fix
     * @param {string}   gps_fix.longitude Location longitude
     * @param {string}   gps_fix.latitude  Location latitude
     * @param {string}   gps_fix.horizAccuracy Horizontal accuracy
     * @param {string}   user_id           User ID for chalk list.
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    getRecentChalks: function (gps_fix, user_id, on_success, on_failure) {
        return this.apiRequest('/chalks', {
            method: 'get',
            parameters: {
                'user':     user_id,
                'long':     gps_fix.longitude,
                'lat':      gps_fix.latitude,
                'accuracy': ('nearby' == this.location_context) ?
                    gps_fix.horizAccuracy : null,
                'context':  this.location_context
            },
            onSuccess: function (data, resp) {
                if (!data || !data.length) {
                    return on_failure();
                }
                on_success(data.map(this._fixupChalk, this), resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Look up recent chalks near a given location
     *
     * @param {object}   gps_fix           GPS location fix
     * @param {string}   gps_fix.longitude Location longitude
     * @param {string}   gps_fix.latitude  Location latitude
     * @param {string}   gps_fix.horizAccuracy Horizontal accuracy
     * @param {string}   thread_id         Thread ID for chalks
     * @param {function} on_success        success callback
     * @param {function} on_failure        failure callback
     */
    getThreadChalks: function (gps_fix, thread_id, on_success, on_failure) {
        return this.apiRequest('/chalks', {
            method: 'get',
            parameters: {
                'threadId': thread_id,
                'long':     gps_fix.longitude,
                'lat':      gps_fix.latitude,
                'accuracy': ('nearby' == this.location_context) ?
                    gps_fix.horizAccuracy : null,
                'context':  this.location_context
            },
            onSuccess: function (data, resp) {
                if (!data || !data.length) {
                    return on_failure();
                }
                on_success(data.map(this._fixupChalk, this), resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Get a single chalk by ID.
     *
     * @param {string}   chalk_id    ID of chalk to fetch
     * @param {function} on_success  success callback, passed user id
     * @param {function} on_failure  failure callback
     */
    getChalk: function (chalk_id, on_success, on_failure) {
        return this.apiRequest('/chalk/'+chalk_id, {
            method: 'get',
            onSuccess: function (data, resp) {
                on_success(this._fixupChalk(data), resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Bury a single chalk by ID.
     *
     * @param {string}   chalk_id    ID of chalk to fetch
     * @param {string}   user_id     User ID for chalk
     * @param {function} on_success  success callback, passed user id
     * @param {function} on_failure  failure callback
     */
    buryChalk: function (chalk_id, user_id, on_success, on_failure) {
        return this.apiRequest('/chalk/'+chalk_id+'/bury', {
            method: 'post',
            parameters: {
                'user': user_id
            },
            onSuccess: on_success,
            onFailure: on_failure
        });
    },

    /**
     * Create a new chalk.
     *
     * @param {string}   msg               Chalk message contents
     * @param {object}   gps_fix           GPS location fix
     * @param {string}   gps_fix.longitude Location longitude
     * @param {string}   gps_fix.latitude  Location latitude
     * @param {string}   gps_fix.horizAccuracy Horizontal accuracy
     * @param {string}   user_id           User ID for chalk
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    createNewChalk: function (msg, gps_fix, user_id, chalkback_to, on_success, on_failure) {
        return this.apiRequest('/chalk/', {
            method: 'post',
            parameters: {
                'msg': msg,
                'long': gps_fix.longitude,
                'lat': gps_fix.latitude,
                'accuracy': gps_fix.horizAccuracy,
                'user': user_id,
                'chalkbackTo': chalkback_to
            },
            onSuccess: function (data, resp) {
                on_success(this._fixupChalk(data), resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Create a new reply.
     *
     * @param {string}   reply_to          Chalk ID for reply
     * @param {string}   msg               Reply message contents
     * @param {object}   gps_fix           GPS location fix
     * @param {string}   gps_fix.longitude Location longitude
     * @param {string}   gps_fix.latitude  Location latitude
     * @param {string}   gps_fix.horizAccuracy Horizontal accuracy
     * @param {string}   user_id           User ID for chalk
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    createNewReply: function (reply_to, msg, gps_fix, user_id, on_success, on_failure) {
        return this.apiRequest('/reply/', {
            method: 'post',
            parameters: {
                'replyTo':  reply_to,
                'msg':      msg,
                'long':     gps_fix.longitude,
                'lat':      gps_fix.latitude,
                'accuracy': gps_fix.horizAccuracy,
                'user':     user_id
            },
            onSuccess: on_success,
            onFailure: on_failure
        });
    },

    /**
     * Get recent replies written to a given user
     *
     * @param {string}   user_id           User ID for chalk
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    getRecentReplies: function (user_id, on_success, on_failure) {
        return this.apiRequest('/user/'+user_id+'/replies', {
            method: 'get',
            onSuccess: function (data, resp) {
                if (!data) { return on_success([]); }
                on_success(data.map(this._fixupChalk, this), resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Get recent chalkbacks written to a given user
     *
     * @param {string}   user_id           User ID for chalk
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    getRecentChalkbacks: function (user_id, on_success, on_failure) {
        return this.apiRequest('/user/'+user_id+'/chalkbacks', {
            method: 'get',
            onSuccess: function (data, resp) {
                if (!data) { return on_success([]); }
                on_success(data.map(this._fixupChalk, this), resp);
            }.bind(this),
            onFailure: on_failure
        });
    },

    /**
     * Get the user's current home location.
     */
    getHomeLocation: function (user_id, on_success, on_failure) {
        return this.apiRequest('/user/'+user_id+'/home', {
            method: 'get',
            onSuccess: on_success,
            onFailure: on_failure
        });
    },

    /**
     * Set the user's current home location.
     *
     * @param {string}   user_id           User ID for chalk
     * @param {object}   gps_fix           GPS location fix
     * @param {string}   gps_fix.longitude Location longitude
     * @param {string}   gps_fix.latitude  Location latitude
     * @param {string}   gps_fix.horizAccuracy Horizontal accuracy
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    setHomeLocation: function (user_id, gps_fix, on_success, on_failure) {
        return this.apiRequest('/home', {
            method: 'post',
            parameters: {
                'long':     gps_fix.longitude,
                'lat':      gps_fix.latitude,
                'accuracy': gps_fix.horizAccuracy,
                'user':     user_id
            },
            onSuccess: on_success,
            onFailure: on_failure
        });
    },

    /**
     * Get posting hint text from the service.
     */
    getPostingHint: function (gps_fix, on_success, on_failure) {
        return this.apiRequest('/system/postingHint', {
            method: 'get',
            parameters: {
                'long':     gps_fix.longitude,
                'lat':      gps_fix.latitude,
                'accuracy': gps_fix.horizAccuracy
            },
            onSuccess: on_success,
            onFailure: on_failure
        });
    },

    /**
     * Perform some post-response fixing on chalk records.
     */
    _fixupChalk: function (chalk) {
        chalk.datetime = this._parseDate(chalk.datetime);
        return chalk;
    },

    /**
     * Perform some post-response fixing on chalk records.
     */
    _fixupReply: function (reply) {
        reply.datetime = this._parseDate(reply.datetime);
        return chalk;
    },

    /**
     * Parse the BlockChalk date format into a JS date.
     */
    _parseDate: function (dt) {
        var parts = dt.split(' '),
            date_parts = parts[0].split('-'),
            time_parts = parts[1].split(':'),
            date = new Date();

        // I should probably use a date parsing library.
        date.setUTCFullYear(date_parts[0]);
        date.setUTCMonth(date_parts[1] - 1);
        date.setUTCDate(date_parts[2]);
        date.setUTCHours(time_parts[0]);
        date.setUTCMinutes(time_parts[1]);
        date.setUTCSeconds(time_parts[2]);

        return date;
    },

    /*

    User-specific operations:

    * GET /user/userId/chalks - Get recent chalks written by a given user
     
     */

    /**
     * Common API request call utility.
     *
     * @param {string}   path        Path to API resource
     * @param {object}   options     Ajax.Request options
     * @param {function} on_success  success callback, passed user id
     * @param {function} on_failure  failure callback
     */
    apiRequest: function (path, options) {
        var url = this.options.base_url + path;

        options.evalJSON = 'force';
        options.parameters = options.parameters || {};
        options.parameters.format = 'json';

        if (this.profanity_filter) {
            options.parameters.profanityFilter = 'true';
        }

        // HACK: Force a unique URL with timestamp for cache busting.
        options.parameters['__'] = ( new Date() ).getTime();

        var orig_on_success = options.onSuccess;
        options.onSuccess = function (resp) {
            orig_on_success(resp.responseJSON || null, resp);
        };

        Mojo.log("API URL: %s?%s", url, $H(options.parameters).toQueryString());

        return new Ajax.Request(url, options);
    },

    EOF:null

});
