/**
 * @fileOverview Main stage assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Memento, Note, Mojo, $L, $H, SimpleDateFormat */
function StageAssistant() {
}

StageAssistant.prototype = (function () { /** @lends StageAssistant# */

    return {

        setup: function() {
            this.controller.setWindowOrientation('free');
            this.controller.pushScene('home');
        }

    };

}());
