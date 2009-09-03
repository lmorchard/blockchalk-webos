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
        },

        handleCommand: function (event) {
            var currentScene = Mojo.Controller.stageController.activeScene();

            if (event.type == Mojo.Event.command) {
                switch (event.command) {

                    case 'MenuAbout':
                        currentScene.showAlertDialog({
                            onChoose: function(value) {},
                            title: 
                                $L("BlockChalk"),
                            message: 
                                $L("Copyright 2008-2009, l.m.orchard"),
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
                                    "I don't know" :
                                    "Lat: " + BlockChalk.gps_fix.latitude +
                                    " Long: " + BlockChalk.gps_fix.longitude, 
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
