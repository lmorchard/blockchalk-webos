/**
 * @fileOverview Main stage assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H, SimpleDateFormat */
function StageAssistant() {
}

StageAssistant.prototype = (function () { /** @lends StageAssistant# */

    return {

        setup: function() {
            this.controller.setWindowOrientation('free');
            this.controller.pushScene('home');

            // Use a cookie to try to track the first run after installation.
            var first_run_cookie = new Mojo.Model.Cookie('blockchalk_first_run'),
                first_run_complete = first_run_cookie.get();
            if (!first_run_complete) {
                // Display help on first run, as an introduction.
                this.controller.pushScene('help');
            }
            first_run_cookie.put(true);
        },

        handleCommand: function (event) {
            var currentScene = Mojo.Controller.stageController.activeScene();

            if (event.type == Mojo.Event.command) {
                switch (event.command) {

                    case 'MenuHelp':
                        return this.controller.pushScene('help');

                    case 'MenuAbout':
                        currentScene.showAlertDialog({
                            onChoose: function(value) {},
                            title: 
                                $L("BlockChalk for webOS"),
                            message: 
                                $L("by l.m.orchard@pobox.com, http://blockchalk.com/"),
                            choices: [
                                {label:$L("OK"), value:""}
                            ]
                        });
                        return;
                        
                    case 'MenuPreferences':
                        return;

                    case 'MenuWhereami':
                        currentScene.showAlertDialog({
                            onChoose: function(value) {},
                            title: 
                                $L("BlockChalk"),
                            message: 
                                (!BlockChalk.gps_fix) ?
                                    "I don't know" : $H(BlockChalk.gps_fix).toJSON(),
                            choices: [
                                {label:$L("OK"), value:""}
                            ]
                        });
                        return;

                }
            }

        }

    };

}());
