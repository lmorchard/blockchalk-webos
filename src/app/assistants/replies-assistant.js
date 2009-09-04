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
            
            this.model = { replies: [ ] };

            this.controller.setupWidget(
                'replylist',
                {
                    reorderable:   false,
                    swipeToDelete: true,
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

            Decafbad.Utils.setupLoadingSpinner(this);

            BlockChalk.service.getRecentReplies(
                BlockChalk.user_id,
                function (replies) {

                    this.model.replies = replies.map(function (reply) {
                        reply.time = reply.datetime.toLocaleTimeString();
                        reply.date = reply.datetime.toLocaleDateString();
                        return reply;
                    }, this).sort(function (reply) {
                        var a = reply.datetime.getTime(),
                            b = reply.datetime.getTime();
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
            // Decafbad.Utils.setupListeners([
            // ], this);
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

        EOF:null
    };
}());
