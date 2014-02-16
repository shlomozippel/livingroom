var express = require("express");
var app = express();
var port = 3700;

 
app.get("test/", function(req, res){
    res.send("It works!");
});

app.use(express.static(__dirname + '/static'));
 
app.listen(port);
console.log("Listening on port " + port);

var Leds = require("./leds.js").Leds

var leds = new Leds(100);


function render () {
	var c = hsvToRgb(0.4, 1.0, 1.0);
	//setColor(c.r, c.g, c.b);
  setColor(255, 255, 255);
	//setColor(hsvToRgb(0.8, 1.0, 1.0));
}

/*

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
client.on('connect', function(connection) {
  console.log('connected');
  (function frame() {
        if (connection.connected) {
          render();
            connection.send(leds);
            setTimeout(frame, 1000 / 60);
        }
    })();
});

client.connect('ws://localhost:9000/', 'leds');

*/
