/**
 * @fileOverview App assistant for Memento
 * @author <a href="http://decafbad.com">l.m.orchard@pobox.com</a>
 * @version 0.1
 */
/*jslint laxbreak: true */
function AppAssistant(app_controller) {
}

AppAssistant.prototype = (function() { /** @lends AppAssistant# */
    return {

        wakeup_handle: null,

        setup: function() {
            Mojo.log('Setup AppAssistant');
            //this.setupWakeup();
        },

        handleLaunch: function(launch_params) {
            Mojo.log("LAUNCHING WITH %j", launch_params);

            BlockChalk.onLaunch(launch_params);

            if ('undefined' !== launch_params.command) {
                switch (launch_params.command) {
                }
            }
        },

        handleCommand: function(event) {
        },

        /**
         * Start the countdown timer until the next background poll.
         */
        setupWakeup: function () {
            var r = new Mojo.Service.Request("palm://com.palm.power/timeout", {
                method: "set",
                parameters: {
                    "key": "com.decafbad.blockchalk.message_poll",
                    "in": BlockChalk.wakeup_interval,
                    "wakeup": BlockChalk.wakeup_device,
                    "uri": "palm://com.palm.applicationManager/open",
                    "params": {
                        "id": "com.decafbad.blockchalk",
                        "params": {
                            "command": "ChalkPoll"
                        }
                    }
                },
                onSuccess: function(response) {
                    Mojo.Log.info("Alarm Set Success", response.returnValue);
                    BlockChalk.wakeup_task_id = Object.toJSON(response.taskId);
                },
                onFailure: function(response) {
                    Mojo.Log.info("Alarm Set Failure", 
                        response.returnValue, response.errorText);
                }
            });
        },

        EOF:null

    };

}());
