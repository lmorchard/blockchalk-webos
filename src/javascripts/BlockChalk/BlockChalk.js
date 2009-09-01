/**
 * @fileOverview BlockChalk global package.
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
/*global Mojo, $L, $H */
var BlockChalk = (function () {

    /** @lends Memento */
    return {

        default_prefs: {
            loaded: true,
            sync_url: 'http://dev.memento.decafbad.com/',
            sync_enabled: true,
            sync_notifications: true,
            sync_on_start: true,
            sync_on_open: true,
            sync_on_save: true,
            sync_on_delete: true,
            sync_on_shutdown: true
        },

        /*
        app_menu_items: [
            Mojo.Menu.editItem,
            { label: "Sync Now", command: 'AppSyncNow' },
            { label: "Preferences...", command: 'AppPreferences' },
            { label: "About", command: 'AppAbout' }
            //{ label: "Help", command: 'AppHelp' }
        ],
        */

        /**
         * Package initialization.
         */
        init: function () {
            return this;
        },

        /**
         * Global app-wide initialization.
         */
        onLaunch: function (launch_params) {
            // this.refreshPrefs();
            // this.initModel();
            this.initService();
        },

        refreshPrefs: function () {
            this.prefs_cookie = new Mojo.Model.Cookie('memento_preferences');
            if (!this.prefs_cookie.get() || !this.prefs_cookie.get().loaded) {
                this.prefs_cookie.put(this.default_prefs);
            }
            this.prefs = this.prefs_cookie.get();
        },

        initModel: function () {
            this.notes_model = new NotesModel(
                null, function() {}, function() {}
            );
        },

        initService: function () {
            this.service = new BlockChalk.Service();
        },

        /**
         * Command handler used by other classes.
         */
        globalHandleCommand:function(event) {

            var currentScene = Mojo.Controller.stageController.activeScene();

            if (event.type == Mojo.Event.command) {
                // @TODO: Turn this into a dispatcher?
                switch(event.command) {

                    case 'AppAbout':
                        currentScene.showAlertDialog({
                            onChoose: function(value) {},
                            title:
                                $L("Memento - v0.1"),
                            message:
                                $L("Copyright 2008-2009, Leslie Michael Orchard"),
                            choices: [
                                {label:$L("OK"), value:""}
                            ]
                        });
                        break;

                    case 'AppSyncNow':
                        if (Memento.home_assistant) {
                            Memento.home_assistant.performSync();
                        }
                        break;

                    case 'AppPreferences':
                        Mojo.Controller.stageController
                            .pushScene("preferences", this);
                        break;

                    case 'AppDev':
                        Mojo.Controller.stageController.pushScene("dev", this);
                        break;

                    case 'AppTests':
                        Mojo.Test.pushTestScene(this.controller, { runAll: true });
                        break;

                    case 'do-help':
                        Mojo.Log.info("...........",
                            "Help selected from menu, not currently available.");
                        break;
	            }
            }

        },

        EOF: null
    };

}());
