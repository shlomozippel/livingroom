var express = require("express");
var _ = require("underscore");
var app = express();
var port = 3700;

// lets extend Math a bit
Math.fmod = function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); };
Math.clamp = function(n, min, max) { return Math.min(Math.max(n, min), max); };

var Leds = require("./leds.js").Leds
var leds = new Leds(810);

//-----------------------------------------------------------------------------
// patterns

function rgb_param(initial) {
  return {
    'type': 'rgb',
    'initial': initial,
    'value': _.extend({}, initial),
    'from_wire': function(val) {
        return leds.parseRgb(val);
    }
   };
}

function slider_param(min, max, initial) {
    return {
      'type' : 'slider',
      'initial' : initial,
      'value' : initial,
      'min' : min,
      'max' : max,
      'from_wire' : function(val) {
          return Math.clamp(val, min, max);
      }
   };
}

function choices_param(choices, initial) {
    return {
      'type' : 'choices',
      'initial' : initial,
      'value' : initial,
      'choices' : choices,
      'from_wire' : function(val) {
          if (val in choices) {
              return val;
          }
          return initial;
      }
   };
}

var patterns = {
    'off' : {
        'render' : function(leds, params, t) {
            leds.setRgb(0, 0, 0);
        },
    },

    'rgb' : {
        'params' : {
            color: rgb_param({r:255, g:0, b:0}),     
        },   
        'render' : function(leds, params, t) {
            leds.setRgb(params.color.value);
        },
    },

    'hsvrainbow' : {
        'name' : 'HSV Rainbow',
        'params' : {
            'duration' : slider_param(2, 100, 3),
        },
        'render' : function(leds, params, t) {
            var h = Math.fmod((t / 1000.0) / params.duration.value, 1.0);
            var c = leds.hsvToRgb(h, 1.0, 1.0);
            console.log(t);
            leds.setRgb(c);
        }
    }, 

    'compcolors' : {
      'name' : 'Complementary Colors',
      'params' : {
        'length' : slider_param(5, 100, 30),
        'direction' : choices_param({'right':'Right', 'left':'Left'}, 'right'),
        'speed' : slider_param(10, 100, 80),
        'color_duration' : slider_param(2, 100, 10),
      },
      'render' : function(leds, params, t) {
        var offset_speed = params.speed.value;
        var color_speed = params.color_duration.value;
        var size = params.length.value;
        /*if (params.direction.value == 'left') {
          offset_speed = -offset_speed;
        }*/

        var offset = Math.fmod(parseInt((t / 1000.0) * offset_speed), 810);

        var h = Math.fmod(t / (color_speed * 1000.0), 1.0);
        var comp_h = h + 0.5; if (comp_h > 1.0) comp_h -= 1.0;

        var half_size = parseInt(size / 2);

        var c;

        for (var i=0; i<810; i++) {
          if (Math.fmod(i, size) < half_size) {
            c = leds.hsvToRgb(h, 1.0, 1.0);
          } else {
            c = leds.hsvToRgb(comp_h, 1.0, 1.0);
          }
          leds.setPixelRgb((i + offset) % 810, c.r, c.g, c.b);
        }
      },
    }, 
}

var mode = patterns['off'];


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
      console.log('Switching to mode ' + mode.name || patternid);
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

var start = process.hrtime();
function timestamp() {
  var hr = process.hrtime(start);
  return (hr[0] * 1000) + (hr[1] / 1000);
}

function render () {
  var t = timestamp();
  console.log(t);
  if (mode) {
    //mode.render(leds, mode.params, t);
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
            setTimeout(frame, 2);
        }
    })();
});

client.connect('ws://localhost:9000/', 'leds');