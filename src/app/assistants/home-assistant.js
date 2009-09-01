/**
 * @fileOverview Main stage assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $H, SimpleDateFormat */
function HomeAssistant() {
}

HomeAssistant.prototype = (function () { /** @lends HomeAssistant# */

    return {

        scrim: null,

        setup: function () {

            this.chalklist_model = { items: [
                /*
                { title: 'one one one one one one one one one one one one one one one one', meta: 'one item one item one item one item one item one item one item one item ' },
                { title: 'two', meta: 'two item' },
                { title: 'three', meta: 'three item' },
                { title: 'one', meta: 'one item' },
                { title: 'two', meta: 'two item' },
                { title: 'three', meta: 'three item' },
                { title: 'one', meta: 'one item' },
                { title: 'two', meta: 'two item' },
                { title: 'three', meta: 'three item' },
                { title: 'one', meta: 'one item' },
                { title: 'two', meta: 'two item' },
                { title: 'three', meta: 'three item' },
                { title: 'one', meta: 'one item' },
                { title: 'two', meta: 'two item' },
                { title: 'three', meta: 'three item' },
                */
            ] };

            this.controller.setupWidget(
                'chalklist',
                {
                    reorderable:   false,
                    itemTemplate:  'home/chalklist-item',
                    listTemplate:  'home/chalklist-container',
                    emptyTemplate: 'home/chalklist-empty'
                },
                this.chalklist_model
            );

            var command_menu_model = {items: [
                {items: [ 
                    { label: $L('+ New ...'), /*icon: 'new-note',*/ command:'NewNote' }
                ]},
                {items: [ 
                    { label: $L('Refresh'), /*icon: 'new-note',*/ command:'Refresh' }
                ]}
            ]};
            this.controller.setupWidget(
                Mojo.Menu.commandMenu, {}, command_menu_model
            );

            this.showLoadingSpinner();

            var chain = new Decafbad.Chain([

                function (chain) {

                    var cookie  = new Mojo.Model.Cookie('blockchalk_user_id'),
                        user_id = cookie.get();

                    if (user_id) {
                        BlockChalk.user_id = user_id;
                        chain.next();
                    } else {
                        BlockChalk.service.getNewUserID(
                            function (user_id) {
                                cookie.put(BlockChalk.user_id = user_id);
                                chain.next();
                            },
                            chain.errorCallback('getNewUserID')
                        );
                    }

                },

                function (chain) {
                    Mojo.log("USER ID " + BlockChalk.user_id);
                    chain.next();
                },
                function (chain) {
                    this.hideLoadingSpinner();
                    chain.next();
                }

            ], this, function (e) {
                Mojo.log("ERROR ERROR ERROR " + e);        
            }).next();

        },

        /**
         * Show the loading spinner, setting it up first if necessary.
         */
        showLoadingSpinner: function () {
            if (!this.scrim) { this.setupLoadingSpinner(); }
            this.scrim.show();
        },

        /**
         * Hide the loading spinner, setting it up first if necessary.
         */
        hideLoadingSpinner: function () {
            if (!this.scrim) { this.setupLoadingSpinner(); }
            this.scrim.hide();
        },

        /**
         * Set up the loading spinner, including an instance of a semi-opaque
         * scrim.
         */
        setupLoadingSpinner: function () {
            this.controller.setupWidget(
                "loading-spinner",
                { spinnerSize: Mojo.Widget.spinnerLarge },
                { spinning: true }
            );
            this.scrim = Mojo.View.createScrim(
                this.controller.document,
                {
                    /* onMouseDown:this.close.bind(this), */
                    scrimClass:'palm-scrim'
                }
            );
            this.controller.get("loading-scrim")
                .appendChild(this.scrim)
                .appendChild($('loading-spinner'));
        },

        activate: function (ev) {

        },

        deactivate: function (ev) {

        },

        cleanup: function  (ev) {

        }

    };
}());
