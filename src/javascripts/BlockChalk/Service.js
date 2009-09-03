/**
 * @fileOverview BlockChalk.Service  package.
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Class, Ajax, Decafbad, BlockChalk, Mojo, $A, $L, $H */
BlockChalk.Service = Class.create(/** @lends BlockChalk.Service */{

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

        this.user_id = null;

        return this;
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
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    getRecentChalks: function (gps_fix, user_id, on_success, on_failure) {
        return this.apiRequest('/chalks', {
            method: 'get',
            parameters: {
                'user': user_id, 
                'long': gps_fix.longitude,
                'lat': gps_fix.latitude
            },
            onSuccess: function (data, resp) {
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
        Mojo.log("BURY CHALK! %s", chalk_id);
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
     * @param {string}   user_id           User ID for chalk
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    createNewChalk: function (msg, gps_fix, user_id, on_success, on_failure) {
        return this.apiRequest('/chalk/', {
            method: 'post',
            parameters: {
                'msg':  msg,
                'long': gps_fix.longitude,
                'lat':  gps_fix.latitude,
                'user': user_id
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
     * @param {string}   msg               Chalk message contents
     * @param {object}   gps_fix           GPS location fix
     * @param {string}   gps_fix.longitude Location longitude
     * @param {string}   gps_fix.latitude  Location latitude
     * @param {string}   user_id           User ID for chalk
     * @param {function} on_success        success callback, passed user id
     * @param {function} on_failure        failure callback
     */
    createNewReply: function (reply_to, msg, gps_fix, user_id, on_success, on_failure) {
        return this.apiRequest('/chalk/', {
            method: 'post',
            parameters: {
                'replyTo': reply_to,
                'msg':     msg,
                'long':    gps_fix.longitude,
                'lat':     gps_fix.latitude,
                'user':    user_id
            },
            onSuccess: on_success,
            onFailure: on_failure
        });
    },

    /**
     * Perform some post-response fixing on chalk records.
     */
    _fixupChalk: function (chalk) {
        var dt = chalk.datetime,
            parts = dt.split(' '),
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

        chalk.datetime = date;

        return chalk;
    },

    /*

    User-specific operations:

    * GET /user/userId/chalks - Get recent chalks written by a given user
    * GET /user/userId/replies - Get recent replies written to a given user
     
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

        var orig_on_success = options.onSuccess;
        options.onSuccess = function (resp) {
            orig_on_success(resp.responseJSON || null, resp);
        };

        return new Ajax.Request(url, options);
    },

    EOF:null

});
