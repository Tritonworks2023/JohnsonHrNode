module.exports = function (server, numUsers) {
    numUsers = 0;
    const io = require('socket.io')(server);
    io.sockets.on("connection", function (socket) {
        
        // convenience function to log server messages on the client
        function log() {
            var array = ["Message from server:"];
            array.push.apply(array, arguments);
            socket.emit("log", array);
        }

        socket.on("message", function (message) {
            log("Client said: ", message);
            // for a real app, would be room-only (not broadcast)
            socket.broadcast.emit("message", message);
        });

        socket.on("create or join", function (room) {
            ++numUsers;
            // io.of('/').in("some_room_name").clients((err, clients) => {
            // })
            var numClients = io.sockets.sockets.length;
            numClients = numUsers;

            if (numClients === 1) {
                socket.join(room);
                socket.emit("created", room, socket.id);
            } else if (numClients >= 2) {
                io.sockets.in(room).emit("join", room);
                socket.join(room);
                socket.emit("joined", room, socket.id);
                io.sockets.in(room).emit("ready");
            } else {
                // max 5 clients
                socket.emit("full", room);
            }
        });

        socket.on("ipaddr", function () {
            var ifaces = os.networkInterfaces();
            var ipAddress = '';
            for (var dev in ifaces) {
                ifaces[dev].forEach(function (details) {
                    if (details.family === "IPv4" && details.address !== "127.0.0.1") {
                        ipAddress = details.address;
                        socket.emit("ipaddr", details.address);
                    }
                });
            }
            console.log('Server IP address is ' + ipAddress);
        });

        socket.on("Leave", function () {
             socket.emit("left", room, socket.id);
            socket.leave(room);
        });

        socket.on('disconnect', function() {
            --numUsers;
        });
    });
}