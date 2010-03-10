/**
 * @fileOverview Chalk composition scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function ComposeAssistant(chalkback_item) {
    this.chalkback_item = chalkback_item;
}

ComposeAssistant.prototype = (function () { /** @lends ComposeAssistant# */

    return {

        // Scene pop debounce flag.
        popping: false,

        /**
         * Set up the whole card.
         */
        setup: function () {

            Decafbad.Utils.setupLoadingSpinner(this);
            Decafbad.Utils.showLoadingSpinner(this);

            BlockChalk.setupGlobalMenu(this.controller);

            var ext_compose_params = {
                'long':     BlockChalk.gps_fix.longitude,
                'lat':      BlockChalk.gps_fix.latitude,
                'accuracy': BlockChalk.gps_fix.horizAccuracy,
                'userId':   BlockChalk.user_id
            };

            if (this.chalkback_item) {
                ext_compose_params.replyId = this.chalkback_item.id;
            }

            var ext_compose_url = 'http://blockchalk.com/post_webos?' +
                $H(ext_compose_params).toQueryString();

            this.controller.setupWidget(
                'external-compose',
                {
                    url: ext_compose_url,
                    minFontSize: 19,
                    interrogateClicks: true,
                    virtualPageWidth: 320
                },
                { }
            );

        },

        /**
         * Hook up listeners on card activation.
         */
        activate: function (event) {
            var chain = new Decafbad.Chain([
                BlockChalk.acquireGPSFix
            ], this, function (e) { }).next();
            
            this.popping = false;

            this.controller.get('external-compose').mojo.focus();

            Decafbad.Utils.setupListeners([
                ['external-compose', Mojo.Event.webViewLoadStarted,
                    this.handleWebLoadStarted ],
                ['external-compose', Mojo.Event.webViewLoadStopped,
                    this.handleWebLoadStopped ],
                ['external-compose', Mojo.Event.webViewTitleUrlChanged,
                    this.handleWebTitleUrlChanged ]
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
         * React to the start of a page load in webview by showing the spinner.
         */
        handleWebLoadStarted: function (ev) {
            Decafbad.Utils.showLoadingSpinner(this);
        },

        /**
         * React to the stop of a page load in webview by hiding the spinner.
         * Also hides the black curtain, which should only appear at setup when
         * the webview is all-white.
         */
        handleWebLoadStopped: function (ev) {
            Decafbad.Utils.hideLoadingSpinner(this);
            $('curtain').hide();
        },

        /**
         * Intercept a change in title/URL and try to catch the success of a
         * chalk post to pop the scene.
         *
         * TODO: This should probably use addUrlRedirect() and
         * webViewUrlRedirect, but that didn't seem to be working.
         */
        handleWebTitleUrlChanged: function (ev) {
            if (/post-success$/.test(ev.url) && !this.popping) {
                // Debounce, since this URL change event happens up to 3 times
                // in a row.
                this.popping = true;
                $('curtain').show(); // Last-ditch effort to hide white page
                Decafbad.Utils.showSimpleBanner($L('Chalk sent'));
                this.controller.stageController.popScene({ refresh: true });
            }
        },

        EOF: null
    };

}());
