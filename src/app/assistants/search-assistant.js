/**
 * @fileOverview Location search scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, Ajax, $, $L, $A, $H, SimpleDateFormat */
function SearchAssistant() {
}

SearchAssistant.prototype = (function () { /** @lends SearchAssistant# */

    var GOOGLE_API_KEY = 'ABQIAAAANRj9BHQi5ireVluCwVy0yRSCmNcocIVkYMm' +
        '17sKzM7yWmDW04hSOShDoI65g7OAJAYVy-up_VxccpQ';

    return {

        /**
         * Set up the whole card.
         */
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller);

            this.model = {
                location: '',
                submit_disabled: false
            };

            this.controller.setupWidget(
                'location',
                {
                    'modelProperty': 'location',
                    'hintText': $L('Enter a location'),
                    'multiline': true,
                    'enterSubmits': true,
                    'autoFocus': true,
                    'changeOnKeyPress': false,
                    'autoReplace': false,
                    'requiresEnterKey': true
                },
                this.model
            );

            this.controller.setupWidget(
                'search-button', 
                { 
                    label: $L('browse'),
                    disabledProperty: 'submit_disabled'
                }, 
                this.model
            );

            Decafbad.Utils.setupLoadingSpinner(this);

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            Decafbad.Utils.setupListeners([
                ['location', Mojo.Event.propertyChange, this.handleChange],
                ['search-button', Mojo.Event.tap, this.handleSubmit]
            ], this);
        },

        /**
         * Unhook listeners on card deactivation.
         */
        deactivate: function (event) {
            Decafbad.Utils.clearListeners(this);
        },

        /**
         * Clean everything up.
         */
        cleanup: function (event) {
        },

        /**
         * Handle changes to the search field.
         */
        handleChange: function (ev) {
            // If enter is pressed, pretend the button was tapped.
            if (ev && Mojo.Char.isEnterKey(ev.originalEvent.keyCode)) {
                this.handleSubmit(ev);
            }
        },

        /**
         * Handle a tap on the search button
         */
        handleSubmit: function (ev) {

            // Prevent duplicate submissions
            if (this.model.submit_disabled) { return; }
            
            Decafbad.Utils.showLoadingSpinner(this);

            // Flag this submission as in progress
            this.model.submit_disabled = true;
            this.controller.modelChanged(this.model);

            // Use Google's geocoder to look up the location by query
            var req = new Ajax.Request('http://maps.google.com/maps/geo', {

                method: 'get',
                
                evalJSON: 'force',

                parameters: {
                    q:      this.model.location,
                    output: 'json', 
                    oe:     'utf8',
                    sensor: 'true',
                    key:    GOOGLE_API_KEY
                },

                onSuccess: function (resp) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    var data = resp.responseJSON;
                    if (data.Status && 200 === data.Status.code) {
                        // Success! So use the result as a search location.
                        var coords = data.Placemark[0].Point.coordinates;
                        this.controller.stageController.popScenesTo('home', { 
                            search_text: this.model.location,
                            search_location: {
                                latitude:  coords[1],
                                longitude: coords[0]
                            }
                        });
                    } else {
                        // Failure. Bail.
                        return this.handleFailure(resp); 
                    }

                }.bind(this),
                
                onFailure: this.handleFailure.bind(this)

            });

        },

        /**
         * The geocode search was a failure, so alert the user.
         */
        handleFailure: function (resp) {
            Decafbad.Utils.hideLoadingSpinner(this);
            this.model.submit_disabled = false;
            this.controller.modelChanged(this.model);
            this.controller.get('location').mojo.focus();
            Decafbad.Utils.showSimpleBanner('Location lookup failed, try again?');
        },

        EOF: null
    };

}());
