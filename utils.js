function is_int(str) {
    var float_val, int_val;
    float_val = parseFloat(str);
    int_val = parseInt(str * 1, 10);
    if (!isNaN(int_val) && (float_val === int_val)) {return true;}
    return false;
}

function rnd_str(len, alpha_only = false) {
    'use strict';
    var i, which, val, str = '';
    len = (!is_int(len) || (len <= 0)) ? 8 : len;
    for (i = 0; i < len; i += 1) {
        which = Math.round((Math.random() * 2));
        if (0 === which) {
            val = Math.round(Math.random() * ('Z'.charCodeAt(0) - 'A'.charCodeAt(0)));
            str += String.fromCharCode('A'.charCodeAt(0) + val);
        }
        if (1 === which) {
            val = Math.round(Math.random() * ('z'.charCodeAt(0) - 'a'.charCodeAt(0)));
            str += String.fromCharCode('a'.charCodeAt(0) + val);
        }
        if ((2 === which) && (0 < i)) {
            if (alpha_only) {
                val = Math.round(Math.random() * ('z'.charCodeAt(0) - 'a'.charCodeAt(0)));
                str += String.fromCharCode('a'.charCodeAt(0) + val);
            } else {
                str += Math.round(Math.random() * 9);
            }
        }
        if ((2 === which) && (0 === i)) {
            val = Math.round(Math.random() * ('z'.charCodeAt(0) - 'a'.charCodeAt(0)));
            str += String.fromCharCode('a'.charCodeAt(0) + val);
        }
    }
    return str;
}