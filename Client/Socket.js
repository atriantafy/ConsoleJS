/**
 * Created with JetBrains WebStorm.
 * User: nisheeth
 * Date: 22/01/13
 * Time: 13:20
 * To change this template use File | Settings | File Templates.
 */
ConsoleJS.Socket = (function (console, io) {

    "use strict";

    var name = console.Browser ? console.Browser.toString() : window.navigator.userAgent,
        pendingRequests = [],
        subscribed = false,
        connectionMode = null,
        domReady = false,
        socket;


    // Fix for old Opera and Maple browsers
    (function overrideJsonPolling() {
        var original = io.Transport["jsonp-polling"].prototype.post;

        io.Transport["jsonp-polling"].prototype.post = function (data) {
            var self = this;
            original.call(this, data);
            setTimeout(function () {
                self.socket.setBuffer(false);
            }, 250);
        };
    }());


    function request(eventName, data) {
        if (socket && socket.socket.connected && subscribed) {
            data.name = name;
            socket.emit(eventName, data);
        } else {
            pendingRequests.push({ type: eventName, data: data });
        }
    }

    function processPendingRequest() {
        console.Utils.forEach(pendingRequests, function (item) {
            request(item.type, item.data);
        });
        pendingRequests = [];
    }

    function getConnectionMode() {
        return connectionMode;
    }

    function getConnectionStatus() {
        return socket && socket.socket.connected ? 'Connected' : 'Disconnected';
    }

    function init() {
        if (domReady) {
            return;
        }

        domReady = true;

        socket = io.connect(console.Utils.getScriptURL('socket.io'));

        socket.on('connect', function () {
            socket.emit('subscribe', { name: name });
            console.log('Connected to the Server');
            console.log('Subscribing to', { name: name });
        });

        socket.on('connecting', function (mode) {
            connectionMode = mode;
            console.log('Connecting to the Server');
        });

        socket.on('reconnect', function (mode, attempts) {
            connectionMode = mode;
            socket.emit('subscribe', { name: name });
            console.log('Reconnected to the Server');
            console.log('Subscribing to', { name: name });
        });

        socket.on('reconnecting', function () {
            console.log('Reconnecting to the Server');
        });

        socket.on('disconnect', function () {
            console.log('Unsubscribing from', { name: name });
            console.log('Disconnected from the Server');
            socket.emit('unsubscribe', { name: name });
        });

        socket.on('online', function (data) {
            if (data.name === name) {
                subscribed = true;
                processPendingRequest();
                console.log('Subscribed to', data);
            }
        });

        socket.on('offline', function (data) {
            if (data.name === name) {
                console.log('Unsubscribed from', data);
                subscribed = false;
            }
        });

        socket.on('command', function (cmd) {
            var evalFun, result;
            try {
                evalFun = new Function([], "return " + cmd.data + ";");
                result = evalFun();
                if (result) {
                    console.log(result);
                }
            } catch (e) {
                if (evalFun && evalFun.toString()) {
                    console.error(e, evalFun.toString());
                } else {
                    console.error(e);
                }
            }
        });

        socket.on('connect_failed', function () {
            console.warn('Failed to connect to the Server');
        });

        socket.on('reconnect_failed', function () {
            console.warn('Failed to reconnect to the Server');
        });

        socket.on('error', function () {
            console.warn('Socket Error');
        });
    }


    //Hook into ConsoleJS API
    console.on('console', function (data) {
        request('console', data);
    });

    console.ready(init);


    return {
        getConnectionStatus: getConnectionStatus,
        getConnectionMode: getConnectionMode
    };

})(ConsoleJS, io);