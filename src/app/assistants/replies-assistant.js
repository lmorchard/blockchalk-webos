/**
 * @fileOverview Replies scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function RepliesAssistant() {
}

RepliesAssistant.prototype = (function () { /** @lends HomeAssistant# */

    return {

        scrim: null,

        /**
         * Setup the application.
         */
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller);

            // Set the last replies read datestamp cookie
            var cookie = new Mojo.Model.Cookie('blockchalk_replies_read');
            cookie.put( (new Date()).getTime() );

            this.controller.setupWidget(
                Mojo.Menu.appMenu, 
                { omitDefaultItems: true }, 
                {
                    visible: true,
                    items: [
                        { label: "Clear last read", command: 'MenuClearLastRead' }
                    ]
                }
            );
            
            this.model = { replies: [ ] };

            this.controller.setupWidget(
                'replylist',
                {
                    reorderable:   false,
                    swipeToDelete: false, // true,
                    itemTemplate:  'replies/replylist-item',
                    listTemplate:  'replies/replylist-container',
                    emptyTemplate: 'replies/replylist-empty',
                    itemsProperty: 'replies',
                    formatters: {
                        datetime: BlockChalk.formatDate
                    }
                },
                this.model
            );

            this.controller.get('chalkbacks').hide();
            this.controller.setupWidget(
                'replies-mode',
                { choices: [
                        { label: $L('Private Replies'), value: 'replies' },
                        { label: $L('Chalkbacks'), value: 'chalkbacks' }
                    ] },
                { value: 'replies' }
            );

            this.command_menu_model = {items: [
                {items: [ 
                ]},
                {
                    toggleCmd: 'Replies', 
                    items: [ 
                        { command:'Here', label: $L('Here'), 
                            icon: 'here' },
                        { command:'Home', label: $L('Home'),
                            icon: 'home', shortcut: 'H' },
                        { command:'Search', label: $L('Search'), 
                            icon: 'search', shortcut: 'S' },
                        { command:'Replies', label: $L('Replies'), 
                            icon: 'conversation', shortcut: 'R' }
                    ]
                },
                {items: [ 
                ]}
            ]};
            this.controller.setupWidget(
                Mojo.Menu.commandMenu, {}, this.command_menu_model
            );

            this.refreshReplies();
        },

        /**
         * Refresh the display of replies
         */
        refreshReplies: function() {
            Decafbad.Utils.setupLoadingSpinner(this);

            BlockChalk.service.getRecentReplies(
                BlockChalk.user_id,
                function (replies) {

                    this.model.replies = replies.map(function (reply) {
                        reply.time = reply.datetime.toLocaleTimeString();
                        reply.date = reply.datetime.toLocaleDateString();
                        return reply;
                    }, this).sort(function (ra, rb) {
                        var a = ra.datetime.getTime(),
                            b = rb.datetime.getTime();
                        return (b - a);
                    });

                    var reply_list = this.controller.get('replylist');
                    reply_list.mojo.noticeUpdatedItems(0, this.model.replies);
                    reply_list.mojo.setLength(this.model.replies.length);

                }.bind(this),

                function () {
                    Decafbad.Utils.showSimpleBanner('Replies get failed.');
                }
            );

        },

        /**
         * React to card activation.
         */
        activate: function (ev) {

            Decafbad.Utils.setupListeners([
                ['replies-mode', Mojo.Event.propertyChange, this.handleModeChange],
                ['replylist', Mojo.Event.listTap, this.handleReplyTap],
                ['replylist', Mojo.Event.listDelete, this.handleBuryReply]
            ], this);

            // Handle refresh cues coming back from other scenes.
            if (typeof ev !== 'undefined') {
                if (typeof ev.refresh !== 'undefined') {
                    this.refreshReplies();
                }
            }

        },

        /**
         * React for card deactivation.
         */
        deactivate: function (ev) {
            // Decafbad.Utils.clearListeners(this);
        },

        /**
         * Handle ultimate card clean up.
         */
        cleanup: function (ev) {
            delete this.scrim;
        },

        /**
         * Handle menu commands.
         */
        handleCommand: function (event) {
            if (event.type === Mojo.Event.command) {

                // Check for commands meant for home scene.
                if (['Here', 'Home', 'Search'].indexOf(event.command) !== -1) {
                    return this.controller.stageController.popScenesTo(
                        'home', { command: event.command }
                    );
                }

                if ('MenuClearLastRead' === event.command) {
                    var cookie = new Mojo.Model.Cookie('blockchalk_replies_read');
                    cookie.put(null);
                    return Decafbad.Utils.showSimpleBanner(
                        'Cleared replies last read cookie.'
                    );
                }

            }
        },

        /**
         * Handle taps on the replies mode radio button.
         */
        handleModeChange: function (ev) {
            Mojo.log(ev.value);

            if ('replies' === ev.value) {
                this.controller.get('replies').show();
                this.controller.get('chalkbacks').hide();
            } else {
                this.controller.get('replies').hide();
                this.controller.get('chalkbacks').show();
            }
            
        },

        /**
         * Handle deletion of a reply
         */
        handleBuryReply: function (ev) {
        },

        /**
         * Launch reply context menu
         */
        handleReplyTap: function (ev) {
            this.controller.popupSubmenu({
                placeNear: ev.target,
                items: [
                    { command: 'reply', label: 'Reply' }/*,
                    { command: 'view',  label: 'View' },
                    { command: 'share', label: 'Share' }*/
                ],
                onChoose: function (command) {
                    if ('reply' == command) {
                        ev.item.kind = 'reply';
                        return this.controller.stageController.pushScene(
                            'reply', ev.item
                        );
                    }
                    /*
                    switch (command) {
                        case 'reply':
                            ev.item.kind = 'reply';
                            return this.controller.stageController.pushScene(
                                'reply', ev.item
                            );
                        case 'view':
                            return this.controller.stageController.pushScene(
                                'chalk', ev.item
                            );
                        case 'share':
                        return; // TODO
                    }
                    */
                }.bind(this)
            });
        },

        EOF:null
    };
}());
