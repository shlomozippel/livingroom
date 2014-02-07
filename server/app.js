var express = require("express");
var app = express();
var port = 3700;

var WebSocketClient = require('websocket').client;
 
app.get("/", function(req, res){
    res.send("It works!");
	console.log("Request omercy " + req);
});
 
app.listen(port);
console.log("Listening on port " + port);

var led_count = 810;
var byte_count = led_count * 3;
var leds = new Buffer(byte_count); //Uint8Array(byte_count);

function hsvToRgb(h, s, v) {
  var r, g, b;
 
  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);
 
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
 
  return { r:Math.floor(r * 255), g:Math.floor(g * 255), b:Math.floor(b * 255) };
}

function setColor(r, g, b) {
    if (r && g === undefined && b === undefined) {
        g = r.g, b = r.b, r = r.r;
    }

    for (var i=0;i<byte_count;i+=3) {
        leds[i] = r;
        leds[i+1] = g;
        leds[i+2] = b;
    }
}

function setPixel(n, r, g, b) {
   var i = n * 3;
   leds[i] = r;
   leds[i+1] = g;
   leds[i+2] = b;
}


function render () {
	var c = hsvToRgb(0.4, 1.0, 1.0);
	//setColor(c.r, c.g, c.b);
	setColor(hsvToRgb(0.8, 1.0, 1.0));
}

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
