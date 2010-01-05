/**
 * Borrowed from examples in Spaz and other webOS apps, reworked to pass jslint
 * and fit my coding style.
 *
 * @fileOverview Help scene assistant
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Decafbad, BlockChalk, Mojo, $, $L, $A, $H */
function HelpAssistant() {
}

HelpAssistant.prototype = (function () { /** @lends HelpAssistant */

    return {
        setup: function () {

            BlockChalk.setupGlobalMenu(this.controller, false, true);

            //this.controller.get( 'appname' ).innerHTML = _APP_Name;
            this.controller.get( 'appdetails' ).innerHTML = 
                _APP_VersionNumber + " by " + _APP_PublisherName;

            var supportitems = [];
            if (_APP_Support_Resource) {
                supportitems = _APP_Support_Resource;
            } else {
                var i = 0;
                if (typeof _APP_Support_Email !== "undefined" && _APP_Support_Email) {
                    supportitems[i++] = {
                        text: 'Email Support',
                        detail:$L(_APP_Support_Email), 
                        Class:$L("img_email"),
                        type:'email'
                    };
                }
                if (typeof _APP_Publisher_URL !== "undefined" && _APP_Publisher_URL) {
                    supportitems[i++] = {
                        text: _APP_PublisherName + '', 
                        detail: $L(_APP_Publisher_URL), 
                        Class: $L('img_web'),
                        type: 'web'
                    };
                }
                if (typeof _APP_Support_URL !== "undefined" && _APP_Support_URL) {
                    supportitems[i++] = {
                        text: 'Support Website',
                        detail:$L(_APP_Support_URL), 
                        Class:$L("img_web"),
                        type:'web'
                    };
                }
                if (typeof _APP_Support_Phone !== "undefined" && _APP_Support_Phone) {		            
                    supportitems[i++] = {
                        text: $L(_APP_Support_Phone),
                        detail:$L(_APP_Support_Phone), 
                        Class:$L("img_phone"),
                        type:'phone'
                    };
                }
            }

            try {
                var helpitems = [];
                i = 0;
                for (j = 0; j < _APP_Help_Resource.length; j++) {
                    if (_APP_Help_Resource[j].type == 'web') {
                        helpitems[i++] = {
                            text: _APP_Help_Resource[j].label,
                            detail: _APP_Help_Resource[j].url,
                            Class: $L("img_web"),
                            type: 'web'
                        };
                    } else if (_APP_Help_Resource[j].type == 'scene') {
                        helpitems[i++] = {
                            text: _APP_Help_Resource[j].label,
                            detail: _APP_Help_Resource[j].sceneName,
                            Class: $L("list_scene"),
                            type: 'scene'
                        };
                    }
                }
                if (_APP_Help_Resource.length > 0) {
                    this.controller.setupWidget('AppHelp_list', {
                        itemTemplate: 'help/list-item',
                        listTemplate: 'help/list-container',
                        swipeToDelete: false
                    }, {
                        listTitle: $L('Help'),
                        items: helpitems
                    });
                }
            } catch (e) {
                Mojo.Log.error(e);
            }
            this.controller.setupWidget('AppSupport_list', 
                {
                    itemTemplate:'help/list-item', 
                    listTemplate:'help/list-container',
                    swipeToDelete: false

                },
                {
                    listTitle: $L('Contact'),
                    items : supportitems
                }
            );
            Mojo.Event.listen(
                this.controller.get('AppHelp_list'),
                Mojo.Event.listTap,
                this.handleListTap.bind(this)
            );
            Mojo.Event.listen(
                this.controller.get('AppSupport_list'),
                Mojo.Event.listTap,
                this.handleListTap.bind(this)
            );
            this.controller.get( 'copywrite' ).innerHTML = _APP_Copyright;

        },

        handleListTap: function (event) {
            if(event.item.type == 'web'){
                this.controller.serviceRequest("palm://com.palm.applicationManager", {
                    method: "open",
                    parameters:  {
                        id: 'com.palm.app.browser',
                        params: {
                            target: 'http://' + event.item.detail
                        }
                    }
                });
            }	  
            else if(event.item.type == 'email'){
                this.controller.serviceRequest('palm://com.palm.applicationManager', {
                    method:'open',
                    parameters:{ target: 'mailto:' + event.item.detail}
                });	
            }
            else if(event.item.type == 'phone'){
                this.controller.serviceRequest('palm://com.palm.applicationManager', {
                    method:'open',
                    parameters: {
                        target: "tel://" + event.item.detail
                    }
                });	
            }
            else if(event.item.type == 'scene'){
                this.controller.stageController.pushScene(event.item.detail);	
            }
        },
        activate: function (event) {
        },
        deactivate: function (event) {
        },
        cleanup: function (event) {
            Mojo.Event.stopListening(
                this.controller.get('AppHelp_list'),
                Mojo.Event.listTap,
                this.handleListTap
            );
            Mojo.Event.stopListening(
                this.controller.get('AppSupport_list'),
                Mojo.Event.listTap,
                this.handleListTap
            );
        },

        EOF:null
    };
}());
