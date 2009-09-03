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

        /**
         * Package initialization.
         */
        init: function () {
            return this;
        },

        /**
         * Set up app menu across scenes
         */
        setupGlobalMenu: function (controller) {
            controller.setupWidget(
                Mojo.Menu.appMenu, 
                { omitDefaultItems: true }, 
                {
                    visible: true,
                    items: [
                        Mojo.Menu.editItem,
                        { label: "Preferences...", command: 'MenuWhereami' },
                        { label: "Where Am I?", command: 'MenuWhereami' },
                        { label: "About", command: 'MenuAbout' }
                    ]
                }
            );
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
        },

        initModel: function () {
        },

        initService: function () {
            this.service = new BlockChalk.Service();
        },

        EOF: null
    };

}());
