/**
 * @fileOverview Provides the chain utility for continuation-passing.
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 *
 * Inspired by: http://en.wikipedia.org/wiki/Continuation-passing_style
 */
/*jslint laxbreak: true */
/*global Decafbad, Class, Note, Mojo, $A, $L, $H, SimpleDateFormat */
Decafbad.Chain = Class.create(/** @lends Decafbad.Chain */{

    /**
     * Chain of functions, useful in sequencing async calls.
     *
     * @constructs
     * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
     *
     * @param {array} action List of functions for chain
     * @param {object} object Object used as this scope in calls.
     */
    initialize: function(actions, object, on_error) {
        this.running  = null;
        this.actions  = actions.compact() || [];
        this.object   = object;
        this.on_error = on_error || function() {};

        return this;
    },

    /** 
     * Run the next function in the chain.
     */
    next: function()  {

        if (!this.actions.length) {
            return false;
        }

        var action = this.actions.shift(),
            args = $A(arguments);

        args.unshift(this);

        try {
            if (typeof action == 'string') {
                if (this.object && typeof this.object[action] == 'function') {
                    this.object[action].apply(this.object, args);
                } else {
                    this.on_error('unknown method');
                }
            } else if (typeof action == 'function') {
                if (this.object) {
                    action.apply(this.object, args);
                } else {
                    action.apply(this, args);
                }
            }
        } catch(e) {
            if (typeof Mojo.Log.logException != 'undefined') {
                Mojo.Log.logException(e);
            }
            this.on_error(e);
        }

        return this;
    },

    /**
     * Generate a callback for the .next() method.  
     *
     * Any parameters supplied to this method are passed to next() when the
     * callback is called, followed by any parameters supplied to the callback. 
     */
    nextCallback: function () {
        var args  = $A(arguments),
            $this = this;
        return function () {
            $this.next.apply($this, args.concat($A(arguments)));
        };
    },

    /**
     * Generate a bound callback for the on_error method.
     *
     * Any parameters supplied to this method are passed to on_error when the
     * callback is called, followed by any parameters supplied to the callback. 
     */
    errorCallback: function () {
        var args  = $A(arguments),
            $this = this;
        return function () {
            $this.on_error.apply($this, args.concat($A(arguments)));
        };
    }

});
