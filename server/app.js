var express = require("express");
var _ = require("underscore");
var app = express();
var port = 3700;

Math.fmod = function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); };

var Leds = require("./leds.js").Leds
var leds = new Leds(810);

//-----------------------------------------------------------------------------
// patterns

function color_param(initial) {
  return {
    'type': 'color',
    'initial': initial,
    'value': _.extend({}, initial),
    'from_wire': function(val) {
        return leds.parseRgb(val);
    }
   };
}

var patterns = {
    'off' : {
        'render' : function(t, params) {
            leds.setRgb(0, 0, 0);
        },
    },

    'rgb' : {
        'params' : {
            color: color_param({r:255, g:0, b:0}),     
        },   
        'render' : function(t, params) {
            leds.setRgb(params.color.value);
        },
    },

    'hsvrainbow' : {
        'name' : 'HSV Rainbow',
        'params' : {
            'cycle' : 10.0,
        },
        'render' : function(t, params) {
            var h = Math.fmod((t / 1000.0) / params.cycle, 1.0);
            var c = leds.hsvToRgb(h, 1.0, 1.0);
            leds.setRgb(c);
        }
    }, 
}

var mode = patterns['rgb'];


//-----------------------------------------------------------------------------
// express endpoints

app.set('views', __dirname + '/templates');
app.use(express.bodyParser());
app.use(express.static(__dirname + '/static'));

var engines = require('consolidate');
app.engine('html', engines.underscore);

app.get("/", function(req, res){
    res.render('client.html', { 'patterns': patterns });
});

app.all("/pattern/:id", function(req, res){
   var patternid = req.params.id;
   var posted_params = req.body || {};

   if (patternid in patterns) {
      mode = patterns[patternid];

      for (var param in mode.params) {
         if (param in posted_params) {
            var from_wire = mode.params[param].from_wire || function(v){return v};
            mode.params[param].value = from_wire(posted_params[param]);
         }
      }
   }

   res.end();
});

 
app.listen(port);
console.log("Listening on port " + port);

//-----------------------------------------------------------------------------
// leds

start = (+ new Date().getTime());
function timestamp() {
  return new Date().getTime() - start;
}

function render () {
  var t = timestamp();
  if (mode) {
    mode.render(t, mode.params);
  }
}

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
client.on('connect', function(connection) {
  console.log('connected');
  (function frame() {
        if (connection.connected) {
            render();
            connection.send(leds.buffer);
            setTimeout(frame, 1000 / 60);
        }
    })();
});

client.connect('ws://localhost:9000/', 'leds');