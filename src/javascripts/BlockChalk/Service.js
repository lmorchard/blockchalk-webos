/**
 * @fileOverview BlockChalk.Service  package.
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Class, Ajax, Decafbad, BlockChalk, Mojo, $L, $H */
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
        return this;
    },

    getNewUserID: function (on_success, on_failure) {
        return this.apiRequest(
            'GET', '/user/new', {}, {},
            function (resp) {
                on_success(resp.responseText, resp);
            },
            on_failure
        );
    },

    apiRequest: function (method, path, params, body_params, on_success, on_failure) {

        var req  = new XMLHttpRequest(),
            url  = this.options.base_url + path,
            body = null;

        if (params) {
            url += '?' + $H(params).toQueryString();
        }
        if (body_params) {
            body = $H(params).toQueryString();
        }

        req.open(method, url);

        // WebKit disallows User-Agent
        // req.setRequestHeader('User-Agent', this.options.user_agent);

        req.onreadystatechange = function() {
            if (4 == req.readyState) {
                if (200 == req.status) {
                    on_success(req);
                } else {
                    on_failure(req);
                }
            }
        };

        req.send(body);
        return this;
    },

    EOF:null

});
