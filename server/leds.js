(function() {

var Leds = function(count) {
    this.count = count;
    this.byte_count = count * 3;

    // node.js uses Buffer, browsers use typed arrays
    this.buffer = typeof Buffer == "undefined" ? new Uint8Array(this.byte_count) : new Buffer(this.byte_count);
}

Leds.prototype = {
    setRgb : function(r, g, b) {
        if (r && g === undefined && b === undefined) {
            g = r.g, b = r.b, r = r.r;
        }

        for (var i=0;i<this.byte_count;i+=3) {
            this.buffer[i] = r;
            this.buffer[i+1] = g;
            this.buffer[i+2] = b;
        }
    },

    parseRgb : function(color) {
        var result = [parseInt(color.substr(1,2), 16), parseInt(color.substr(3,2), 16), parseInt(color.substr(5,2), 16)];
        return {
            r : result[0], g : result[1], b : result[2]
        }
    },

    setPixelRgb : function(n, r, g, b) {
        if (r && g === undefined && b === undefined) {
            g = r.g, b = r.b, r = r.r;
        }

        var i = n * 3;
        this.buffer[i] = r;
        this.buffer[i+1] = g;
        this.buffer[i+2] = b;
    },

    hsvToRgb : function(h, s, v) {
        if (h && s === undefined && v === undefined) {
            s = h.s, v = h.v, h = h.h;
        }

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
    },

}

if (typeof exports == 'object' && exports) {
    exports.Leds = Leds;
} else {
    window.Leds = Leds;
}

})();