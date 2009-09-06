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
                location: ''
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
                'search-button', { label: $L('browse') }, {}
            );

            Decafbad.Utils.setupLoadingSpinner(this);

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            Decafbad.Utils.setupListeners([
                ['location', Mojo.Event.propertyChange, this.handleSubmit],
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
         * Handle a tap on the search button
         */
        handleSubmit: function (ev) {

            Decafbad.Utils.showLoadingSpinner(this);

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

                    var data   = resp.responseJSON,
                        coords = data.Placemark[0].Point.coordinates;
                    this.controller.stageController.popScene({ 
                        search_text: this.model.location,
                        search_location: {
                            latitude:  coords[1],
                            longitude: coords[0]
                        }
                    });
                }.bind(this),
                
                onFailure: function (resp) {
                    Decafbad.Utils.hideLoadingSpinner(this);
                    Decafbad.Utils.showSimpleBanner('Location lookup failed');
                }.bind(this)

            });

        },

        EOF: null
    };

}());
