(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/// Serialize the a name value pair into a cookie string suitable for
/// http headers. An optional options object specified cookie parameters
///
/// serialize('foo', 'bar', { httpOnly: true })
///   => "foo=bar; httpOnly"
///
/// @param {String} name
/// @param {String} val
/// @param {Object} options
/// @return {String}
var serialize = function(name, val, opt){
    opt = opt || {};
    var enc = opt.encode || encode;
    var pairs = [name + '=' + enc(val)];

    if (null != opt.maxAge) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
        pairs.push('Max-Age=' + maxAge);
    }

    if (opt.domain) pairs.push('Domain=' + opt.domain);
    if (opt.path) pairs.push('Path=' + opt.path);
    if (opt.expires) pairs.push('Expires=' + opt.expires.toUTCString());
    if (opt.httpOnly) pairs.push('HttpOnly');
    if (opt.secure) pairs.push('Secure');

    return pairs.join('; ');
};

/// Parse the given cookie header string into an object
/// The object has the various cookies as keys(names) => values
/// @param {String} str
/// @return {Object}
var parse = function(str, opt) {
    opt = opt || {};
    var obj = {}
    var pairs = str.split(/; */);
    var dec = opt.decode || decode;

    pairs.forEach(function(pair) {
        var eq_idx = pair.indexOf('=')

        // skip things that don't look like key=value
        if (eq_idx < 0) {
            return;
        }

        var key = pair.substr(0, eq_idx).trim()
        var val = pair.substr(++eq_idx, pair.length).trim();

        // quoted values
        if ('"' == val[0]) {
            val = val.slice(1, -1);
        }

        // only assign once
        if (undefined == obj[key]) {
            try {
                obj[key] = dec(val);
            } catch (e) {
                obj[key] = val;
            }
        }
    });

    return obj;
};

var encode = encodeURIComponent;
var decode = decodeURIComponent;

module.exports.serialize = serialize;
module.exports.parse = parse;

},{}],2:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],3:[function(require,module,exports){
/**
The following batches are equivalent:

var beautify_js = require('js-beautify');
var beautify_js = require('js-beautify').js;
var beautify_js = require('js-beautify').js_beautify;

var beautify_css = require('js-beautify').css;
var beautify_css = require('js-beautify').css_beautify;

var beautify_html = require('js-beautify').html;
var beautify_html = require('js-beautify').html_beautify;

All methods returned accept two arguments, the source string and an options object.
**/

function get_beautify(js_beautify, css_beautify, html_beautify) {
    // the default is js
    var beautify = function (src, config) {
        return js_beautify.js_beautify(src, config);
    };

    // short aliases
    beautify.js   = js_beautify.js_beautify;
    beautify.css  = css_beautify.css_beautify;
    beautify.html = html_beautify.html_beautify;

    // legacy aliases
    beautify.js_beautify   = js_beautify.js_beautify;
    beautify.css_beautify  = css_beautify.css_beautify;
    beautify.html_beautify = html_beautify.html_beautify;

    return beautify;
}

if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define([
        "./lib/beautify",
        "./lib/beautify-css",
        "./lib/beautify-html"
    ], function(js_beautify, css_beautify, html_beautify) {
        return get_beautify(js_beautify, css_beautify, html_beautify);
    });
} else {
    (function(mod) {
        var js_beautify = require('./lib/beautify');
        var css_beautify = require('./lib/beautify-css');
        var html_beautify = require('./lib/beautify-html');

        mod.exports = get_beautify(js_beautify, css_beautify, html_beautify);

    })(module);
}


},{"./lib/beautify":6,"./lib/beautify-css":4,"./lib/beautify-html":5}],4:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
    });
*/

// http://www.w3.org/TR/CSS21/syndata.html#tokenization
// http://www.w3.org/TR/css3-syntax/

(function() {
    function css_beautify(source_text, options) {
        options = options || {};
        var indentSize = options.indent_size || 4;
        var indentCharacter = options.indent_char || ' ';
        var selectorSeparatorNewline = (options.selector_separator_newline === undefined) ? true : options.selector_separator_newline;
        var end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;

        // compatibility
        if (typeof indentSize === "string") {
            indentSize = parseInt(indentSize, 10);
        }


        // tokenizer
        var whiteRe = /^\s+$/;
        var wordRe = /[\w$\-_]/;

        var pos = -1,
            ch;

        function next() {
            ch = source_text.charAt(++pos);
            return ch || '';
        }

        function peek(skipWhitespace) {
            var prev_pos = pos;
            if (skipWhitespace) {
                eatWhitespace();
            }
            result = source_text.charAt(pos + 1) || '';
            pos = prev_pos - 1;
            next();
            return result;
        }

        function eatString(endChars) {
            var start = pos;
            while (next()) {
                if (ch === "\\") {
                    next();
                } else if (endChars.indexOf(ch) !== -1) {
                    break;
                } else if (ch === "\n") {
                    break;
                }
            }
            return source_text.substring(start, pos + 1);
        }

        function peekString(endChar) {
            var prev_pos = pos;
            var str = eatString(endChar);
            pos = prev_pos - 1;
            next();
            return str;
        }

        function eatWhitespace() {
            var result = '';
            while (whiteRe.test(peek())) {
                next()
                result += ch;
            }
            return result;
        }

        function skipWhitespace() {
            var result = '';
            if (ch && whiteRe.test(ch)) {
                result = ch;
            }
            while (whiteRe.test(next())) {
                result += ch
            }
            return result;
        }

        function eatComment(singleLine) {
            var start = pos;
            var singleLine = peek() === "/";
            next();
            while (next()) {
                if (!singleLine && ch === "*" && peek() === "/") {
                    next();
                    break;
                } else if (singleLine && ch === "\n") {
                    return source_text.substring(start, pos);
                }
            }

            return source_text.substring(start, pos) + ch;
        }


        function lookBack(str) {
            return source_text.substring(pos - str.length, pos).toLowerCase() ===
                str;
        }

        // Nested pseudo-class if we are insideRule
        // and the next special character found opens
        // a new block
        function foundNestedPseudoClass() {
            for (var i = pos + 1; i < source_text.length; i++){
                var ch = source_text.charAt(i);
                if (ch === "{"){
                    return true;
                } else if (ch === ";" || ch === "}" || ch === ")") {
                    return false;
                }
            }
            return false;
        }

        // printer
        var basebaseIndentString = source_text.match(/^[\t ]*/)[0];
        var singleIndent = new Array(indentSize + 1).join(indentCharacter);
        var indentLevel = 0;
        var nestedLevel = 0;

        function indent() {
            indentLevel++;
            basebaseIndentString += singleIndent;
        }

        function outdent() {
            indentLevel--;
            basebaseIndentString = basebaseIndentString.slice(0, -indentSize);
        }

        var print = {};
        print["{"] = function(ch) {
            print.singleSpace();
            output.push(ch);
            print.newLine();
        };
        print["}"] = function(ch) {
            print.newLine();
            output.push(ch);
            print.newLine();
        };

        print._lastCharWhitespace = function() {
            return whiteRe.test(output[output.length - 1]);
        };

        print.newLine = function(keepWhitespace) {
            if (!keepWhitespace) {
                print.trim();
            }

            if (output.length) {
                output.push('\n');
            }
            if (basebaseIndentString) {
                output.push(basebaseIndentString);
            }
        };
        print.singleSpace = function() {
            if (output.length && !print._lastCharWhitespace()) {
                output.push(' ');
            }
        };

        print.trim = function() {
            while (print._lastCharWhitespace()) {
                output.pop();
            }
        };

        
        var output = [];
        if (basebaseIndentString) {
            output.push(basebaseIndentString);
        }
        /*_____________________--------------------_____________________*/

        var insideRule = false;
        var enteringConditionalGroup = false;
        var top_ch = '';
        var last_top_ch = '';

        while (true) {
            var whitespace = skipWhitespace();
            var isAfterSpace = whitespace !== '';
            var isAfterNewline = whitespace.indexOf('\n') !== -1;
            var last_top_ch = top_ch;
            var top_ch = ch;

            if (!ch) {
                break;
            } else if (ch === '/' && peek() === '*') { /* css comment */
                var header = lookBack("");
                print.newLine();
                output.push(eatComment());
                print.newLine();
                if (header) {
                    print.newLine(true);
                }
            } else if (ch === '/' && peek() === '/') { // single line comment
                if (!isAfterNewline && last_top_ch !== '{') {
                    print.trim();
                }
                print.singleSpace();
                output.push(eatComment());
                print.newLine();
            } else if (ch === '@') {
                // pass along the space we found as a separate item
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);

                // strip trailing space, if present, for hash property checks
                var variableOrRule = peekString(": ,;{}()[]/='\"").replace(/\s$/, '');

                // might be a nesting at-rule
                if (variableOrRule in css_beautify.NESTED_AT_RULE) {
                    nestedLevel += 1;
                    if (variableOrRule in css_beautify.CONDITIONAL_GROUP_RULE) {
                        enteringConditionalGroup = true;
                    }
                } else if (': '.indexOf(variableOrRule[variableOrRule.length -1]) >= 0) {
                    //we have a variable, add it and insert one space before continuing
                    next();
                    variableOrRule = eatString(": ").replace(/\s$/, '');
                    output.push(variableOrRule);
                    print.singleSpace();
                }
            } else if (ch === '{') {
                if (peek(true) === '}') {
                    eatWhitespace();
                    next();
                    print.singleSpace();
                    output.push("{}");
                } else {
                    indent();
                    print["{"](ch);
                    // when entering conditional groups, only rulesets are allowed
                    if (enteringConditionalGroup) {
                        enteringConditionalGroup = false;
                        insideRule = (indentLevel > nestedLevel);
                    } else {
                        // otherwise, declarations are also allowed
                        insideRule = (indentLevel >= nestedLevel);
                    }
                }
            } else if (ch === '}') {
                outdent();
                print["}"](ch);
                insideRule = false;
                if (nestedLevel) {
                    nestedLevel--;
                }
            } else if (ch === ":") {
                eatWhitespace();
                if ((insideRule || enteringConditionalGroup) && 
                        !(lookBack("&") || foundNestedPseudoClass())) {
                    // 'property: value' delimiter
                    // which could be in a conditional group query
                    output.push(':');
                    print.singleSpace();
                } else {
                    // sass/less parent reference don't use a space
                    // sass nested pseudo-class don't use a space
                    if (peek() === ":") {
                        // pseudo-element
                        next();
                        output.push("::");
                    } else {
                        // pseudo-class
                        output.push(':');
                    }
                }
            } else if (ch === '"' || ch === '\'') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(eatString(ch));
            } else if (ch === ';') {
                output.push(ch);
                print.newLine();
            } else if (ch === '(') { // may be a url
                if (lookBack("url")) {
                    output.push(ch);
                    eatWhitespace();
                    if (next()) {
                        if (ch !== ')' && ch !== '"' && ch !== '\'') {
                            output.push(eatString(')'));
                        } else {
                            pos--;
                        }
                    }
                } else {
                    if (isAfterSpace) {
                        print.singleSpace();
                    }
                    output.push(ch);
                    eatWhitespace();
                }
            } else if (ch === ')') {
                output.push(ch);
            } else if (ch === ',') {
                output.push(ch);
                eatWhitespace();
                if (!insideRule && selectorSeparatorNewline) {
                    print.newLine();
                } else {
                    print.singleSpace();
                }
            } else if (ch === ']') {
                output.push(ch);
            } else if (ch === '[') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);
            } else if (ch === '=') { // no whitespace before or after
                eatWhitespace();
                output.push(ch);
            } else {
                if (isAfterSpace) {
                    print.singleSpace();
                }

                output.push(ch);
            }
        }


        var sweetCode = output.join('').replace(/[\r\n\t ]+$/, '');

        // establish end_with_newline
        if (end_with_newline) {
            sweetCode += "\n";
        }

        return sweetCode;
    }

    // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
    css_beautify.NESTED_AT_RULE = {
        "@page": true,
        "@font-face": true,
        "@keyframes": true,
        // also in CONDITIONAL_GROUP_RULE below
        "@media": true,
        "@supports": true,
        "@document": true
    };
    css_beautify.CONDITIONAL_GROUP_RULE = {
        "@media": true,
        "@supports": true,
        "@document": true
    };

    /*global define */
    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return {
                css_beautify: css_beautify
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        exports.css_beautify = css_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.css_beautify = css_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.css_beautify = css_beautify;
    }

}());

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
    http://jsbeautifier.org/

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_inner_html (default false)  — indent <head> and <body> sections,
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    wrap_line_length (default 250)            -  maximum amount of characters per line (0 = disable)
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"
    preserve_newlines (default true) - whether existing line breaks before elements should be preserved
                                        Only works before elements, not inside tags or for text.
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk
    indent_handlebars (default false) - format and indent {{#foo}} and {{/foo}}
    end_with_newline (false)          - end with a newline


    e.g.

    style_html(html_source, {
      'indent_inner_html': false,
      'indent_size': 2,
      'indent_char': ' ',
      'wrap_line_length': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u'],
      'preserve_newlines': true,
      'max_preserve_newlines': 5,
      'indent_handlebars': false
    });
*/

(function() {

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function ltrim(s) {
        return s.replace(/^\s+/g, '');
    }

    function rtrim(s) {
        return s.replace(/\s+$/g,'');
    }

    function style_html(html_source, options, js_beautify, css_beautify) {
        //Wrapper function to invoke all the necessary constructors and deal with the output.

        var multi_parser,
            indent_inner_html,
            indent_size,
            indent_character,
            wrap_line_length,
            brace_style,
            unformatted,
            preserve_newlines,
            max_preserve_newlines,
            indent_handlebars,
            end_with_newline;

        options = options || {};

        // backwards compatibility to 1.3.4
        if ((options.wrap_line_length === undefined || parseInt(options.wrap_line_length, 10) === 0) &&
                (options.max_char !== undefined && parseInt(options.max_char, 10) !== 0)) {
            options.wrap_line_length = options.max_char;
        }

        indent_inner_html = (options.indent_inner_html === undefined) ? false : options.indent_inner_html;
        indent_size = (options.indent_size === undefined) ? 4 : parseInt(options.indent_size, 10);
        indent_character = (options.indent_char === undefined) ? ' ' : options.indent_char;
        brace_style = (options.brace_style === undefined) ? 'collapse' : options.brace_style;
        wrap_line_length =  parseInt(options.wrap_line_length, 10) === 0 ? 32786 : parseInt(options.wrap_line_length || 250, 10);
        unformatted = options.unformatted || ['a', 'span', 'img', 'bdo', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'q', 'sub', 'sup', 'tt', 'i', 'b', 'big', 'small', 'u', 's', 'strike', 'font', 'ins', 'del', 'pre', 'address', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        max_preserve_newlines = preserve_newlines ?
            (isNaN(parseInt(options.max_preserve_newlines, 10)) ? 32786 : parseInt(options.max_preserve_newlines, 10))
            : 0;
        indent_handlebars = (options.indent_handlebars === undefined) ? false : options.indent_handlebars;
        end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;

        function Parser() {

            this.pos = 0; //Parser position
            this.token = '';
            this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
            this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
                parent: 'parent1',
                parentcount: 1,
                parent1: ''
            };
            this.tag_type = '';
            this.token_text = this.last_token = this.last_text = this.token_type = '';
            this.newlines = 0;
            this.indent_content = indent_inner_html;

            this.Utils = { //Uilities made available to the various functions
                whitespace: "\n\r\t ".split(''),
                single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?='.split(','), //all the single tags for HTML
                extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
                in_array: function(what, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        if (what === arr[i]) {
                            return true;
                        }
                    }
                    return false;
                }
            };

            // Return true iff the given text is composed entirely of
            // whitespace.
            this.is_whitespace = function(text) {
                for (var n = 0; n < text.length; text++) {
                    if (!this.Utils.in_array(text.charAt(n), this.Utils.whitespace)) {
                        return false;
                    }
                }
                return true;
            }

            this.traverse_whitespace = function() {
                var input_char = '';

                input_char = this.input.charAt(this.pos);
                if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                    this.newlines = 0;
                    while (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (preserve_newlines && input_char === '\n' && this.newlines <= max_preserve_newlines) {
                            this.newlines += 1;
                        }

                        this.pos++;
                        input_char = this.input.charAt(this.pos);
                    }
                    return true;
                }
                return false;
            };

            // Append a space to the given content (string array) or, if we are
            // at the wrap_line_length, append a newline/indentation.
            this.space_or_wrap = function(content) {
                if (this.line_char_count >= this.wrap_line_length) { //insert a line when the wrap_line_length is reached
                    this.print_newline(false, content);
                    this.print_indentation(content);
                } else {
                    this.line_char_count++;
                    content.push(' ');
                }
            };

            this.get_content = function() { //function to capture regular content between tags
                var input_char = '',
                    content = [],
                    space = false; //if a space is needed

                while (this.input.charAt(this.pos) !== '<') {
                    if (this.pos >= this.input.length) {
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                        continue;
                    }

                    if (indent_handlebars) {
                        // Handlebars parsing is complicated.
                        // {{#foo}} and {{/foo}} are formatted tags.
                        // {{something}} should get treated as content, except:
                        // {{else}} specifically behaves like {{#if}} and {{/if}}
                        var peek3 = this.input.substr(this.pos, 3);
                        if (peek3 === '{{#' || peek3 === '{{/') {
                            // These are tags and not content.
                            break;
                        } else if (this.input.substr(this.pos, 2) === '{{') {
                            if (this.get_tag(true) === '{{else}}') {
                                break;
                            }
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                    this.line_char_count++;
                    content.push(input_char); //letter at-a-time (or string) inserted to an array
                }
                return content.length ? content.join('') : '';
            };

            this.get_contents_to = function(name) { //get the full content of a script or style to pass to js_beautify
                if (this.pos === this.input.length) {
                    return ['', 'TK_EOF'];
                }
                var input_char = '';
                var content = '';
                var reg_match = new RegExp('</' + name + '\\s*>', 'igm');
                reg_match.lastIndex = this.pos;
                var reg_array = reg_match.exec(this.input);
                var end_script = reg_array ? reg_array.index : this.input.length; //absolute end of script
                if (this.pos < end_script) { //get everything in between the script tags
                    content = this.input.substring(this.pos, end_script);
                    this.pos = end_script;
                }
                return content;
            };

            this.record_tag = function(tag) { //function to record a tag and its parent in this.tags Object
                if (this.tags[tag + 'count']) { //check for the existence of this tag type
                    this.tags[tag + 'count']++;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                } else { //otherwise initialize this tag type
                    this.tags[tag + 'count'] = 1;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                }
                this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
                this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
            };

            this.retrieve_tag = function(tag) { //function to retrieve the opening tag to the corresponding closer
                if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
                    var temp_parent = this.tags.parent; //check to see if it's a closable tag.
                    while (temp_parent) { //till we reach '' (the initial value);
                        if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
                            break;
                        }
                        temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
                    }
                    if (temp_parent) { //if we caught something
                        this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
                        this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
                    }
                    delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
                    delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
                    if (this.tags[tag + 'count'] === 1) {
                        delete this.tags[tag + 'count'];
                    } else {
                        this.tags[tag + 'count']--;
                    }
                }
            };

            this.indent_to_tag = function(tag) {
                // Match the indentation level to the last use of this tag, but don't remove it.
                if (!this.tags[tag + 'count']) {
                    return;
                }
                var temp_parent = this.tags.parent;
                while (temp_parent) {
                    if (tag + this.tags[tag + 'count'] === temp_parent) {
                        break;
                    }
                    temp_parent = this.tags[temp_parent + 'parent'];
                }
                if (temp_parent) {
                    this.indent_level = this.tags[tag + this.tags[tag + 'count']];
                }
            };

            this.get_tag = function(peek) { //function to get a full tag and parse its type
                var input_char = '',
                    content = [],
                    comment = '',
                    space = false,
                    tag_start, tag_end,
                    tag_start_char,
                    orig_pos = this.pos,
                    orig_line_char_count = this.line_char_count;

                peek = peek !== undefined ? peek : false;

                do {
                    if (this.pos >= this.input.length) {
                        if (peek) {
                            this.pos = orig_pos;
                            this.line_char_count = orig_line_char_count;
                        }
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
                        space = true;
                        continue;
                    }

                    if (input_char === "'" || input_char === '"') {
                        input_char += this.get_unformatted(input_char);
                        space = true;

                    }

                    if (input_char === '=') { //no space before =
                        space = false;
                    }

                    if (content.length && content[content.length - 1] !== '=' && input_char !== '>' && space) {
                        //no space after = or before >
                        this.space_or_wrap(content);
                        space = false;
                    }

                    if (indent_handlebars && tag_start_char === '<') {
                        // When inside an angle-bracket tag, put spaces around
                        // handlebars not inside of strings.
                        if ((input_char + this.input.charAt(this.pos)) === '{{') {
                            input_char += this.get_unformatted('}}');
                            if (content.length && content[content.length - 1] !== ' ' && content[content.length - 1] !== '<') {
                                input_char = ' ' + input_char;
                            }
                            space = true;
                        }
                    }

                    if (input_char === '<' && !tag_start_char) {
                        tag_start = this.pos - 1;
                        tag_start_char = '<';
                    }

                    if (indent_handlebars && !tag_start_char) {
                        if (content.length >= 2 && content[content.length - 1] === '{' && content[content.length - 2] == '{') {
                            if (input_char === '#' || input_char === '/') {
                                tag_start = this.pos - 3;
                            } else {
                                tag_start = this.pos - 2;
                            }
                            tag_start_char = '{';
                        }
                    }

                    this.line_char_count++;
                    content.push(input_char); //inserts character at-a-time (or string)

                    if (content[1] && content[1] === '!') { //if we're in a comment, do something special
                        // We treat all comments as literals, even more than preformatted tags
                        // we just look for the appropriate close tag
                        content = [this.get_comment(tag_start)];
                        break;
                    }

                    if (indent_handlebars && tag_start_char === '{' && content.length > 2 && content[content.length - 2] === '}' && content[content.length - 1] === '}') {
                        break;
                    }
                } while (input_char !== '>');

                var tag_complete = content.join('');
                var tag_index;
                var tag_offset;

                if (tag_complete.indexOf(' ') !== -1) { //if there's whitespace, thats where the tag name ends
                    tag_index = tag_complete.indexOf(' ');
                } else if (tag_complete[0] === '{') {
                    tag_index = tag_complete.indexOf('}');
                } else { //otherwise go with the tag ending
                    tag_index = tag_complete.indexOf('>');
                }
                if (tag_complete[0] === '<' || !indent_handlebars) {
                    tag_offset = 1;
                } else {
                    tag_offset = tag_complete[2] === '#' ? 3 : 2;
                }
                var tag_check = tag_complete.substring(tag_offset, tag_index).toLowerCase();
                if (tag_complete.charAt(tag_complete.length - 2) === '/' ||
                    this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                    }
                } else if (indent_handlebars && tag_complete[0] === '{' && tag_check === 'else') {
                    if (!peek) {
                        this.indent_to_tag('if');
                        this.tag_type = 'HANDLEBARS_ELSE';
                        this.indent_content = true;
                        this.traverse_whitespace();
                    }
                } else if (this.is_unformatted(tag_check, unformatted)) { // do not reformat the "unformatted" tags
                    comment = this.get_unformatted('</' + tag_check + '>', tag_complete); //...delegate to get_unformatted function
                    content.push(comment);
                    tag_end = this.pos - 1;
                    this.tag_type = 'SINGLE';
                } else if (tag_check === 'script' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 &&
                    tag_complete.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/) > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'SCRIPT';
                    }
                } else if (tag_check === 'style' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 && tag_complete.search('text/css') > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'STYLE';
                    }
                } else if (tag_check.charAt(0) === '!') { //peek for <! comment
                    // for comments content is already correct.
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                        this.traverse_whitespace();
                    }
                } else if (!peek) {
                    if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
                        this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
                        this.tag_type = 'END';
                    } else { //otherwise it's a start-tag
                        this.record_tag(tag_check); //push it on the tag stack
                        if (tag_check.toLowerCase() !== 'html') {
                            this.indent_content = true;
                        }
                        this.tag_type = 'START';
                    }

                    // Allow preserving of newlines after a start or end tag
                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                    }

                    if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
                        this.print_newline(false, this.output);
                        if (this.output.length && this.output[this.output.length - 2] !== '\n') {
                            this.print_newline(true, this.output);
                        }
                    }
                }

                if (peek) {
                    this.pos = orig_pos;
                    this.line_char_count = orig_line_char_count;
                }

                return content.join(''); //returns fully formatted tag
            };

            this.get_comment = function(start_pos) { //function to return comment content in its entirety
                // this is will have very poor perf, but will work for now.
                var comment = '',
                    delimiter = '>',
                    matched = false;

                this.pos = start_pos;
                input_char = this.input.charAt(this.pos);
                this.pos++;

                while (this.pos <= this.input.length) {
                    comment += input_char;

                    // only need to check for the delimiter if the last chars match
                    if (comment[comment.length - 1] === delimiter[delimiter.length - 1] &&
                        comment.indexOf(delimiter) !== -1) {
                        break;
                    }

                    // only need to search for custom delimiter for the first few characters
                    if (!matched && comment.length < 10) {
                        if (comment.indexOf('<![if') === 0) { //peek for <![if conditional comment
                            delimiter = '<![endif]>';
                            matched = true;
                        } else if (comment.indexOf('<![cdata[') === 0) { //if it's a <[cdata[ comment...
                            delimiter = ']]>';
                            matched = true;
                        } else if (comment.indexOf('<![') === 0) { // some other ![ comment? ...
                            delimiter = ']>';
                            matched = true;
                        } else if (comment.indexOf('<!--') === 0) { // <!-- comment ...
                            delimiter = '-->';
                            matched = true;
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                }

                return comment;
            };

            this.get_unformatted = function(delimiter, orig_tag) { //function to return unformatted content in its entirety

                if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) !== -1) {
                    return '';
                }
                var input_char = '';
                var content = '';
                var min_index = 0;
                var space = true;
                do {

                    if (this.pos >= this.input.length) {
                        return content;
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (!space) {
                            this.line_char_count--;
                            continue;
                        }
                        if (input_char === '\n' || input_char === '\r') {
                            content += '\n';
                            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
                for (var i=0; i<this.indent_level; i++) {
                  content += this.indent_string;
                }
                space = false; //...and make sure other indentation is erased
                */
                            this.line_char_count = 0;
                            continue;
                        }
                    }
                    content += input_char;
                    this.line_char_count++;
                    space = true;

                    if (indent_handlebars && input_char === '{' && content.length && content[content.length - 2] === '{') {
                        // Handlebars expressions in strings should also be unformatted.
                        content += this.get_unformatted('}}');
                        // These expressions are opaque.  Ignore delimiters found in them.
                        min_index = content.length;
                    }
                } while (content.toLowerCase().indexOf(delimiter, min_index) === -1);
                return content;
            };

            this.get_token = function() { //initial handler for token-retrieval
                var token;

                if (this.last_token === 'TK_TAG_SCRIPT' || this.last_token === 'TK_TAG_STYLE') { //check if we need to format javascript
                    var type = this.last_token.substr(7);
                    token = this.get_contents_to(type);
                    if (typeof token !== 'string') {
                        return token;
                    }
                    return [token, 'TK_' + type];
                }
                if (this.current_mode === 'CONTENT') {
                    token = this.get_content();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        return [token, 'TK_CONTENT'];
                    }
                }

                if (this.current_mode === 'TAG') {
                    token = this.get_tag();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        var tag_name_type = 'TK_TAG_' + this.tag_type;
                        return [token, tag_name_type];
                    }
                }
            };

            this.get_full_indent = function(level) {
                level = this.indent_level + level || 0;
                if (level < 1) {
                    return '';
                }

                return Array(level + 1).join(this.indent_string);
            };

            this.is_unformatted = function(tag_check, unformatted) {
                //is this an HTML5 block-level link?
                if (!this.Utils.in_array(tag_check, unformatted)) {
                    return false;
                }

                if (tag_check.toLowerCase() !== 'a' || !this.Utils.in_array('a', unformatted)) {
                    return true;
                }

                //at this point we have an  tag; is its first child something we want to remain
                //unformatted?
                var next_tag = this.get_tag(true /* peek. */ );

                // test next_tag to see if it is just html tag (no external content)
                var tag = (next_tag || "").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);

                // if next_tag comes back but is not an isolated tag, then
                // let's treat the 'a' tag as having content
                // and respect the unformatted option
                if (!tag || this.Utils.in_array(tag, unformatted)) {
                    return true;
                } else {
                    return false;
                }
            };

            this.printer = function(js_source, indent_character, indent_size, wrap_line_length, brace_style) { //handles input/output and some other printing functions

                this.input = js_source || ''; //gets the input for the Parser
                this.output = [];
                this.indent_character = indent_character;
                this.indent_string = '';
                this.indent_size = indent_size;
                this.brace_style = brace_style;
                this.indent_level = 0;
                this.wrap_line_length = wrap_line_length;
                this.line_char_count = 0; //count to see if wrap_line_length was exceeded

                for (var i = 0; i < this.indent_size; i++) {
                    this.indent_string += this.indent_character;
                }

                this.print_newline = function(force, arr) {
                    this.line_char_count = 0;
                    if (!arr || !arr.length) {
                        return;
                    }
                    if (force || (arr[arr.length - 1] !== '\n')) { //we might want the extra line
                        if ((arr[arr.length - 1] !== '\n')) {
                            arr[arr.length - 1] = rtrim(arr[arr.length - 1]);
                        }
                        arr.push('\n');
                    }
                };

                this.print_indentation = function(arr) {
                    for (var i = 0; i < this.indent_level; i++) {
                        arr.push(this.indent_string);
                        this.line_char_count += this.indent_string.length;
                    }
                };

                this.print_token = function(text) {
                    // Avoid printing initial whitespace.
                    if (this.is_whitespace(text) && !this.output.length) {
                        return;
                    }
                    if (text || text !== '') {
                        if (this.output.length && this.output[this.output.length - 1] === '\n') {
                            this.print_indentation(this.output);
                            text = ltrim(text);
                        }
                    }
                    this.print_token_raw(text);
                };

                this.print_token_raw = function(text) {
                    // If we are going to print newlines, truncate trailing
                    // whitespace, as the newlines will represent the space.
                    if (this.newlines > 0) {
                        text = rtrim(text);
                    }

                    if (text && text !== '') {
                        if (text.length > 1 && text[text.length - 1] === '\n') {
                            // unformatted tags can grab newlines as their last character
                            this.output.push(text.slice(0, -1));
                            this.print_newline(false, this.output);
                        } else {
                            this.output.push(text);
                        }
                    }

                    for (var n = 0; n < this.newlines; n++) {
                        this.print_newline(n > 0, this.output);
                    }
                    this.newlines = 0;
                };

                this.indent = function() {
                    this.indent_level++;
                };

                this.unindent = function() {
                    if (this.indent_level > 0) {
                        this.indent_level--;
                    }
                };
            };
            return this;
        }

        /*_____________________--------------------_____________________*/

        multi_parser = new Parser(); //wrapping functions Parser
        multi_parser.printer(html_source, indent_character, indent_size, wrap_line_length, brace_style); //initialize starting values

        while (true) {
            var t = multi_parser.get_token();
            multi_parser.token_text = t[0];
            multi_parser.token_type = t[1];

            if (multi_parser.token_type === 'TK_EOF') {
                break;
            }

            switch (multi_parser.token_type) {
                case 'TK_TAG_START':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_STYLE':
                case 'TK_TAG_SCRIPT':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_END':
                    //Print new line only if the tag has no content and has child
                    if (multi_parser.last_token === 'TK_CONTENT' && multi_parser.last_text === '') {
                        var tag_name = multi_parser.token_text.match(/\w+/)[0];
                        var tag_extracted_from_last_output = null;
                        if (multi_parser.output.length) {
                            tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length - 1].match(/(?:<|{{#)\s*(\w+)/);
                        }
                        if (tag_extracted_from_last_output === null ||
                            tag_extracted_from_last_output[1] !== tag_name) {
                            multi_parser.print_newline(false, multi_parser.output);
                        }
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_SINGLE':
                    // Don't add a newline before elements that should remain unformatted.
                    var tag_check = multi_parser.token_text.match(/^\s*<([a-z-]+)/i);
                    if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)) {
                        multi_parser.print_newline(false, multi_parser.output);
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_HANDLEBARS_ELSE':
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_CONTENT':
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'TAG';
                    break;
                case 'TK_STYLE':
                case 'TK_SCRIPT':
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_newline(false, multi_parser.output);
                        var text = multi_parser.token_text,
                            _beautifier,
                            script_indent_level = 1;
                        if (multi_parser.token_type === 'TK_SCRIPT') {
                            _beautifier = typeof js_beautify === 'function' && js_beautify;
                        } else if (multi_parser.token_type === 'TK_STYLE') {
                            _beautifier = typeof css_beautify === 'function' && css_beautify;
                        }

                        if (options.indent_scripts === "keep") {
                            script_indent_level = 0;
                        } else if (options.indent_scripts === "separate") {
                            script_indent_level = -multi_parser.indent_level;
                        }

                        var indentation = multi_parser.get_full_indent(script_indent_level);
                        if (_beautifier) {
                            // call the Beautifier if avaliable
                            text = _beautifier(text.replace(/^\s*/, indentation), options);
                        } else {
                            // simply indent the string otherwise
                            var white = text.match(/^\s*/)[0];
                            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
                            var reindent = multi_parser.get_full_indent(script_indent_level - _level);
                            text = text.replace(/^\s*/, indentation)
                                .replace(/\r\n|\r|\n/g, '\n' + reindent)
                                .replace(/\s+$/, '');
                        }
                        if (text) {
                            multi_parser.print_token_raw(text);
                            multi_parser.print_newline(true, multi_parser.output);
                        }
                    }
                    multi_parser.current_mode = 'TAG';
                    break;
                default:
                    // We should not be getting here but we don't want to drop input on the floor
                    // Just output the text and move on
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_token(multi_parser.token_text);
                    }
                    break;
            }
            multi_parser.last_token = multi_parser.token_type;
            multi_parser.last_text = multi_parser.token_text;
        }
        var sweet_code = multi_parser.output.join('').replace(/[\r\n\t ]+$/, '');
        if (end_with_newline) {
            sweet_code += '\n';
        }
        return sweet_code;
    }

    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define(["require", "./beautify", "./beautify-css"], function(requireamd) {
            var js_beautify =  requireamd("./beautify");
            var css_beautify =  requireamd("./beautify-css");

            return {
              html_beautify: function(html_source, options) {
                return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
              }
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        var js_beautify = require('./beautify.js');
        var css_beautify = require('./beautify-css.js');

        exports.html_beautify = function(html_source, options) {
            return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
        };
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.html_beautify = function(html_source, options) {
            return style_html(html_source, options, window.js_beautify, window.css_beautify);
        };
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.html_beautify = function(html_source, options) {
            return style_html(html_source, options, global.js_beautify, global.css_beautify);
        };
    }

}());

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./beautify-css.js":4,"./beautify.js":6}],6:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

 JS Beautifier
---------------


  Written by Einar Lielmanis, <einar@jsbeautifier.org>
      http://jsbeautifier.org/

  Originally converted to javascript by Vital, <vital76@gmail.com>
  "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>
  Parsing improvements for brace-less statements by Liam Newman <bitwiseman@gmail.com>


  Usage:
    js_beautify(js_source_text);
    js_beautify(js_source_text, options);

  The options are:
    indent_size (default 4)          - indentation size,
    indent_char (default space)      - character to indent with,
    preserve_newlines (default true) - whether existing line breaks should be preserved,
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

    jslint_happy (default false) - if true, then jslint-stricter mode is enforced.

            jslint_happy        !jslint_happy
            ---------------------------------
            function ()         function()

            switch () {         switch() {
            case 1:               case 1:
              break;                break;
            }                   }

    space_after_anon_function (default false) - should the space before an anonymous function's parens be added, "function()" vs "function ()",
          NOTE: This option is overriden by jslint_happy (i.e. if jslint_happy is true, space_after_anon_function is true by design)

    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.

    space_before_conditional (default true) - should the space before conditional statement be added, "if(true)" vs "if (true)",

    unescape_strings (default false) - should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"

    wrap_line_length (default unlimited) - lines should wrap at next opportunity after this number of characters.
          NOTE: This is not a hard limit. Lines will continue until a point where a newline would
                be preserved if it were present.

    end_with_newline (default false)  - end output with a newline


    e.g

    js_beautify(js_source_text, {
      'indent_size': 1,
      'indent_char': '\t'
    });

*/

(function() {

    var acorn = {};
    (function (exports) {
      // This section of code is taken from acorn.
      //
      // Acorn was written by Marijn Haverbeke and released under an MIT
      // license. The Unicode regexps (for identifiers and whitespace) were
      // taken from [Esprima](http://esprima.org) by Ariya Hidayat.
      //
      // Git repositories for Acorn are available at
      //
      //     http://marijnhaverbeke.nl/git/acorn
      //     https://github.com/marijnh/acorn.git

      // ## Character categories

      // Big ugly regular expressions that match characters in the
      // whitespace, identifier, and identifier-start categories. These
      // are only applied when a character is found to actually have a
      // code point above 128.

      var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
      var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
      var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
      var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
      var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

      // Whether a single character denotes a newline.

      var newline = exports.newline = /[\n\r\u2028\u2029]/;

      // Matches a whole line break (where CRLF is considered a single
      // line break). Used to count lines.

      var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

      // Test whether a given character code starts an identifier.

      var isIdentifierStart = exports.isIdentifierStart = function(code) {
        if (code < 65) return code === 36;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      };

      // Test whether a given character is part of an identifier.

      var isIdentifierChar = exports.isIdentifierChar = function(code) {
        if (code < 48) return code === 36;
        if (code < 58) return true;
        if (code < 65) return false;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
      };
    })(acorn);

    function in_array(what, arr) {
        for (var i = 0; i < arr.length; i += 1) {
            if (arr[i] === what) {
                return true;
            }
        }
        return false;
    }

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function js_beautify(js_source_text, options) {
        "use strict";
        var beautifier = new Beautifier(js_source_text, options);
        return beautifier.beautify();
    }

    var MODE = {
            BlockStatement: 'BlockStatement', // 'BLOCK'
            Statement: 'Statement', // 'STATEMENT'
            ObjectLiteral: 'ObjectLiteral', // 'OBJECT',
            ArrayLiteral: 'ArrayLiteral', //'[EXPRESSION]',
            ForInitializer: 'ForInitializer', //'(FOR-EXPRESSION)',
            Conditional: 'Conditional', //'(COND-EXPRESSION)',
            Expression: 'Expression' //'(EXPRESSION)'
        };

    function Beautifier(js_source_text, options) {
        "use strict";
        var output
        var tokens = [], token_pos;
        var Tokenizer;
        var current_token;
        var last_type, last_last_text, indent_string;
        var flags, previous_flags, flag_store;
        var prefix;

        var handlers, opt;
        var baseIndentString = '';

        handlers = {
            'TK_START_EXPR': handle_start_expr,
            'TK_END_EXPR': handle_end_expr,
            'TK_START_BLOCK': handle_start_block,
            'TK_END_BLOCK': handle_end_block,
            'TK_WORD': handle_word,
            'TK_RESERVED': handle_word,
            'TK_SEMICOLON': handle_semicolon,
            'TK_STRING': handle_string,
            'TK_EQUALS': handle_equals,
            'TK_OPERATOR': handle_operator,
            'TK_COMMA': handle_comma,
            'TK_BLOCK_COMMENT': handle_block_comment,
            'TK_INLINE_COMMENT': handle_inline_comment,
            'TK_COMMENT': handle_comment,
            'TK_DOT': handle_dot,
            'TK_UNKNOWN': handle_unknown,
            'TK_EOF': handle_eof
        };

        function create_flags(flags_base, mode) {
            var next_indent_level = 0;
            if (flags_base) {
                next_indent_level = flags_base.indentation_level;
                if (!output.just_added_newline() &&
                    flags_base.line_indent_level > next_indent_level) {
                    next_indent_level = flags_base.line_indent_level;
                }
            }

            var next_flags = {
                mode: mode,
                parent: flags_base,
                last_text: flags_base ? flags_base.last_text : '', // last token text
                last_word: flags_base ? flags_base.last_word : '', // last 'TK_WORD' passed
                declaration_statement: false,
                declaration_assignment: false,
                multiline_frame: false,
                if_block: false,
                else_block: false,
                do_block: false,
                do_while: false,
                in_case_statement: false, // switch(..){ INSIDE HERE }
                in_case: false, // we're on the exact line with "case 0:"
                case_body: false, // the indented case-action block
                indentation_level: next_indent_level,
                line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
                start_line_index: output.get_line_number(),
                ternary_depth: 0
            };
            return next_flags;
        }

        // Some interpreters have unexpected results with foo = baz || bar;
        options = options ? options : {};
        opt = {};

        // compatibility
        if (options.braces_on_own_line !== undefined) { //graceful handling of deprecated option
            opt.brace_style = options.braces_on_own_line ? "expand" : "collapse";
        }
        opt.brace_style = options.brace_style ? options.brace_style : (opt.brace_style ? opt.brace_style : "collapse");

        // graceful handling of deprecated option
        if (opt.brace_style === "expand-strict") {
            opt.brace_style = "expand";
        }


        opt.indent_size = options.indent_size ? parseInt(options.indent_size, 10) : 4;
        opt.indent_char = options.indent_char ? options.indent_char : ' ';
        opt.preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        opt.break_chained_methods = (options.break_chained_methods === undefined) ? false : options.break_chained_methods;
        opt.max_preserve_newlines = (options.max_preserve_newlines === undefined) ? 0 : parseInt(options.max_preserve_newlines, 10);
        opt.space_in_paren = (options.space_in_paren === undefined) ? false : options.space_in_paren;
        opt.space_in_empty_paren = (options.space_in_empty_paren === undefined) ? false : options.space_in_empty_paren;
        opt.jslint_happy = (options.jslint_happy === undefined) ? false : options.jslint_happy;
        opt.space_after_anon_function = (options.space_after_anon_function === undefined) ? false : options.space_after_anon_function;
        opt.keep_array_indentation = (options.keep_array_indentation === undefined) ? false : options.keep_array_indentation;
        opt.space_before_conditional = (options.space_before_conditional === undefined) ? true : options.space_before_conditional;
        opt.unescape_strings = (options.unescape_strings === undefined) ? false : options.unescape_strings;
        opt.wrap_line_length = (options.wrap_line_length === undefined) ? 0 : parseInt(options.wrap_line_length, 10);
        opt.e4x = (options.e4x === undefined) ? false : options.e4x;
        opt.end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;


        // force opt.space_after_anon_function to true if opt.jslint_happy
        if(opt.jslint_happy) {
            opt.space_after_anon_function = true;
        }

        if(options.indent_with_tabs){
            opt.indent_char = '\t';
            opt.indent_size = 1;
        }

        //----------------------------------
        indent_string = '';
        while (opt.indent_size > 0) {
            indent_string += opt.indent_char;
            opt.indent_size -= 1;
        }

        var preindent_index = 0;
        if(js_source_text && js_source_text.length) {
            while ( (js_source_text.charAt(preindent_index) === ' ' ||
                    js_source_text.charAt(preindent_index) === '\t')) {
                baseIndentString += js_source_text.charAt(preindent_index);
                preindent_index += 1;
            }
            js_source_text = js_source_text.substring(preindent_index);
        }

        last_type = 'TK_START_BLOCK'; // last token type
        last_last_text = ''; // pre-last token text
        output = new Output(indent_string, baseIndentString);


        // Stack of parsing/formatting states, including MODE.
        // We tokenize, parse, and output in an almost purely a forward-only stream of token input
        // and formatted output.  This makes the beautifier less accurate than full parsers
        // but also far more tolerant of syntax errors.
        //
        // For example, the default mode is MODE.BlockStatement. If we see a '{' we push a new frame of type
        // MODE.BlockStatement on the the stack, even though it could be object literal.  If we later
        // encounter a ":", we'll switch to to MODE.ObjectLiteral.  If we then see a ";",
        // most full parsers would die, but the beautifier gracefully falls back to
        // MODE.BlockStatement and continues on.
        flag_store = [];
        set_mode(MODE.BlockStatement);

        this.beautify = function() {

            /*jshint onevar:true */
            var local_token, sweet_code;
            Tokenizer = new tokenizer(js_source_text, opt, indent_string);
            tokens = Tokenizer.tokenize();
            token_pos = 0;

            while (local_token = get_token()) {
                for(var i = 0; i < local_token.comments_before.length; i++) {
                    // The cleanest handling of inline comments is to treat them as though they aren't there.
                    // Just continue formatting and the behavior should be logical.
                    // Also ignore unknown tokens.  Again, this should result in better behavior.
                    handle_token(local_token.comments_before[i]);
                }
                handle_token(local_token);

                last_last_text = flags.last_text;
                last_type = local_token.type;
                flags.last_text = local_token.text;

                token_pos += 1;
            }

            sweet_code = output.get_code();
            if (opt.end_with_newline) {
                sweet_code += '\n';
            }

            return sweet_code;
        };

        function handle_token(local_token) {
            var newlines = local_token.newlines;
            var keep_whitespace = opt.keep_array_indentation && is_array(flags.mode);

            if (keep_whitespace) {
                for (i = 0; i < newlines; i += 1) {
                    print_newline(i > 0);
                }
            } else {
                if (opt.max_preserve_newlines && newlines > opt.max_preserve_newlines) {
                    newlines = opt.max_preserve_newlines;
                }

                if (opt.preserve_newlines) {
                    if (local_token.newlines > 1) {
                        print_newline();
                        for (var i = 1; i < newlines; i += 1) {
                            print_newline(true);
                        }
                    }
                }
            }

            current_token = local_token;
            handlers[current_token.type]();
        }

        // we could use just string.split, but
        // IE doesn't like returning empty strings

        function split_newlines(s) {
            //return s.split(/\x0d\x0a|\x0a/);

            s = s.replace(/\x0d/g, '');
            var out = [],
                idx = s.indexOf("\n");
            while (idx !== -1) {
                out.push(s.substring(0, idx));
                s = s.substring(idx + 1);
                idx = s.indexOf("\n");
            }
            if (s.length) {
                out.push(s);
            }
            return out;
        }

        function allow_wrap_or_preserved_newline(force_linewrap) {
            force_linewrap = (force_linewrap === undefined) ? false : force_linewrap;

            if (output.just_added_newline()) {
                return
            }

            if ((opt.preserve_newlines && current_token.wanted_newline) || force_linewrap) {
                print_newline(false, true);
            } else if (opt.wrap_line_length) {
                // We never wrap the first token of a line due to newline check above.
                var proposed_line_length = output.current_line.get_character_count() + current_token.text.length +
                    (output.space_before_token ? 1 : 0);
                if (proposed_line_length >= opt.wrap_line_length) {
                    print_newline(false, true);
                }
            }
        }

        function print_newline(force_newline, preserve_statement_flags) {
            if (!preserve_statement_flags) {
                if (flags.last_text !== ';' && flags.last_text !== ',' && flags.last_text !== '=' && last_type !== 'TK_OPERATOR') {
                    while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                        restore_mode();
                    }
                }
            }

            if (output.add_new_line(force_newline)) {
                flags.multiline_frame = true;
            }
        }

        function print_token_line_indentation() {
            if (output.just_added_newline()) {
                if (opt.keep_array_indentation && is_array(flags.mode) && current_token.wanted_newline) {
                    // prevent removing of this whitespace as redundant
                    output.current_line.push('');
                    for (var i = 0; i < current_token.whitespace_before.length; i += 1) {
                        output.current_line.push(current_token.whitespace_before[i]);
                    }
                    output.space_before_token = false;
                } else if (output.add_indent_string(flags.indentation_level)) {
                    flags.line_indent_level = flags.indentation_level;
                }
            }
        }

        function print_token(printable_token) {
            printable_token = printable_token || current_token.text;
            print_token_line_indentation();
            output.add_token(printable_token);
        }

        function indent() {
            flags.indentation_level += 1;
        }

        function deindent() {
            if (flags.indentation_level > 0 &&
                ((!flags.parent) || flags.indentation_level > flags.parent.indentation_level))
                flags.indentation_level -= 1;
        }

        function set_mode(mode) {
            if (flags) {
                flag_store.push(flags);
                previous_flags = flags;
            } else {
                previous_flags = create_flags(null, mode);
            }

            flags = create_flags(previous_flags, mode);
        }

        function is_array(mode) {
            return mode === MODE.ArrayLiteral;
        }

        function is_expression(mode) {
            return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
        }

        function restore_mode() {
            if (flag_store.length > 0) {
                previous_flags = flags;
                flags = flag_store.pop();
                if (previous_flags.mode === MODE.Statement) {
                    output.remove_redundant_indentation(previous_flags);
                }
            }
        }

        function start_of_object_property() {
            return flags.parent.mode === MODE.ObjectLiteral && flags.mode === MODE.Statement && (
                (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set'])));
        }

        function start_of_statement() {
            if (
                    (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'do') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'return' && !current_token.wanted_newline) ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'else' && !(current_token.type === 'TK_RESERVED' && current_token.text === 'if')) ||
                    (last_type === 'TK_END_EXPR' && (previous_flags.mode === MODE.ForInitializer || previous_flags.mode === MODE.Conditional)) ||
                    (last_type === 'TK_WORD' && flags.mode === MODE.BlockStatement
                        && !flags.in_case
                        && !(current_token.text === '--' || current_token.text === '++')
                        && current_token.type !== 'TK_WORD' && current_token.type !== 'TK_RESERVED') ||
                    (flags.mode === MODE.ObjectLiteral && (
                        (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set']))))
                ) {

                set_mode(MODE.Statement);
                indent();

                if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') {
                    flags.declaration_statement = true;
                }

                // Issue #276:
                // If starting a new statement with [if, for, while, do], push to a new line.
                // if (a) if (b) if(c) d(); else e(); else f();
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline(
                        current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['do', 'for', 'if', 'while']));
                }

                return true;
            }
            return false;
        }

        function all_lines_start_with(lines, c) {
            for (var i = 0; i < lines.length; i++) {
                var line = trim(lines[i]);
                if (line.charAt(0) !== c) {
                    return false;
                }
            }
            return true;
        }

        function each_line_matches_indent(lines, indent) {
            var i = 0,
                len = lines.length,
                line;
            for (; i < len; i++) {
                line = lines[i];
                // allow empty lines to pass through
                if (line && line.indexOf(indent) !== 0) {
                    return false;
                }
            }
            return true;
        }

        function is_special_word(word) {
            return in_array(word, ['case', 'return', 'do', 'if', 'throw', 'else']);
        }

        function get_token(offset) {
            var index = token_pos + (offset || 0);
            return (index < 0 || index >= tokens.length) ? null : tokens[index];
        }

        function handle_start_expr() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            var next_mode = MODE.Expression;
            if (current_token.text === '[') {

                if (last_type === 'TK_WORD' || flags.last_text === ')') {
                    // this is array index specifier, break immediately
                    // a[x], fn()[x]
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, Tokenizer.line_starters)) {
                        output.space_before_token = true;
                    }
                    set_mode(next_mode);
                    print_token();
                    indent();
                    if (opt.space_in_paren) {
                        output.space_before_token = true;
                    }
                    return;
                }

                next_mode = MODE.ArrayLiteral;
                if (is_array(flags.mode)) {
                    if (flags.last_text === '[' ||
                        (flags.last_text === ',' && (last_last_text === ']' || last_last_text === '}'))) {
                        // ], [ goes to new line
                        // }, [ goes to new line
                        if (!opt.keep_array_indentation) {
                            print_newline();
                        }
                    }
                }

            } else {
                if (last_type === 'TK_RESERVED' && flags.last_text === 'for') {
                    next_mode = MODE.ForInitializer;
                } else if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['if', 'while'])) {
                    next_mode = MODE.Conditional;
                } else {
                    // next_mode = MODE.Expression;
                }
            }

            if (flags.last_text === ';' || last_type === 'TK_START_BLOCK') {
                print_newline();
            } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_START_EXPR' || last_type === 'TK_END_BLOCK' || flags.last_text === '.') {
                // TODO: Consider whether forcing this is required.  Review failing tests when removed.
                allow_wrap_or_preserved_newline(current_token.wanted_newline);
                // do nothing on (( and )( and ][ and ]( and .(
            } else if (!(last_type === 'TK_RESERVED' && current_token.text === '(') && last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
                output.space_before_token = true;
            } else if ((last_type === 'TK_RESERVED' && (flags.last_word === 'function' || flags.last_word === 'typeof')) ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                // function() vs function ()
                if (opt.space_after_anon_function) {
                    output.space_before_token = true;
                }
            } else if (last_type === 'TK_RESERVED' && (in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === 'catch')) {
                if (opt.space_before_conditional) {
                    output.space_before_token = true;
                }
            }

            // Support of this kind of newline preservation.
            // a = (b &&
            //     (c || d));
            if (current_token.text === '(') {
                if (last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                    if (!start_of_object_property()) {
                        allow_wrap_or_preserved_newline();
                    }
                }
            }

            set_mode(next_mode);
            print_token();
            if (opt.space_in_paren) {
                output.space_before_token = true;
            }

            // In all cases, if we newline while inside an expression it should be indented.
            indent();
        }

        function handle_end_expr() {
            // statements inside expressions are not valid syntax, but...
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }

            if (flags.multiline_frame) {
                allow_wrap_or_preserved_newline(current_token.text === ']' && is_array(flags.mode) && !opt.keep_array_indentation);
            }

            if (opt.space_in_paren) {
                if (last_type === 'TK_START_EXPR' && ! opt.space_in_empty_paren) {
                    // () [] no inner space in empty parens like these, ever, ref #320
                    output.trim();
                    output.space_before_token = false;
                } else {
                    output.space_before_token = true;
                }
            }
            if (current_token.text === ']' && opt.keep_array_indentation) {
                print_token();
                restore_mode();
            } else {
                restore_mode();
                print_token();
            }
            output.remove_redundant_indentation(previous_flags);

            // do {} while () // no statement required after
            if (flags.do_while && previous_flags.mode === MODE.Conditional) {
                previous_flags.mode = MODE.Expression;
                flags.do_block = false;
                flags.do_while = false;

            }
        }

        function handle_start_block() {
            // Check if this is should be treated as a ObjectLiteral
            var next_token = get_token(1)
            var second_token = get_token(2)
            if (second_token && (
                    (second_token.text === ':' && in_array(next_token.type, ['TK_STRING', 'TK_WORD', 'TK_RESERVED']))
                    || (in_array(next_token.text, ['get', 'set']) && in_array(second_token.type, ['TK_WORD', 'TK_RESERVED']))
                )) {
                // We don't support TypeScript,but we didn't break it for a very long time.
                // We'll try to keep not breaking it.
                if (!in_array(last_last_text, ['class','interface'])) {
                    set_mode(MODE.ObjectLiteral);
                } else {
                    set_mode(MODE.BlockStatement);
                }
            } else {
                set_mode(MODE.BlockStatement);
            }

            var empty_braces = !next_token.comments_before.length &&  next_token.text === '}';
            var empty_anonymous_function = empty_braces && flags.last_word === 'function' &&
                last_type === 'TK_END_EXPR';

            if (opt.brace_style === "expand") {
                if (last_type !== 'TK_OPERATOR' &&
                    (empty_anonymous_function ||
                        last_type === 'TK_EQUALS' ||
                        (last_type === 'TK_RESERVED' && is_special_word(flags.last_text) && flags.last_text !== 'else'))) {
                    output.space_before_token = true;
                } else {
                    print_newline(false, true);
                }
            } else { // collapse
                if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
                    if (last_type === 'TK_START_BLOCK') {
                        print_newline();
                    } else {
                        output.space_before_token = true;
                    }
                } else {
                    // if TK_OPERATOR or TK_START_EXPR
                    if (is_array(previous_flags.mode) && flags.last_text === ',') {
                        if (last_last_text === '}') {
                            // }, { in array context
                            output.space_before_token = true;
                        } else {
                            print_newline(); // [a, b, c, {
                        }
                    }
                }
            }
            print_token();
            indent();
        }

        function handle_end_block() {
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
            var empty_braces = last_type === 'TK_START_BLOCK';

            if (opt.brace_style === "expand") {
                if (!empty_braces) {
                    print_newline();
                }
            } else {
                // skip {}
                if (!empty_braces) {
                    if (is_array(flags.mode) && opt.keep_array_indentation) {
                        // we REALLY need a newline here, but newliner would skip that
                        opt.keep_array_indentation = false;
                        print_newline();
                        opt.keep_array_indentation = true;

                    } else {
                        print_newline();
                    }
                }
            }
            restore_mode();
            print_token();
        }

        function handle_word() {
            if (current_token.type === 'TK_RESERVED' && flags.mode !== MODE.ObjectLiteral &&
                in_array(current_token.text, ['set', 'get'])) {
                current_token.type = 'TK_WORD';
            }

            if (current_token.type === 'TK_RESERVED' && flags.mode === MODE.ObjectLiteral) {
                var next_token = get_token(1);
                if (next_token.text == ':') {
                    current_token.type = 'TK_WORD';
                }
            }

            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            } else if (current_token.wanted_newline && !is_expression(flags.mode) &&
                (last_type !== 'TK_OPERATOR' || (flags.last_text === '--' || flags.last_text === '++')) &&
                last_type !== 'TK_EQUALS' &&
                (opt.preserve_newlines || !(last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const', 'set', 'get'])))) {

                print_newline();
            }

            if (flags.do_block && !flags.do_while) {
                if (current_token.type === 'TK_RESERVED' && current_token.text === 'while') {
                    // do {} ## while ()
                    output.space_before_token = true;
                    print_token();
                    output.space_before_token = true;
                    flags.do_while = true;
                    return;
                } else {
                    // do {} should always have while as the next word.
                    // if we don't see the expected while, recover
                    print_newline();
                    flags.do_block = false;
                }
            }

            // if may be followed by else, or not
            // Bare/inline ifs are tricky
            // Need to unwind the modes correctly: if (a) if (b) c(); else d(); else e();
            if (flags.if_block) {
                if (!flags.else_block && (current_token.type === 'TK_RESERVED' && current_token.text === 'else')) {
                    flags.else_block = true;
                } else {
                    while (flags.mode === MODE.Statement) {
                        restore_mode();
                    }
                    flags.if_block = false;
                    flags.else_block = false;
                }
            }

            if (current_token.type === 'TK_RESERVED' && (current_token.text === 'case' || (current_token.text === 'default' && flags.in_case_statement))) {
                print_newline();
                if (flags.case_body || opt.jslint_happy) {
                    // switch cases following one another
                    deindent();
                    flags.case_body = false;
                }
                print_token();
                flags.in_case = true;
                flags.in_case_statement = true;
                return;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'function') {
                if (in_array(flags.last_text, ['}', ';']) || (output.just_added_newline() && ! in_array(flags.last_text, ['[', '{', ':', '=', ',']))) {
                    // make sure there is a nice clean space of at least one blank line
                    // before a new function definition
                    if ( !output.just_added_blankline() && !current_token.comments_before.length) {
                        print_newline();
                        print_newline(true);
                    }
                }
                if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set', 'new', 'return', 'export'])) {
                        output.space_before_token = true;
                    } else if (last_type === 'TK_RESERVED' && flags.last_text === 'default' && last_last_text === 'export') {
                        output.space_before_token = true;
                    } else {
                        print_newline();
                    }
                } else if (last_type === 'TK_OPERATOR' || flags.last_text === '=') {
                    // foo = function
                    output.space_before_token = true;
                } else if (!flags.multiline_frame && (is_expression(flags.mode) || is_array(flags.mode))) {
                    // (function
                } else {
                    print_newline();
                }
            }

            if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            }

            if (current_token.type === 'TK_RESERVED' &&  in_array(current_token.text, ['function', 'get', 'set'])) {
                print_token();
                flags.last_word = current_token.text;
                return;
            }

            prefix = 'NONE';

            if (last_type === 'TK_END_BLOCK') {
                if (!(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally']))) {
                    prefix = 'NEWLINE';
                } else {
                    if (opt.brace_style === "expand" || opt.brace_style === "end-expand") {
                        prefix = 'NEWLINE';
                    } else {
                        prefix = 'SPACE';
                        output.space_before_token = true;
                    }
                }
            } else if (last_type === 'TK_SEMICOLON' && flags.mode === MODE.BlockStatement) {
                // TODO: Should this be for STATEMENT as well?
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_SEMICOLON' && is_expression(flags.mode)) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_STRING') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD' ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_START_BLOCK') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_END_EXPR') {
                output.space_before_token = true;
                prefix = 'NEWLINE';
            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                if (flags.last_text === 'else' || flags.last_text === 'export') {
                    prefix = 'SPACE';
                } else {
                    prefix = 'NEWLINE';
                }

            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally'])) {
                if (last_type !== 'TK_END_BLOCK' || opt.brace_style === "expand" || opt.brace_style === "end-expand") {
                    print_newline();
                } else {
                    output.trim(true);
                    var line = output.current_line;
                    // If we trimmed and there's something other than a close block before us
                    // put a newline back in.  Handles '} // comment' scenario.
                    if (line.last() !== '}') {
                        print_newline();
                    }
                    output.space_before_token = true;
                }
            } else if (prefix === 'NEWLINE') {
                if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                    // no newline between 'return nnn'
                    output.space_before_token = true;
                } else if (last_type !== 'TK_END_EXPR') {
                    if ((last_type !== 'TK_START_EXPR' || !(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['var', 'let', 'const']))) && flags.last_text !== ':') {
                        // no need to force newline on 'var': for (var x = 0...)
                        if (current_token.type === 'TK_RESERVED' && current_token.text === 'if' && flags.last_text === 'else') {
                            // no newline for } else if {
                            output.space_before_token = true;
                        } else {
                            print_newline();
                        }
                    }
                } else if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                    print_newline();
                }
            } else if (flags.multiline_frame && is_array(flags.mode) && flags.last_text === ',' && last_last_text === '}') {
                print_newline(); // }, in lists get a newline treatment
            } else if (prefix === 'SPACE') {
                output.space_before_token = true;
            }
            print_token();
            flags.last_word = current_token.text;

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'do') {
                flags.do_block = true;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'if') {
                flags.if_block = true;
            }
        }

        function handle_semicolon() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // Semicolon can be the start (and end) of a statement
                output.space_before_token = false;
            }
            while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                restore_mode();
            }
            print_token();
        }

        function handle_string() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // One difference - strings want at least a space before
                output.space_before_token = true;
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                output.space_before_token = true;
            } else if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            } else {
                print_newline();
            }
            print_token();
        }

        function handle_equals() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (flags.declaration_statement) {
                // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
                flags.declaration_assignment = true;
            }
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comma() {
            if (flags.declaration_statement) {
                if (is_expression(flags.parent.mode)) {
                    // do not break on comma, for(var a = 1, b = 2)
                    flags.declaration_assignment = false;
                }

                print_token();

                if (flags.declaration_assignment) {
                    flags.declaration_assignment = false;
                    print_newline(false, true);
                } else {
                    output.space_before_token = true;
                }
                return;
            }

            print_token();
            if (flags.mode === MODE.ObjectLiteral ||
                (flags.mode === MODE.Statement && flags.parent.mode === MODE.ObjectLiteral)) {
                if (flags.mode === MODE.Statement) {
                    restore_mode();
                }
                print_newline();
            } else {
                // EXPR or DO_BLOCK
                output.space_before_token = true;
            }

        }

        function handle_operator() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                // "return" had a special handling in TK_WORD. Now we need to return the favor
                output.space_before_token = true;
                print_token();
                return;
            }

            // hack for actionscript's import .*;
            if (current_token.text === '*' && last_type === 'TK_DOT') {
                print_token();
                return;
            }

            if (current_token.text === ':' && flags.in_case) {
                flags.case_body = true;
                indent();
                print_token();
                print_newline();
                flags.in_case = false;
                return;
            }

            if (current_token.text === '::') {
                // no spaces around exotic namespacing syntax operator
                print_token();
                return;
            }

            // http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
            // if there is a newline between -- or ++ and anything else we should preserve it.
            if (current_token.wanted_newline && (current_token.text === '--' || current_token.text === '++')) {
                print_newline(false, true);
            }

            // Allow line wrapping between operators
            if (last_type === 'TK_OPERATOR') {
                allow_wrap_or_preserved_newline();
            }

            var space_before = true;
            var space_after = true;

            if (in_array(current_token.text, ['--', '++', '!', '~']) || (in_array(current_token.text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS', 'TK_OPERATOR']) || in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === ','))) {
                // unary operators (and binary +/- pretending to be unary) special cases

                space_before = false;
                space_after = false;

                if (flags.last_text === ';' && is_expression(flags.mode)) {
                    // for (;; ++i)
                    //        ^^^
                    space_before = true;
                }

                if (last_type === 'TK_RESERVED' || last_type === 'TK_END_EXPR') {
                    space_before = true;
                } else if (last_type === 'TK_OPERATOR') {
                    space_before =
                        (in_array(current_token.text, ['--', '-']) && in_array(flags.last_text, ['--', '-'])) ||
                        (in_array(current_token.text, ['++', '+']) && in_array(flags.last_text, ['++', '+']));
                }

                if ((flags.mode === MODE.BlockStatement || flags.mode === MODE.Statement) && (flags.last_text === '{' || flags.last_text === ';')) {
                    // { foo; --i }
                    // foo(); --bar;
                    print_newline();
                }
            } else if (current_token.text === ':') {
                if (flags.ternary_depth === 0) {
                    // Colon is invalid javascript outside of ternary and object, but do our best to guess what was meant.
                    space_before = false;
                } else {
                    flags.ternary_depth -= 1;
                }
            } else if (current_token.text === '?') {
                flags.ternary_depth += 1;
            } else if (current_token.text === '*' && last_type === 'TK_RESERVED' && flags.last_text === 'function') {
                space_before = false;
                space_after = false;
            }
            output.space_before_token = output.space_before_token || space_before;
            print_token();
            output.space_before_token = space_after;
        }

        function handle_block_comment() {
            var lines = split_newlines(current_token.text);
            var j; // iterator for this case
            var javadoc = false;
            var starless = false;
            var lastIndent = current_token.whitespace_before.join('');
            var lastIndentLength = lastIndent.length;

            // block comment starts with a new line
            print_newline(false, true);
            if (lines.length > 1) {
                if (all_lines_start_with(lines.slice(1), '*')) {
                    javadoc = true;
                }
                else if (each_line_matches_indent(lines.slice(1), lastIndent)) {
                    starless = true;
                }
            }

            // first line always indented
            print_token(lines[0]);
            for (j = 1; j < lines.length; j++) {
                print_newline(false, true);
                if (javadoc) {
                    // javadoc: reformat and re-indent
                    print_token(' ' + trim(lines[j]));
                } else if (starless && lines[j].length > lastIndentLength) {
                    // starless: re-indent non-empty content, avoiding trim
                    print_token(lines[j].substring(lastIndentLength));
                } else {
                    // normal comments output raw
                    output.add_token(lines[j]);
                }
            }

            // for comments of more than one line, make sure there's a new line after
            print_newline(false, true);
        }

        function handle_inline_comment() {
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comment() {
            if (current_token.wanted_newline) {
                print_newline(false, true);
            } else {
                output.trim(true);
            }

            output.space_before_token = true;
            print_token();
            print_newline(false, true);
        }

        function handle_dot() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                output.space_before_token = true;
            } else {
                // allow preserved newlines before dots in general
                // force newlines on dots after close paren when break_chained - for bar().baz()
                allow_wrap_or_preserved_newline(flags.last_text === ')' && opt.break_chained_methods);
            }

            print_token();
        }

        function handle_unknown() {
            print_token();

            if (current_token.text[current_token.text.length - 1] === '\n') {
                print_newline();
            }
        }

        function handle_eof() {
            // Unwind any open statements
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
        }
    }

    function OutputLine() {
        var character_count = 0;
        var line_items = [];

        this.get_character_count = function() {
            return character_count;
        }

        this.get_item_count = function() {
            return line_items.length;
        }

        this.get_output = function() {
            return line_items.join('');
        }

        this.last = function() {
            if (line_items.length) {
              return line_items[line_items.length - 1];
            } else {
              return null;
            }
        }

        this.push = function(input) {
            line_items.push(input);
            character_count += input.length;
        }

        this.remove_indent = function(indent_string, baseIndentString) {
            var splice_index = 0;

            // skip empty lines
            if (line_items.length === 0) {
                return;
            }

            // skip the preindent string if present
            if (baseIndentString && line_items[0] === baseIndentString) {
                splice_index = 1;
            }

            // remove one indent, if present
            if (line_items[splice_index] === indent_string) {
                character_count -= line_items[splice_index].length;
                line_items.splice(splice_index, 1);
            }
        }

        this.trim = function(indent_string, baseIndentString) {
            while (this.get_item_count() &&
                (this.last() === ' ' ||
                    this.last() === indent_string ||
                    this.last() === baseIndentString)) {
                var item = line_items.pop();
                character_count -= item.length;
            }
        }
    }

    function Output(indent_string, baseIndentString) {
        var lines =[];
        this.baseIndentString = baseIndentString;
        this.current_line = null;
        this.space_before_token = false;

        this.get_line_number = function() {
            return lines.length;
        }

        // Using object instead of string to allow for later expansion of info about each line
        this.add_new_line = function(force_newline) {
            if (this.get_line_number() === 1 && this.just_added_newline()) {
                return false; // no newline on start of file
            }

            if (force_newline || !this.just_added_newline()) {
                this.current_line = new OutputLine();
                lines.push(this.current_line);
                return true;
            }

            return false;
        }

        // initialize
        this.add_new_line(true);

        this.get_code = function() {
            var sweet_code = lines[0].get_output();
            for (var line_index = 1; line_index < lines.length; line_index++) {
                sweet_code += '\n' + lines[line_index].get_output();
            }
            sweet_code = sweet_code.replace(/[\r\n\t ]+$/, '');
            return sweet_code;
        }

        this.add_indent_string = function(indentation_level) {
            if (baseIndentString) {
                this.current_line.push(baseIndentString);
            }

            // Never indent your first output indent at the start of the file
            if (lines.length > 1) {
                for (var i = 0; i < indentation_level; i += 1) {
                    this.current_line.push(indent_string);
                }
                return true;
            }
            return false;
        }

        this.add_token = function(printable_token) {
            this.add_space_before_token();
            this.current_line.push(printable_token);
        }

        this.add_space_before_token = function() {
            if (this.space_before_token && this.current_line.get_item_count()) {
                var last_output = this.current_line.last();
                if (last_output !== ' ' && last_output !== indent_string && last_output !== baseIndentString) { // prevent occassional duplicate space
                    this.current_line.push(' ');
                }
            }
            this.space_before_token = false;
        }

        this.remove_redundant_indentation = function (frame) {
            // This implementation is effective but has some issues:
            //     - less than great performance due to array splicing
            //     - can cause line wrap to happen too soon due to indent removal
            //           after wrap points are calculated
            // These issues are minor compared to ugly indentation.

            if (frame.multiline_frame ||
                frame.mode === MODE.ForInitializer ||
                frame.mode === MODE.Conditional) {
                return;
            }

            // remove one indent from each line inside this section
            var index = frame.start_line_index;
            var line;

            var output_length = lines.length;
            while (index < output_length) {
                lines[index].remove_indent(indent_string, baseIndentString);
                index++;
            }
        }

        this.trim = function(eat_newlines) {
            eat_newlines = (eat_newlines === undefined) ? false : eat_newlines;

            this.current_line.trim(indent_string, baseIndentString);

            while (eat_newlines && lines.length > 1 &&
                this.current_line.get_item_count() === 0) {
                lines.pop();
                this.current_line = lines[lines.length - 1]
                this.current_line.trim(indent_string, baseIndentString);
            }
        }

        this.just_added_newline = function() {
            return this.current_line.get_item_count() === 0;
        }

        this.just_added_blankline = function() {
            if (this.just_added_newline()) {
                if (lines.length === 1) {
                    return true; // start of the file and newline = blank
                }

                var line = lines[lines.length - 2];
                return line.get_item_count() === 0;
            }
            return false;
        }
    }


    var Token = function(type, text, newlines, whitespace_before, mode, parent) {
        this.type = type;
        this.text = text;
        this.comments_before = [];
        this.newlines = newlines || 0;
        this.wanted_newline = newlines > 0;
        this.whitespace_before = whitespace_before || [];
        this.parent = null;
    }

    function tokenizer(input, opts, indent_string) {

        var whitespace = "\n\r\t ".split('');
        var digit = /[0-9]/;

        var punct = ('+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! ~ , : ? ^ ^= |= :: =>'
                +' <%= <% %> <?= <? ?>').split(' '); // try to be a good boy and try not to break the markup language identifiers

        // words which should always start on new line.
        this.line_starters = 'continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,yield,import,export'.split(',');
        var reserved_words = this.line_starters.concat(['do', 'in', 'else', 'get', 'set', 'new', 'catch', 'finally', 'typeof']);

        var n_newlines, whitespace_before_token, in_html_comment, tokens, parser_pos;
        var input_length;

        this.tokenize = function() {
            // cache the source's length.
            input_length = input.length
            parser_pos = 0;
            in_html_comment = false
            tokens = [];

            var next, last;
            var token_values;
            var open = null;
            var open_stack = [];
            var comments = [];

            while (!(last && last.type === 'TK_EOF')) {
                token_values = tokenize_next();
                next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                while(next.type === 'TK_INLINE_COMMENT' || next.type === 'TK_COMMENT' ||
                    next.type === 'TK_BLOCK_COMMENT' || next.type === 'TK_UNKNOWN') {
                    comments.push(next);
                    token_values = tokenize_next();
                    next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                }

                if (comments.length) {
                    next.comments_before = comments;
                    comments = [];
                }

                if (next.type === 'TK_START_BLOCK' || next.type === 'TK_START_EXPR') {
                    next.parent = last;
                    open = next;
                    open_stack.push(next);
                }  else if ((next.type === 'TK_END_BLOCK' || next.type === 'TK_END_EXPR') &&
                    (open && (
                        (next.text === ']' && open.text === '[') ||
                        (next.text === ')' && open.text === '(') ||
                        (next.text === '}' && open.text === '}')))) {
                    next.parent = open.parent;
                    open = open_stack.pop();
                }

                tokens.push(next);
                last = next;
            }

            return tokens;
        }

        function tokenize_next() {
            var i, resulting_string;

            n_newlines = 0;
            whitespace_before_token = [];

            if (parser_pos >= input_length) {
                return ['', 'TK_EOF'];
            }

            var last_token;
            if (tokens.length) {
                last_token = tokens[tokens.length-1];
            } else {
                // For the sake of tokenizing we can pretend that there was on open brace to start
                last_token = new Token('TK_START_BLOCK', '{');
            }


            var c = input.charAt(parser_pos);
            parser_pos += 1;

            while (in_array(c, whitespace)) {

                if (c === '\n') {
                    n_newlines += 1;
                    whitespace_before_token = [];
                } else if (n_newlines) {
                    if (c === indent_string) {
                        whitespace_before_token.push(indent_string);
                    } else if (c !== '\r') {
                        whitespace_before_token.push(' ');
                    }
                }

                if (parser_pos >= input_length) {
                    return ['', 'TK_EOF'];
                }

                c = input.charAt(parser_pos);
                parser_pos += 1;
            }

            if (digit.test(c)) {
                var allow_decimal = true;
                var allow_e = true;
                var local_digit = digit;

                if (c === '0' && parser_pos < input_length && /[Xx]/.test(input.charAt(parser_pos))) {
                    // switch to hex number, no decimal or e, just hex digits
                    allow_decimal = false;
                    allow_e = false;
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    local_digit = /[0123456789abcdefABCDEF]/
                } else {
                    // we know this first loop will run.  It keeps the logic simpler.
                    c = '';
                    parser_pos -= 1
                }

                // Add the digits
                while (parser_pos < input_length && local_digit.test(input.charAt(parser_pos))) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;

                    if (allow_decimal && parser_pos < input_length && input.charAt(parser_pos) === '.') {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        allow_decimal = false;
                    }

                    if (allow_e && parser_pos < input_length && /[Ee]/.test(input.charAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;

                        if (parser_pos < input_length && /[+-]/.test(input.charAt(parser_pos))) {
                            c += input.charAt(parser_pos);
                            parser_pos += 1;
                        }

                        allow_e = false;
                        allow_decimal = false;
                    }
                }

                return [c, 'TK_WORD'];
            }

            if (acorn.isIdentifierStart(input.charCodeAt(parser_pos-1))) {
                if (parser_pos < input_length) {
                    while (acorn.isIdentifierChar(input.charCodeAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos === input_length) {
                            break;
                        }
                    }
                }

                if (!(last_token.type === 'TK_DOT' ||
                        (last_token.type === 'TK_RESERVED' && in_array(last_token.text, ['set', 'get'])))
                    && in_array(c, reserved_words)) {
                    if (c === 'in') { // hack for 'in' operator
                        return [c, 'TK_OPERATOR'];
                    }
                    return [c, 'TK_RESERVED'];
                }

                return [c, 'TK_WORD'];
            }

            if (c === '(' || c === '[') {
                return [c, 'TK_START_EXPR'];
            }

            if (c === ')' || c === ']') {
                return [c, 'TK_END_EXPR'];
            }

            if (c === '{') {
                return [c, 'TK_START_BLOCK'];
            }

            if (c === '}') {
                return [c, 'TK_END_BLOCK'];
            }

            if (c === ';') {
                return [c, 'TK_SEMICOLON'];
            }

            if (c === '/') {
                var comment = '';
                // peek for comment /* ... */
                var inline_comment = true;
                if (input.charAt(parser_pos) === '*') {
                    parser_pos += 1;
                    if (parser_pos < input_length) {
                        while (parser_pos < input_length && !(input.charAt(parser_pos) === '*' && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === '/')) {
                            c = input.charAt(parser_pos);
                            comment += c;
                            if (c === "\n" || c === "\r") {
                                inline_comment = false;
                            }
                            parser_pos += 1;
                            if (parser_pos >= input_length) {
                                break;
                            }
                        }
                    }
                    parser_pos += 2;
                    if (inline_comment && n_newlines === 0) {
                        return ['/*' + comment + '*/', 'TK_INLINE_COMMENT'];
                    } else {
                        return ['/*' + comment + '*/', 'TK_BLOCK_COMMENT'];
                    }
                }
                // peek for comment // ...
                if (input.charAt(parser_pos) === '/') {
                    comment = c;
                    while (input.charAt(parser_pos) !== '\r' && input.charAt(parser_pos) !== '\n') {
                        comment += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            break;
                        }
                    }
                    return [comment, 'TK_COMMENT'];
                }

            }

            if (c === '`' || c === "'" || c === '"' || // string
                (
                    (c === '/') || // regexp
                    (opts.e4x && c === "<" && input.slice(parser_pos - 1).match(/^<([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*\/?\s*>/)) // xml
                ) && ( // regex and xml can only appear in specific locations during parsing
                    (last_token.type === 'TK_RESERVED' && in_array(last_token.text , ['return', 'case', 'throw', 'else', 'do', 'typeof', 'yield'])) ||
                    (last_token.type === 'TK_END_EXPR' && last_token.text === ')' &&
                        last_token.parent && last_token.parent.type === 'TK_RESERVED' && in_array(last_token.parent.text, ['if', 'while', 'for'])) ||
                    (in_array(last_token.type, ['TK_COMMENT', 'TK_START_EXPR', 'TK_START_BLOCK',
                        'TK_END_BLOCK', 'TK_OPERATOR', 'TK_EQUALS', 'TK_EOF', 'TK_SEMICOLON', 'TK_COMMA'
                    ]))
                )) {

                var sep = c,
                    esc = false,
                    has_char_escapes = false;

                resulting_string = c;

                if (sep === '/') {
                    //
                    // handle regexp
                    //
                    var in_char_class = false;
                    while (parser_pos < input_length &&
                            ((esc || in_char_class || input.charAt(parser_pos) !== sep) &&
                            !acorn.newline.test(input.charAt(parser_pos)))) {
                        resulting_string += input.charAt(parser_pos);
                        if (!esc) {
                            esc = input.charAt(parser_pos) === '\\';
                            if (input.charAt(parser_pos) === '[') {
                                in_char_class = true;
                            } else if (input.charAt(parser_pos) === ']') {
                                in_char_class = false;
                            }
                        } else {
                            esc = false;
                        }
                        parser_pos += 1;
                    }
                } else if (opts.e4x && sep === '<') {
                    //
                    // handle e4x xml literals
                    //
                    var xmlRegExp = /<(\/?)([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*(\/?)\s*>/g;
                    var xmlStr = input.slice(parser_pos - 1);
                    var match = xmlRegExp.exec(xmlStr);
                    if (match && match.index === 0) {
                        var rootTag = match[2];
                        var depth = 0;
                        while (match) {
                            var isEndTag = !! match[1];
                            var tagName = match[2];
                            var isSingletonTag = ( !! match[match.length - 1]) || (tagName.slice(0, 8) === "![CDATA[");
                            if (tagName === rootTag && !isSingletonTag) {
                                if (isEndTag) {
                                    --depth;
                                } else {
                                    ++depth;
                                }
                            }
                            if (depth <= 0) {
                                break;
                            }
                            match = xmlRegExp.exec(xmlStr);
                        }
                        var xmlLength = match ? match.index + match[0].length : xmlStr.length;
                        parser_pos += xmlLength - 1;
                        return [xmlStr.slice(0, xmlLength), "TK_STRING"];
                    }
                } else {
                    //
                    // handle string
                    //
                    // Template strings can travers lines without escape characters.
                    // Other strings cannot
                    while (parser_pos < input_length &&
                            (esc || (input.charAt(parser_pos) !== sep &&
                            (sep === '`' || !acorn.newline.test(input.charAt(parser_pos)))))) {
                        resulting_string += input.charAt(parser_pos);
                        if (esc) {
                            if (input.charAt(parser_pos) === 'x' || input.charAt(parser_pos) === 'u') {
                                has_char_escapes = true;
                            }
                            esc = false;
                        } else {
                            esc = input.charAt(parser_pos) === '\\';
                        }
                        parser_pos += 1;
                    }

                }

                if (has_char_escapes && opts.unescape_strings) {
                    resulting_string = unescape_string(resulting_string);
                }

                if (parser_pos < input_length && input.charAt(parser_pos) === sep) {
                    resulting_string += sep;
                    parser_pos += 1;

                    if (sep === '/') {
                        // regexps may have modifiers /regexp/MOD , so fetch those, too
                        // Only [gim] are valid, but if the user puts in garbage, do what we can to take it.
                        while (parser_pos < input_length && acorn.isIdentifierStart(input.charCodeAt(parser_pos))) {
                            resulting_string += input.charAt(parser_pos);
                            parser_pos += 1;
                        }
                    }
                }
                return [resulting_string, 'TK_STRING'];
            }

            if (c === '#') {

                if (tokens.length === 0 && input.charAt(parser_pos) === '!') {
                    // shebang
                    resulting_string = c;
                    while (parser_pos < input_length && c !== '\n') {
                        c = input.charAt(parser_pos);
                        resulting_string += c;
                        parser_pos += 1;
                    }
                    return [trim(resulting_string) + '\n', 'TK_UNKNOWN'];
                }



                // Spidermonkey-specific sharp variables for circular references
                // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
                // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
                var sharp = '#';
                if (parser_pos < input_length && digit.test(input.charAt(parser_pos))) {
                    do {
                        c = input.charAt(parser_pos);
                        sharp += c;
                        parser_pos += 1;
                    } while (parser_pos < input_length && c !== '#' && c !== '=');
                    if (c === '#') {
                        //
                    } else if (input.charAt(parser_pos) === '[' && input.charAt(parser_pos + 1) === ']') {
                        sharp += '[]';
                        parser_pos += 2;
                    } else if (input.charAt(parser_pos) === '{' && input.charAt(parser_pos + 1) === '}') {
                        sharp += '{}';
                        parser_pos += 2;
                    }
                    return [sharp, 'TK_WORD'];
                }
            }

            if (c === '<' && input.substring(parser_pos - 1, parser_pos + 3) === '<!--') {
                parser_pos += 3;
                c = '<!--';
                while (input.charAt(parser_pos) !== '\n' && parser_pos < input_length) {
                    c += input.charAt(parser_pos);
                    parser_pos++;
                }
                in_html_comment = true;
                return [c, 'TK_COMMENT'];
            }

            if (c === '-' && in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === '-->') {
                in_html_comment = false;
                parser_pos += 2;
                return ['-->', 'TK_COMMENT'];
            }

            if (c === '.') {
                return [c, 'TK_DOT'];
            }

            if (in_array(c, punct)) {
                while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input_length) {
                        break;
                    }
                }

                if (c === ',') {
                    return [c, 'TK_COMMA'];
                } else if (c === '=') {
                    return [c, 'TK_EQUALS'];
                } else {
                    return [c, 'TK_OPERATOR'];
                }
            }

            return [c, 'TK_UNKNOWN'];
        }


        function unescape_string(s) {
            var esc = false,
                out = '',
                pos = 0,
                s_hex = '',
                escaped = 0,
                c;

            while (esc || pos < s.length) {

                c = s.charAt(pos);
                pos++;

                if (esc) {
                    esc = false;
                    if (c === 'x') {
                        // simple hex-escape \x24
                        s_hex = s.substr(pos, 2);
                        pos += 2;
                    } else if (c === 'u') {
                        // unicode-escape, \u2134
                        s_hex = s.substr(pos, 4);
                        pos += 4;
                    } else {
                        // some common escape, e.g \n
                        out += '\\' + c;
                        continue;
                    }
                    if (!s_hex.match(/^[0123456789abcdefABCDEF]+$/)) {
                        // some weird escaping, bail out,
                        // leaving whole string intact
                        return s;
                    }

                    escaped = parseInt(s_hex, 16);

                    if (escaped >= 0x00 && escaped < 0x20) {
                        // leave 0x00...0x1f escaped
                        if (c === 'x') {
                            out += '\\x' + s_hex;
                        } else {
                            out += '\\u' + s_hex;
                        }
                        continue;
                    } else if (escaped === 0x22 || escaped === 0x27 || escaped === 0x5c) {
                        // single-quote, apostrophe, backslash - escape these
                        out += '\\' + String.fromCharCode(escaped);
                    } else if (c === 'x' && escaped > 0x7e && escaped <= 0xff) {
                        // we bail out on \x7f..\xff,
                        // leaving whole string escaped,
                        // as it's probably completely binary
                        return s;
                    } else {
                        out += String.fromCharCode(escaped);
                    }
                } else if (c === '\\') {
                    esc = true;
                } else {
                    out += c;
                }
            }
            return out;
        }

    }


    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return { js_beautify: js_beautify };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var js_beautify = require("beautify").js_beautify`.
        exports.js_beautify = js_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.js_beautify = js_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.js_beautify = js_beautify;
    }

}());

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
var filesystem = require('../../file-system');
var watcher = require('../../file-system-watcher');
var utils = require('../../../../shared/utils');

module.exports = function($stateProvider, $locationProvider, $urlRouterProvider) {

  //$locationProvider.html5Mode(true);

  // For any unmatched url, redirect to /
  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('app', {
      abstract: true,
      controller: 'AppCtrl',
      templateUrl: '/client/app/views/index.html',
      resolve: {
        fsPromise: ['$q',
          function($q) {
            var deferred = $q.defer();
            filesystem.on('connection', function() {
              deferred.resolve(filesystem);
            });
            return deferred.promise;
          }
        ],
        fsWatcherPromise: ['$q',
          function($q) {
            var deferred = $q.defer();
            watcher.on('connection', function() {
              deferred.resolve(watcher);
            });
            return deferred.promise;
          }
        ]
      }
    })
    .state('app.home', {
      url: '',
      templateUrl: '/client/app/views/app.html'
    });

  function registerDbStates($stateProvider) {

    $stateProvider
      .state('db', {
        url: '/db',
        controller: 'DbCtrl',
        templateUrl: '/html/db.html'
      })
      .state('db.model', {
        abstract: true,
        url: '/:modelName',
        controller: 'ModelCtrl',
        templateUrl: '/html/model.html',
        resolve: {
          modelPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return $http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('db.model.edit', {
        url: '', // Default. Will be used in place of abstract parent in the case of hitting the index (db.model/)
        templateUrl: '/html/model-editor.html'
      })
      .state('db.model.schema', {
        url: '/:schemaId',
        views: {
          '@db.model': { // Target the ui-view='' in parent state 'db.model'
            controller: 'SchemaCtrl',
            templateUrl: '/html/schema.html'
          }
        }
      })
      .state('db.model.schema.key', {
        url: '/:keyId',
        views: {
          '@db.model': { // Target the ui-view='' in parent state 'db.model'
            controller: 'KeyCtrl',
            templateUrl: '/html/key.html'
          }
        }
      })
      .state('db.model.diagram', {
        url: '#diagram',
        views: {
          '@db.model': { // Target the ui-view='' in parent state 'db.model'
            //controller: 'DiagramCtrl',
            templateUrl: '/html/db-diagram.html'
          }
        }
      });

  }

  function registerApiStates($stateProvider) {

    $stateProvider
      .state('api', {
        abstract: true,
        url: '/api/:apiName',
        controller: 'ApiCtrl',
        templateUrl: '/html/api/api.html',
        resolve: {
          apiPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return window._api; //$http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('api.home', {
        url: '', // Default. Will be used in place of abstract parent in the case of hitting the index (api/)
        templateUrl: '/html/api/api-home.html'
      })
      .state('api.diagram', {
        url: '/diagram',
        controller: 'ApiDiagramCtrl',
        templateUrl: '/html/api/diagram.html'
      })
      .state('api.controller', {
        abstract: true,
        url: '/controller'
      })
      .state('api.controller.home', {
        url: '',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            templateUrl: '/html/api/controller-home.html'
          }
        }
      })
      .state('api.controller.item', {
        url: '/:controllerId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiControllerCtrl',
            templateUrl: '/html/api/controller.html'
          }
        }
      })
      .state('api.controller.item.handler', {
        url: '/:handlerId',
        views: {
          'x@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiHandlerCtrl',
            templateUrl: '/html/api/handler.html'
          },
          'handler@api.controller.item': { // Target the ui-view='handler' in parent state 'api.controller.item',
            controller: 'ApiHandlerCtrl',
            templateUrl: '/html/api/handler.html'
          }
        }
      })
      .state('api.route', {
        abstract: true,
        url: '/route'
      })
      .state('api.route.home', {
        url: '',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            templateUrl: '/html/api/route-home.html'
          }
        }
      })
      .state('api.route.item', {
        url: '/:routeId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiRouteCtrl',
            templateUrl: '/html/api/route.html'
          }
        }
      })
      .state('api.route.item.action', {
        url: '/:actionId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiActionCtrl',
            templateUrl: '/html/api/action.html'
          }
        }
      });

  }

};

},{"../../../../shared/utils":42,"../../file-system":27,"../../file-system-watcher":26}],8:[function(require,module,exports){
var AppModel = require('../models/app');
var FileSystemObject = require('../../../../shared/file-system-object');
var utils = require('../../../../shared/utils');
var parseCookie = require('cookie').parse;

module.exports = function($scope, $state, fs, watcher, fileService, dialog, colorService, sessionService) {

  var model = new AppModel({
    fs: fs,
    watcher: watcher,
    sessionService: sessionService,
    recentFiles: angular.fromJson(parseCookie(document.cookie).recentFiles)
  });

  $scope.model = model;

  // Listen out for changes to the file system
  watcher.on('change', function() {
    $scope.model = model;
    console.log('fs change');
    $scope.$apply();
  });

  var packageFile = model.packageFile;
  if (packageFile) {
    fileService.readFile(packageFile.path).then(function(res) {
      model.package = res;
    });
  }

  var readmeFile = model.readmeFile;
  if (readmeFile) {
    fileService.readFile(readmeFile.path).then(function(res) {
      model.readme = res;
    });
  }

  $scope.onSearchFormSubmit = function() {
    $state.go('app.fs.search', {
      q: searchForm.q.value
    });
  };
  //
  // $scope.fileUrl = function(file) {
  //   return $state.href('app.fs.finder.file', {
  //     path: utils.encodeString(file.path || file)
  //   });
  // };

  $scope.gotoFile = function(file) {
    return $state.transitionTo('app.fs.finder.file', {
      path: utils.encodeString(file.path || file)
    });
  };

  $scope.fileParams = function(file) {
    return {
      path: utils.encodeString(file.path)
    };
  };


  $scope.dirUrl = function(dir) {
    return $state.href('app.fs.finder', {
      path: utils.encodeString(dir.path)
    });
  };

  // Color function used to create deterministic colors from a string
  $scope.color = function(item) {
    var str = (item instanceof FileSystemObject) ? item.ext : item;
    return str ? '#' + colorService(str).hex() : '';
  };
  $scope.colorText = function(item) {
    var str = (item instanceof FileSystemObject) ? item.ext : item;
    return str ? '#' + colorService(str).readable().hex() : '';
  };

  function saveSession(session, callback) {
    var path = session.path;
    var editSession = session.data;
    var contents = editSession.getValue();

    console.log('writeFile', path);

    fs.writeFile(path, contents, function(rsp) {

      if (rsp.err) {

        dialog.alert({
          title: 'File System Write Error',
          message: JSON.stringify(rsp.err)
        });

        callback(rsp.err);
        console.log('writeFile Failed', path, rsp.err);

      } else {

        console.log('writeFile Succeeded', path);

        session.markClean();

        if (callback) {
          callback(null, session);
        }

        $scope.$apply();
      }
    });
  }


  $scope.saveSession = function(session) {
    saveSession(session);
  };
  $scope.saveAllSessions = function() {
    var sessions = sessionService.dirty;

    sessions.forEach(function(item) {
      saveSession(item);
    });
  };

  $scope.removeRecentFile = function(entry) {

    // find related session
    var sessions = model.sessions;
    var session = sessions.findSession(entry.path);
    if (session) {

      if (session.isDirty) {

        dialog.confirm({
          title: 'Save File',
          message: 'File has changed. Would you like to Save [' + model.getRelativePath(session.path) + ']',
          okButtonText: 'Yes',
          cancelButtonText: 'No'
        }).then(function() {
          saveSession(session, function(err, session) {
            if (!err) {
              model.removeRecentFile(entry);
              sessions.removeSession(session);
              $scope.$broadcast('recent-removed', entry);
            }
          });
        }, function(value) {
          console.log('Remove recent (save) modal dismissed', value);
          // Check if clicked 'No', otherwise do nothing
          if (value === 'cancel') {
            model.removeRecentFile(entry);
            sessions.removeSession(session);
            $scope.$broadcast('recent-removed', entry);
          }
        });

        return;
      }

      sessions.removeSession(session);

    }

    model.removeRecentFile(entry);
    $scope.$broadcast('recent-removed', entry);

  };


  window.onbeforeunload = function() {
    if (sessionService.dirty.length) {
      return 'You have unsaved changes. Are you sure you want to leave.';
    }
  };

  $scope.encodePath = utils.encodeString;
  $scope.decodePath = utils.decodeString;
};
},{"../../../../shared/file-system-object":41,"../../../../shared/utils":42,"../models/app":12,"cookie":1}],9:[function(require,module,exports){
module.exports = function ($timeout) {
  return function($scope, $element, attrs) {
    $scope.$watch(attrs.ngScrolledIntoView, function(value) {
      if (value) {
        var el = $element[0];
        
        $timeout(function() {
          var active = el.querySelector('.active');
          var centerOfActiveEl = active.offsetLeft + (active.offsetWidth / 2);
          var leftBoundary = el.scrollLeft;
          var rightBoundary = leftBoundary + el.offsetWidth;

          if (centerOfActiveEl < leftBoundary || centerOfActiveEl > rightBoundary) {
            el.scrollLeft = active.offsetLeft - (el.offsetWidth / 2) + (active.offsetWidth / 2);
          }
          
        }, 100);
        
      }
    });
  };
};

},{}],10:[function(require,module,exports){
module.exports = function($parse) {
  return function($scope, $element, attrs) {
    var fn = $parse(attrs.ngScrolledLeft);
    var el = $element[0];

    $scope.$watch(function() {
      el.scrollLeft = el.scrollWidth;
    });

  };
};

},{}],11:[function(require,module,exports){
// var filesystem = require('../file-system');
// var watcher = require('../file-system-watcher');
// var utils = require('../../../shared/utils');

// Load Module Dependencies
require('../dialog');
require('../fs');

var mod = require('./module');
mod.value('$anchorScroll', angular.noop);
mod.service('FileService', [
  '$q',
  require('./services/file')
]);

mod.service('ResponseHandler', [
  'DialogService',
  require('./services/response-handler')
]);

mod.service('ColorService', [
  require('./services/color')
]);

mod.controller('AppCtrl', [
  '$scope',
  '$state',
  'fsPromise',
  'fsWatcherPromise',
  'FileService',
  'DialogService',
  'ColorService',
  'SessionService',
  require('./controllers')
]);

// ACE Global Defaults
mod.run(['uiAceConfig',
  function(uiAceConfig) {
    uiAceConfig.ace = {};
    angular.extend(uiAceConfig.ace, {
      useSoftTabs: true,
      tabSize: 2,
      useWrapMode: false,
      showPrintMargin: false,
      showGutter: true,
      // setAutoScrollEditorIntoView: true,
      // maxLines: 600,
      // minLines: 15,
      mode: 'javascript',
      require: ['ace/ext/language_tools'],
      advanced: {
        enableSnippets: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
      }
    });
  }
]);

mod.config([
  '$stateProvider',
  '$locationProvider',
  '$urlRouterProvider',
  require('./config')
]);

mod.config( ['$compileProvider', function($compileProvider){
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob):|data:image\/)/);
}]);

mod.directive('ngScrolled', [
  '$parse',
  require('./directives/scrolled')
]);

mod.directive('ngScrolledIntoView', [
  '$timeout',
  require('./directives/scrolled-into-view')
]);

module.exports = mod;

},{"../dialog":23,"../fs":35,"./config":7,"./controllers":8,"./directives/scrolled":10,"./directives/scrolled-into-view":9,"./module":13,"./services/color":14,"./services/file":15,"./services/response-handler":16}],12:[function(require,module,exports){
var p = require('path');
var utils = require('../../../../shared/utils');
var cookie = require('cookie');

function AppModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;
  this.sessions = data.sessionService;

  this.title = 'Title';
  this.subTitle = 'Subtitle';

  this._recentFiles = data.recentFiles || [];
}
AppModel.prototype.addRecentFile = function(file) {
  var recent = this._recentFiles;
  var idx = recent.findIndex(function(item) {
    return item.path === file.path;
  });
  if (idx !== -1) {
    recent.move(idx, 0);
  } else {
    recent.unshift({
      path: file.path,
      time: Date.now()
    });
    recent.length = Math.min(this._recentFiles.length, 20);
  }

  this.storeRecentFiles();
};
AppModel.prototype.removeRecentFile = function(entry) {
  var recent = this._recentFiles;
  var idx = recent.indexOf(entry);

  if (idx !== -1) {
    recent.splice(idx, 1);
    this.storeRecentFiles();
    return true;
  }
  return false;
};
AppModel.prototype.storeRecentFiles = function() {
  var cookieExpires = new Date();
  cookieExpires.setFullYear(cookieExpires.getFullYear() + 1);

  document.cookie = cookie.serialize('recentFiles', angular.toJson(this.recentFiles), {
    expires: cookieExpires
  });
};
AppModel.prototype.countFiles = function(ext) {
  return this.list.filter(function(item) {
    return !item.isDirectory && item.ext === ext;
  }).length;
};
AppModel.prototype.clearRecentFiles = function() {
  this._recentFiles.length = 0;
  this.storeRecentFiles();
};
AppModel.prototype.getRelativePath = function(path) {
  return p.relative(this.tree.dir, path);
};
AppModel.prototype._readDependencies = function(dev) {
  var deps = [];
  var packageJSON = this._packageJSON;
  if (packageJSON) {
    var depKey = packageJSON[dev ? 'devDependencies' : 'dependencies'];
    var keys = Object.keys(depKey);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var version = depKey[name];
      deps.push({
        name: name,
        version: version
      });
    }
  }
  return deps;
};
Object.defineProperties(AppModel.prototype, {
  map: {
    get: function() {
      return this.watcher.map;
    }
  },
  list: {
    get: function() {
      return this.watcher.list;
    }
  },
  tree: {
    get: function() {
      return this.watcher.tree[0].children[0];
    }
  },
  recentFiles: {
    get: function() {
      var recent = this._recentFiles;

      // clean any files that may no longer exist
      var i = recent.length;
      while (i--) {
        if (!this.map[recent[i].path]) {
          recent.splice(i, 1);
        }
      }
      return recent;
    }
  },
  jsCount: {
    get: function() {
      return this.countFiles('.js');
    }
  },
  cssCount: {
    get: function() {
      return this.countFiles('.css');
    }
  },
  htmlCount: {
    get: function() {
      return this.countFiles('.html');
    }
  },
  totalCount: {
    get: function() {
      return this.list.length;
    }
  },
  package: {
    get: function() {
      return this._package;
    },
    set: function(value) {
      this._package = value;
      this._packageJSON = JSON.parse(value.contents);
      this._dependencies = this._readDependencies();
      this._devDependencies = this._readDependencies(true);
    }
  },
  packageFile: {
    get: function() {
      return this.tree.children.find(function(item) {
        return item.name.toLowerCase() === 'package.json';
      });
    }
  },
  hasPackageFile: {
    get: function() {
      return !!this.packageFile;
    }
  },
  dependencies: {
    get: function() {
      return this._dependencies;
    }
  },
  devDependencies: {
    get: function() {
      return this._devDependencies;
    }
  },
  readme: {
    get: function() {
      return this._readme;
    },
    set: function(value) {
      this._readme = value;
    }
  },
  readmeFile: {
    get: function() {
      return this.tree.children.find(function(item) {
        return /^readme.(md|markdown)$/.test(item.name.toLowerCase());
      });
    }
  },
  hasReadmeFile: {
    get: function() {
      return !!this.readmeFile;
    }
  }
});

module.exports = AppModel;

},{"../../../../shared/utils":42,"cookie":1,"path":43}],13:[function(require,module,exports){
module.exports = angular.module('app', [
  'ui.router',
  'ui.bootstrap',
  'ui.ace',
  'evgenyneu.markdown-preview',
  'michiKono',
  'dialog',
  'fs'
]);

},{}],14:[function(require,module,exports){
/**
 * colorTag v 0.1
 * by Ryan Quinn
 * https://github.com/mazondo/colorTag
 *
 * colorTag is used to generate a random color from a given string
 * The goal is to create deterministic, usable colors for the purpose
 * of adding color coding to tags
*/

function colorTag(tagString) {
	// were we given a string to work with?  If not, then just return false
	if (!tagString) {
		return false;
	}

	/**
	 * Return sthe luminosity difference between 2 rgb values
	 * anything greater than 5 is considered readable
	 */
	function luminosityDiff(rgb1, rgb2) {
  		var l1 = 0.2126 + Math.pow(rgb1.r/255, 2.2) +
  				 0.7152 * Math.pow(rgb1.g/255, 2.2) +
  				 0.0722 * Math.pow(rgb1.b/255, 2.2),
  			l2 = 0.2126 + Math.pow(rgb2.r/255, 2.2) +
  				 0.7152 * Math.pow(rgb2.g/255, 2.2) +
  				 0.0722 * Math.pow(rgb2.b/255, 2.2);

  		if (l1 > l2) {
  			return (l1 + 0.05) / (l2 + 0.05);
  		} else {
  			return (l2 + 0.05) / (l1 + 0.05);
  		}
	}

	/**
	 * This is the definition of a color for our purposes.  We've abstracted it out
	 * so that we can return new color objects when required
	*/
	function color(hexCode) {
		//were we given a hashtag?  remove it.
		var hexCode = hexCode.replace("#", "");
		return {
			/**
			 * Returns a simple hex string including hashtag
			 * of the color
			 */
			hex: function() {
				return hexCode;
			},

			/**
			 * Returns an RGB breakdown of the color provided
			 */
			rgb: function() {
				var bigint = parseInt(hexCode, 16);
				return {
					r: (bigint >> 16) & 255,
					g: (bigint >> 8) & 255,
					b: bigint & 255
				}
			},

			/**
			 * Given a list of hex color codes
			 * Determine which is the most readable
			 * We use the luminosity equation presented here:
			 * http://www.splitbrain.org/blog/2008-09/18-calculating_color_contrast_with_php
			 */
			readable: function() {
				// this is meant to be simplistic, if you don't give me more than
				// one color to work with, you're getting white or black.
				var comparators = (arguments.length > 1) ? arguments : ["#E1E1E1", "#464646"],
					originalRGB = this.rgb(),
					brightest = { difference: 0 };

				for (var i = 0; i < comparators.length; i++) {
					//calculate the difference between the original color and the one we were given
					var c = color(comparators[i]),
						l = luminosityDiff(originalRGB, c.rgb());

					// if it's brighter than the current brightest, store it to compare against later ones
					if (l > brightest.difference) {
						brightest = {
							difference: l,
							color: c
						}
					}
				}

				// return the brighest color
				return brightest.color;
			}

		}
	}

	// create the hex for the random string
    var hash = 0;
    for (var i = 0; i < tagString.length; i++) {
        hash = tagString.charCodeAt(i) + ((hash << 5) - hash);
    }
    hex = ""
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        hex += ('00' + value.toString(16)).substr(-2);
    }

    return color(hex);
}


module.exports = function() {
  return colorTag;
};

},{}],15:[function(require,module,exports){
var filesystem = require('../../file-system');

module.exports = function($q) {
  return {
    readFile: function(file) {
      var deferred = $q.defer();

      filesystem.readFile(file, function(res) {
        if (res.err) {
          deferred.reject(res.err);
        } else {
          deferred.resolve(res.data);
        }
      });

      return deferred.promise;
    }
  };
};

},{"../../file-system":27}],16:[function(require,module,exports){
module.exports = function(dialog) {
  return {
    responseHandler: function(fn) {
      return function(rsp, showError) {
        showError = showError || true;
        if (rsp.err) {
          if (showError) {
            dialog.alert({
              title: 'Error',
              message: JSON.stringify(rsp.err)
            });
          }
        } else {
          fn(rsp.data);
        }
      };
    }
  };
};

},{}],17:[function(require,module,exports){
Array.prototype.move = function(oldIndex, newIndex) {

  if (isNaN(newIndex) || isNaN(oldIndex) || oldIndex < 0 || oldIndex >= this.length) {
    return;
  }

  if (newIndex < 0) {
    newIndex = this.length - 1;
  } else if (newIndex >= this.length) {
    newIndex = 0;
  }

  this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);

  return newIndex;
};

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  };
}

},{}],18:[function(require,module,exports){
module.exports={
  "editor": {
    "theme": "monokai",
    "tabSize": 2,
    "useSoftTabs": true,
    "highlightActiveLine": true,
    "showPrintMargin": false,
    "showGutter": true,
    "fontSize": "12px",
    "useWorker": true,
    "showInvisibles": true,
    "modes": {
      ".js": "ace/mode/javascript",
      ".css": "ace/mode/css",
      ".html": "ace/mode/html",
      ".htm": "ace/mode/html",
      ".ejs": "ace/mode/html",
      ".json": "ace/mode/json",
      ".md": "ace/mode/markdown",
      ".coffee": "ace/mode/coffee",
      ".jade": "ace/mode/jade",
      ".php": "ace/mode/php",
      ".py": "ace/mode/python",
      ".scss": "ace/mode/sass",
      ".txt": "ace/mode/text",
      ".typescript": "ace/mode/typescript",
      ".xml": "ace/mode/xml"
    }
  },
  "beautify": {
    "js": {
      "indent_size": 2,
      "indent_char": " ",
      "indent_level": 0,
      "indent_with_tabs": false,
      "preserve_newlines": true,
      "max_preserve_newlines": 3,
      "jslint_happy": false,
      "brace_style": "collapse",
      "keep_array_indentation": false,
      "keep_function_indentation": false,
      "space_before_conditional": true,
      "break_chained_methods": false,
      "eval_code": false,
      "unescape_strings": false,
      "wrap_line_length": 0
    },
    "css": {
      "indent_size": 2,
      "indent_char": " "
    },
    "html": {
      "indent_size": 2,
      "indent_char": " ",
      "brace_style": "collapse",
      "indent_scripts ": "normal"
    }
  }
}

},{}],19:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;

  $scope.ok = function() {
    $modalInstance.close();
  };
};

},{}],20:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;
  $scope.okButtonText = data.okButtonText || 'OK';
  $scope.cancelButtonText = data.cancelButtonText || 'Cancel';

  $scope.ok = function() {
    $modalInstance.close();
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};

},{}],21:[function(require,module,exports){
module.exports = {
  alert: require('./alert'),
  confirm: require('./confirm'),
  prompt: require('./prompt')
};

},{"./alert":19,"./confirm":20,"./prompt":22}],22:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;
  $scope.placeholder = data.placeholder;
  $scope.input = {
    value: data.defaultValue
  };

  $scope.ok = function() {
    $modalInstance.close($scope.input.value);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};

},{}],23:[function(require,module,exports){
var mod = require('./module');
var controllers = require('./controllers');

mod.controller('AlertCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  controllers.alert
]);

mod.controller('ConfirmCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  controllers.confirm
]);

mod.controller('PromptCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  controllers.prompt
]);

mod.service('DialogService', [
  '$modal',
  require('./services/dialog')
]);

module.exports = mod;

},{"./controllers":21,"./module":24,"./services/dialog":25}],24:[function(require,module,exports){
module.exports = angular.module('dialog', [
  'ui.bootstrap'
]);

},{}],25:[function(require,module,exports){
module.exports = function($modal) {

  var service = {};

  service.alert = function(data) {

    return $modal.open({
      templateUrl: '/client/dialog/views/alert.html',
      controller: 'AlertCtrl',
      resolve: {
        data: function() {
          return {
            title: data.title,
            message: data.message
          };
        }
      }
    }).result;

  };

  service.confirm = function(data) {

    return $modal.open({
      templateUrl: '/client/dialog/views/confirm.html',
      controller: 'ConfirmCtrl',
      resolve: {
        data: function() {
          return {
            title: data.title,
            message: data.message,
            okButtonText: data.okButtonText,
            cancelButtonText: data.cancelButtonText
          };
        }
      }
    }).result;

  };

  service.prompt = function(data) {

    return $modal.open({
      templateUrl: '/client/dialog/views/prompt.html',
      controller: 'PromptCtrl',
      resolve: {
        data: function() {
          return {
            title: data.title,
            message: data.message,
            defaultValue: data.defaultValue,
            placeholder: data.placeholder
          };
        }
      }
    }).result;

  };

  return service;

};

},{}],26:[function(require,module,exports){
var utils = require('../../shared/utils');
var FileSystemObject = require('../../shared/file-system-object');
var emitter = require('emitter-component');

/*
 * FileSystemWatcher constructor
 */
function FileSystemWatcher() {

  this._watched = {};

  this._list = null;
  this._tree = null;

  var socket = io.connect(utils.urlRoot() + '/fswatch');

  socket.on('connection', function(res) {

    var data = res.data;

    Object.keys(data).map(function(key) {
      this._watched[key] = new FileSystemObject(key, data[key].isDirectory);
    }, this);

    //utils.extend(this._watched, data);

    console.log('Watcher connection');

    this.emit('connection', this._watched);
    this.emit('change');

  }.bind(this));

  socket.on('add', function(res) {

    var data = res.data;
    var fso = new FileSystemObject(data.path, false);

    this._watched[data.path] = fso;

    console.log('Watcher add', fso);

    this.emit('add', fso);
    this.emit('change');

  }.bind(this));

  socket.on('addDir', function(res) {

    var data = res.data;
    var fso = new FileSystemObject(data.path, true);

    this._watched[fso.path] = fso;

    console.log('Watcher addDir', fso);

    this.emit('addDir', fso);
    this.emit('change');

  }.bind(this));

  socket.on('change', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    // check we got something
    if (fso) {

      console.log('Watcher change', fso);

      this.emit('modified', fso);
    }

  }.bind(this));

  socket.on('unlink', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    if (fso) {
      delete this._watched[data.path];

      console.log('Watcher unlink', fso);

      this.emit('unlink', fso);
      this.emit('change');
    }

  }.bind(this));

  socket.on('unlinkDir', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    if (fso) {
      delete this._watched[data.path];

      console.log('Watcher unlinkDir', fso);

      this.emit('unlinkDir', fso);
      this.emit('change');
    }

  }.bind(this));

  socket.on('error', function(res) {

    console.log('Watcher error', res.err);

    this.emit('error', res.err);

  }.bind(this));

  this._socket = socket;

  this.on('change', function() {
    this._list = null;
    this._tree = null;
  });

}
Object.defineProperties(FileSystemWatcher.prototype, {
  map: {
    get: function() {
      return this._watched;
    }
  },
  list: {
    get: function() {
      if (!this._list) {
        this._list = [];
        var keys = Object.keys(this._watched);
        for (var i = 0; i < keys.length; i++) {
          this._list.push(this._watched[keys[i]]);
        }
      }
      return this._list;
    }
  },
  tree: {
    get: function() {

      function treeify(list, idAttr, parentAttr, childrenAttr) {

        var treeList = [];
        var lookup = {};
        var path, obj;

        for (path in list) {

          obj = list[path];
          obj.label = obj.name;
          lookup[obj[idAttr]] = obj;
          obj[childrenAttr] = [];
        }

        for (path in list) {
          obj = list[path];
          var parent = lookup[obj[parentAttr]];
          if (parent) {
            obj.parent = parent;
            lookup[obj[parentAttr]][childrenAttr].push(obj);
          } else {
            treeList.push(obj);
          }
        }

        return treeList;

      }

      if (!this._tree) {
        this._tree = treeify(this._watched, 'path', 'dir', 'children');
      }

      return this._tree;
    }
  }
});
emitter(FileSystemWatcher.prototype);

var FileSystemWatcher = new FileSystemWatcher();

module.exports = FileSystemWatcher;

},{"../../shared/file-system-object":41,"../../shared/utils":42,"emitter-component":2}],27:[function(require,module,exports){
var utils = require('../../shared/utils');
var emitter = require('emitter-component');;

/*
 * FileSystem constructor
 */
function FileSystem(socket) {

  socket.on('mkdir', function(response) {
    this.emit('mkdir', response);
  }.bind(this));

  socket.on('mkfile', function(response) {
    this.emit('mkfile', response);
  }.bind(this));

  socket.on('copy', function(response) {
    this.emit('copy', response);
  }.bind(this));

  socket.on('rename', function(response) {
    this.emit('rename', response);
  }.bind(this));

  socket.on('remove', function(response) {
    this.emit('remove', response);
  }.bind(this));

  socket.on('readfile', function(response) {
    this.emit('readfile', response);
  }.bind(this));

  socket.on('writefile', function(response) {
    this.emit('writefile', response);
  }.bind(this));

  socket.on('connection', function(response) {
    this.emit('connection', response);
  }.bind(this));

  this._socket = socket;

}
FileSystem.prototype.mkdir = function(path, callback) {
  this._socket.emit('mkdir', path, callback);
};
FileSystem.prototype.mkfile = function(path, callback) {
  this._socket.emit('mkfile', path, callback);
};
FileSystem.prototype.copy = function(source, destination, callback) {
  this._socket.emit('copy', source, destination, callback);
};
FileSystem.prototype.rename = function(oldPath, newPath, callback) {
  this._socket.emit('rename', oldPath, newPath, callback);
};
FileSystem.prototype.remove = function(path, callback) {
  this._socket.emit('remove', path, callback);
};
FileSystem.prototype.readFile = function(path, callback) {
  this._socket.emit('readfile', path, callback);
};
FileSystem.prototype.writeFile = function(path, contents, callback) {
  this._socket.emit('writefile', path, contents, callback);
};

emitter(FileSystem.prototype);


var socket = io.connect(utils.urlRoot() + '/fs');

var fileSystem = new FileSystem(socket);

fileSystem.on('connection', function(data) {
  console.log('fs connected', data);
});


module.exports = fileSystem;
},{"../../shared/utils":42,"emitter-component":2}],28:[function(require,module,exports){
var filesystem = require('../../file-system');
var watcher = require('../../file-system-watcher');
var utils = require('../../../../shared/utils');
var EditSession = ace.require('ace/edit_session').EditSession;
var UndoManager = ace.require('ace/undomanager').UndoManager;

var modes = {
  ".js": "ace/mode/javascript",
  ".css": "ace/mode/css",
  ".scss": "ace/mode/scss",
  ".less": "ace/mode/less",
  ".html": "ace/mode/html",
  ".htm": "ace/mode/html",
  ".ejs": "ace/mode/html",
  ".json": "ace/mode/json",
  ".md": "ace/mode/markdown",
  ".coffee": "ace/mode/coffee",
  ".jade": "ace/mode/jade",
  ".php": "ace/mode/php",
  ".py": "ace/mode/python",
  ".sass": "ace/mode/sass",
  ".txt": "ace/mode/text",
  ".typescript": "ace/mode/typescript",
  ".xml": "ace/mode/xml"
};


module.exports = function($stateProvider) {

  $stateProvider
    .state('app.fs', {
      abstract: true
    })
    .state('app.fs.finder', {
      url: '/finder',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app'
          controller: 'FsFinderCtrl',
          templateUrl: '/client/fs/views/finder.html'
        }
      }
    })
    .state('app.fs.finder.file', {
      url: '/file/:path',
      controller: 'FsFileCtrl',
      templateUrl: '/client/fs/views/file.html',
      resolve: {
        session: ['$q', '$stateParams', 'FileService', 'SessionService', 'uiAceConfig',
          function($q, $stateParams, fileService, sessionService, aceConfig) {
            var deferred = $q.defer();
            var path = utils.decodeString($stateParams.path);

            console.log('Requested file ' + path);

            var session = sessionService.findSession(path);

            if (session) {

              console.log('Using found session.');
              deferred.resolve(session);

            } else {

              console.log('Reading file for new session.');
              fileService.readFile(path).then(function(file) {

                var isUtf8 = !(file.contents instanceof ArrayBuffer);

                var sessionData;
                if (isUtf8) {
                  sessionData = new EditSession(file.contents, modes[file.ext]);
                  sessionData.setTabSize(aceConfig.ace.tabSize);
                  sessionData.setUseSoftTabs(aceConfig.ace.useSoftTabs);
                  sessionData.setUndoManager(new UndoManager());
                } else {
                  sessionData = file.contents;
                }

                session = sessionService.addSession(path, sessionData, isUtf8);

                deferred.resolve(session);

              });
            }
            return deferred.promise;
          }
        ]
      }
    })
    .state('app.fs.search', {
      url: '/search?q',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app',
          controller: 'FsSearchCtrl',
          templateUrl: '/client/fs/views/search.html'
        }
      }
    })
    .state('app.fs.dir', {
      url: '/dir/:path',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app',
          controller: 'FsDirCtrl',
          templateUrl: '/client/fs/views/dir.html',
          resolve: {
            dir: ['$stateParams',
              function($stateParams) {
                var path = utils.decodeString($stateParams.path);
                return watcher.map[path];
              }
            ]
          }
        }
      }
    });

};

},{"../../../../shared/utils":42,"../../file-system":27,"../../file-system-watcher":26}],29:[function(require,module,exports){
module.exports = function($scope, dir, fileService) {
  $scope.dir = dir;
};

},{}],30:[function(require,module,exports){
module.exports = function($scope, $state, session, fileService) {
  var isUtf8 = session.isUtf8;

  var model = $scope.model;

  var file = model.map[session.path];

  // ensure the finder is set the the right fso
  $scope.finder.active = file;

  // Handle the case of the file being removed from recentFiles.
  $scope.$on('recent-removed', function(e, data) {
    if (data.path === file.path) { // this should always be the case
      if (model.recentFiles.length) {
        var mostRecentEntry = model.recentFiles[0];
        var mostRecentFile = model.map[mostRecentEntry.path];
        $scope.gotoFile(mostRecentFile);
      } else {
        $scope.$parent.showEditor = false;
        $scope.finder.active = model.map[file.dir];
        $state.go('app.fs.finder');
      }
    }
  });

  model.addRecentFile(file);

  function imgBlobUrl() {
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array(session.data);
    var blob = new Blob([arrayBufferView], {
      type: 'image/' + file.ext.substr(1)
    });
    var urlCreator = window.URL || window.webkitURL;
    var url = urlCreator.createObjectURL(blob);
    return url;
  }

  if (isUtf8) {

    $scope.viewer = 'ace';
    $scope.$parent.showEditor = true;
    $scope.$parent.editorSession = session.data;

    // if the editor exists, load the editSession we just assigned
    if ($scope.$parent.editor) {
      $scope.$parent.loadSession();
    }

  } else {

    $scope.viewer = '';
    $scope.$parent.showEditor = false;

    switch (file.ext) {
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.ico':
        $scope.viewer = 'img';
        $scope.imgUrl = imgBlobUrl();
        break;
    }
  }


};

},{}],31:[function(require,module,exports){
var p = require('path');
var filesystem = require('../../file-system');
var utils = require('../../../../shared/utils');
var FinderModel = require('../models/finder');

var beautifyConfig = require('../../config').beautify;
var beautify_js = require('js-beautify');
var beautify_css = require('js-beautify').css;
var beautify_html = require('js-beautify').html;

module.exports = function($scope, $state, $log, $q, dialog, fileService, responseHandler) {

  $scope.pasteBuffer = null;
  $scope.showEditor = false;

  $scope.aceLoaded = function(editor) {

    $scope.editor = editor;

    editor.commands.addCommands([{
      name: 'save',
      bindKey: {
        win: 'Ctrl-S',
        mac: 'Command-S'
      },
      exec: function(editor) {
        var editorSession = editor.getSession();
        var session = model.sessions.dirty.find(function(item) {
          return item.data === editorSession;
        });
        if (session) {
          $scope.saveSession(session);
        }
      },
      readOnly: false // this command should not apply in readOnly mode
    }, {
      name: 'saveall',
      bindKey: {
        win: 'Ctrl-Shift-S',
        mac: 'Command-Option-S'
      },
      exec: $scope.saveAllSessions,
      readOnly: false // this command should not apply in readOnly mode
    }, {
      name: 'help',
      bindKey: {
        win: 'Ctrl-H',
        mac: 'Command-H'
      },
      //exec: this._onHelp.bind(this),
      readOnly: true // this command should apply in readOnly mode
    }]);

    editor.commands.addCommands([{
      name: 'beautify',
      bindKey: {
        win: 'Ctrl-B',
        mac: 'Command-B'
      },
      exec: function(editor, line) {
        var cfg, fn;
        var fso = finder.active;

        switch (fso.ext) {
          case '.css':
          case '.less':
          case '.sass':
          case '.scss':
            {
              fn = beautify_css;
              cfg = beautifyConfig ? beautifyConfig.css : null;
            }
            break;
          case '.html':
            {
              fn = beautify_html;
              cfg = beautifyConfig ? beautifyConfig.html : null;
            }
            break;
          case '.js':
          case '.json':
            {
              fn = beautify_js;
              cfg = beautifyConfig ? beautifyConfig.js : null;
            }
            break;
        }

        if (fn) {
          editor.setValue(fn(editor.getValue(), cfg));
        }
      },
      readOnly: false // this command should not apply in readOnly mode
    }]);

    // load the editorSession if one has already been defined (like in child controller FileCtrl)
    if ($scope.editorSession) {
      $scope.loadSession();
    }

  };

  $scope.loadSession = function() {
    $scope.editor.setSession($scope.editorSession);
  };

  $scope.aceChanged = function(editor) {
    // Don't remove this. Simply handling this causes the $digest we want to update the UI
    console.log('Finder editor changed');
  };

  var path = $state.params.path ? utils.decodeString($state.params.path) : null;
  var model = $scope.model;

  var finder = new FinderModel(path ? model.list.find(function(item) {
    return item.path === path;
  }) : model.tree);

  $scope.finder = finder;

  function fileSystemCallback(response) {
    // notify of any errors, otherwise silent.
    // The File System Watcher will handle the state changes in the file system
    if (response.err) {
      dialog.alert({
        title: 'File System Error',
        message: JSON.stringify(response.err)
      });
    }
  }

  $scope.clickNode = function(fso) {

    finder.active = fso;

    if (fso.isFile) {
      $state.go('app.fs.finder.file', {
        path: utils.encodeString(fso.path)
      });
    }

  };

  $scope.delete = function(fso) {

    dialog.confirm({
      title: 'Delete ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Delete [' + fso.name + ']. Are you sure?'
    }).then(function() {
      filesystem.remove(fso.path, fileSystemCallback);
    }, function() {
      $log.info('Delete modal dismissed');
    });

  };

  $scope.rename = function(fso) {

    dialog.prompt({
      title: 'Rename ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Please enter a new name',
      defaultValue: fso.name,
      placeholder: fso.isDirectory ? 'Folder name' : 'File name'
    }).then(function(value) {
      var oldPath = fso.path;
      var newPath = p.resolve(fso.dir, value);
      filesystem.rename(oldPath, newPath, fileSystemCallback);
    }, function() {
      $log.info('Rename modal dismissed');
    });

  };

  $scope.mkfile = function(fso) {

    dialog.prompt({
      title: 'Add new file',
      placeholder: 'File name',
      message: 'Please enter the new file name'
    }).then(function(value) {
      filesystem.mkfile(p.resolve(fso.path, value), fileSystemCallback);
    }, function() {
      $log.info('Make file modal dismissed');
    });

  };

  $scope.mkdir = function(fso) {

    dialog.prompt({
      title: 'Add new folder',
      placeholder: 'Folder name',
      message: 'Please enter the new folder name'
    }).then(function(value) {
      filesystem.mkdir(p.resolve(fso.path, value), fileSystemCallback);
    }, function() {
      $log.info('Make directory modal dismissed');
    });

  };

  $scope.paste = function(fso) {

    var pasteBuffer = $scope.pasteBuffer;
    var pastePath = fso.isDirectory ? fso.path : fso.dir;

    if (pasteBuffer.op === 'copy') {
      filesystem.copy(pasteBuffer.fso.path, p.resolve(pastePath, pasteBuffer.fso.name), fileSystemCallback);
    } else if (pasteBuffer.op === 'cut') {
      filesystem.rename(pasteBuffer.fso.path, p.resolve(pastePath, pasteBuffer.fso.name), fileSystemCallback);
    }

    $scope.pasteBuffer = null;

  };

  $scope.showPaste = function(active) {
    var pasteBuffer = $scope.pasteBuffer;
    
    if (pasteBuffer) {
      var sourcePath = pasteBuffer.fso.path.toLowerCase();
      var sourceDir = pasteBuffer.fso.dir.toLowerCase();
      var destinationDir = (active.isDirectory ? active.path : active.dir).toLowerCase();
      var isDirectory = pasteBuffer.fso.isDirectory;
      
      if (!isDirectory) {
        // Always allow pasteing of a file unless it's a move operation (cut) and the destination dir is the same
        return pasteBuffer.op !== 'cut' || destinationDir !== sourceDir;
      } else {
        // Allow pasteing directories if not into self a decendent
        if (destinationDir.indexOf(sourcePath) !== 0) {
          // and  or if the operation is move (cut) the parent dir too
          return pasteBuffer.op !== 'cut' || destinationDir !== sourceDir;
        }
      }
    }
    return false;
  };

  $scope.setPasteBuffer = function(fso, op) {

    $scope.pasteBuffer = {
      fso: fso,
      op: op
    };

  };
};
},{"../../../../shared/utils":42,"../../config":18,"../../file-system":27,"../models/finder":36,"js-beautify":3,"path":43}],32:[function(require,module,exports){
module.exports = function($scope) {

};

},{}],33:[function(require,module,exports){
module.exports = function($scope, $state) {
  $scope.model.q = $state.params.q;
};

},{}],34:[function(require,module,exports){
var p = require('path');
var filesystem = require('../../file-system');

module.exports = function($scope, $modal, $log, dialog, responseHandler) {

  var expanded = Object.create(null);

  $scope.treeData = {
    showMenu: false
  };
  $scope.active = null;
  $scope.pasteBuffer = null;

  function genericFileSystemCallback(response) {
    // notify of any errors, otherwise silent.
    // The File System Watcher will handle the state changes in the file system
    if (response.err) {
      dialog.alert({
        title: 'File System Error',
        message: JSON.stringify(response.err)
      });
    }
  }

  $scope.getClassName = function(fso) {
    var classes = ['fso'];
    classes.push(fso.isDirectory ? 'dir' : 'file');

    if (fso === $scope.active) {
      classes.push('active');
    }

    return classes.join(' ');
  };

  $scope.getIconClassName = function(fso) {
    var classes = ['fa'];

    if (fso.isDirectory) {
      classes.push($scope.isExpanded(fso) ? 'fa-folder-open' : 'fa-folder');
    } else {
      classes.push('fa-file-o');
    }

    return classes.join(' ');
  };

  $scope.isExpanded = function(fso) {
    return !!expanded[fso.path];
  };

  $scope.rightClickNode = function(e, fso) {
    console.log('RClicked ' + fso.name);
    $scope.menuX = e.pageX;
    $scope.menuY = e.pageY;
    $scope.active = fso;
    $scope.treeData.showMenu = true;
  };

  $scope.clickNode = function(e, fso) {
    e.preventDefault();
    e.stopPropagation();

    $scope.active = fso;

    if (fso.isDirectory) {
      var isExpanded = $scope.isExpanded(fso);
      if (isExpanded) {
        delete expanded[fso.path];
      } else {
        expanded[fso.path] = true;
      }
    } else {
      $scope.open(fso);
    }

    return false;
  };

  $scope.delete = function(e, fso) {

    e.preventDefault();

    dialog.confirm({
      title: 'Delete ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Delete [' + fso.name + ']. Are you sure?'
    }).then(function() {
      filesystem.remove(fso.path, genericFileSystemCallback);
    }, function() {
      $log.info('Delete modal dismissed');
    });

  };

  $scope.rename = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Rename ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Please enter a new name',
      defaultValue: fso.name,
      placeholder: fso.isDirectory ? 'Folder name' : 'File name'
    }).then(function(value) {
      var oldPath = fso.path;
      var newPath = p.resolve(fso.dir, value);
      filesystem.rename(oldPath, newPath, genericFileSystemCallback);
    }, function() {
      $log.info('Rename modal dismissed');
    });

  };

  $scope.mkfile = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Add new file',
      placeholder: 'File name',
      message: 'Please enter the new file name'
    }).then(function(value) {
      filesystem.mkfile(p.resolve(fso.path, value), genericFileSystemCallback);
    }, function() {
      $log.info('Make file modal dismissed');
    });

  };

  $scope.mkdir = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Add new folder',
      placeholder: 'Folder name',
      message: 'Please enter the new folder name'
    }).then(function(value) {
      filesystem.mkdir(p.resolve(fso.path, value), genericFileSystemCallback);
    }, function() {
      $log.info('Make directory modal dismissed');
    });

  };

  $scope.paste = function(e, fso) {

    e.preventDefault();

    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer.op === 'copy') {
      filesystem.copy(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    } else if (pasteBuffer.op === 'cut') {
      filesystem.rename(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    }

    $scope.pasteBuffer = null;

  };

  $scope.showPaste = function(e, active) {
    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer && active.isDirectory) {
      if (!pasteBuffer.fso.isDirectory) {
        return true;
      } else if (active.path.toLowerCase().indexOf(pasteBuffer.fso.path.toLowerCase()) !== 0) { // disallow pasting into self or a decendent
        return true;
      }
    }
    return false;
  };

  $scope.setPasteBuffer = function(e, fso, op) {

    e.preventDefault();

    $scope.pasteBuffer = {
      fso: fso,
      op: op
    };

  };

};

},{"../../file-system":27,"path":43}],35:[function(require,module,exports){
var mod = require('./module');

mod.config([
  '$stateProvider',
  require('./config')
]);

mod.service('SessionService', [
  require('./services/session')
]);

mod.controller('FsCtrl', [
  '$scope',
  require('./controllers')
]);

mod.controller('FsFinderCtrl', [
  '$scope',
  '$state',
  '$log',
  '$q',
  'DialogService',
  'FileService',
  'ResponseHandler',
  require('./controllers/finder')
]);

mod.controller('FsFileCtrl', [
  '$scope',
  '$state',
  'session',
  'FileService',
  require('./controllers/file')
]);

mod.controller('FsSearchCtrl', [
  '$scope',
  '$state',
  require('./controllers/search')
]);

mod.controller('FsDirCtrl', [
  '$scope',
  'dir',
  'FileService',
  require('./controllers/dir')
]);

mod.controller('FsTreeCtrl', [
  '$scope',
  '$modal',
  '$log',
  'DialogService',
  'ResponseHandler',
  require('./controllers/tree')
]);

module.exports = mod;

},{"./config":28,"./controllers":32,"./controllers/dir":29,"./controllers/file":30,"./controllers/finder":31,"./controllers/search":33,"./controllers/tree":34,"./module":38,"./services/session":39}],36:[function(require,module,exports){
function FinderModel(active) {
  // this.tree = tree;
  this.active = active;
}
FinderModel.prototype._readCols = function(tree) {

  //var tree = this._tree;
  var active = this._active;
  //var activeIsDir = active.isDirectory;

  var cols = [];

  if (active) {

    var curr = active.isDirectory ? active : active.parent;
    do {
      cols.unshift(curr.children);
      curr = curr.parent;
    } while (curr);

    cols.shift();

  } else {
    cols.push(tree.children);
  }

  return cols;

};
FinderModel.prototype.getClassName = function(fso) {
  var classes = ['fso'];
  classes.push(fso.isDirectory ? 'dir' : 'file');

  if (fso === this.active) {
    classes.push('active');
  }

  return classes.join(' ');
};
FinderModel.prototype.getIconClassName = function(fso) {
  var classes = ['fa'];

  if (fso.isDirectory) {
    classes.push(this.isExpanded(fso) ? 'fa-folder-open-o' : 'fa-folder-o');
  } else {
    classes.push('fa-file');
  }

  return classes.join(' ');
};
FinderModel.prototype.isHighlighted = function(fso) {
  var active = this._active;
  var isHighlighted = false;

  if (fso === active) {
    return true;
  } else if (active && fso.isDirectory) {
    // check if it is an ancestor
    var r = active;
    while (r.parent) {
      if (r === fso) {
        return true;
      }
      r = r.parent;
    }
  }

  return false;
};
FinderModel.prototype.isExpanded = function(dir) {
  return this.isHighlighted(dir);
};
FinderModel.prototype.cols = function(tree) {
  return this._readCols(tree);
};


Object.defineProperties(FinderModel.prototype, {
  active: {
    get: function() {
      return this._active;
    },
    set: function(value) {
      this._active = value;
      if (this._active.isFile) {
        this._activeFile = this._active;
      }
    }
  },
  activeFile: {
    get: function() {
      return this._activeFile;
    }
  }
});


module.exports = FinderModel;

},{}],37:[function(require,module,exports){
function Session(data) {
  data = data || {};
  this.path = data.path;
  this.time = data.time;
  this.data = data.data || {};
  this.isUtf8 = data.isUtf8;
}
Session.prototype.markClean = function() {
  if (this.data.getUndoManager) {
    this.data.getUndoManager().markClean();
  }
};
Object.defineProperties(Session.prototype, {
  isDirty: {
    get: function() {
      if (this.data.getUndoManager) {
        return !this.data.getUndoManager().isClean();
      }
    }
  }
});
module.exports = Session;

},{}],38:[function(require,module,exports){
module.exports = angular.module('fs', []);

},{}],39:[function(require,module,exports){
var Session = require('../models/session');
var fsw = require('../../file-system-watcher');

var Sessions = function(map) {
  this._sessions = [];
  this._map = map;
};
Sessions.prototype.findSession = function(path) {
  var sessions = this._sessions;

  return sessions.find(function(item) {
    return item.path === path;
  });

};
Sessions.prototype.addSession = function(path, data, isUtf8) {

  if (this.findSession(path)) {
    throw new Error('Session for path exists already.');
  }

  var sessions = this._sessions;
  var session = new Session({
    path: path,
    time: Date.now(),
    data: data,
    isUtf8: isUtf8
  });
  sessions.unshift(session);

  return session;
};
Sessions.prototype.removeSession = function(session) {

  var sessions = this._sessions;

  var idx = sessions.indexOf(session);
  if (idx !== -1) {
    sessions.splice(idx, 1);
    return true;
  }

  return false;
};

Object.defineProperties(Sessions.prototype, {
  sessions: {
    get: function() {
      var sessions = this._sessions;
      return sessions;
      // var map = this._map;
      //
      // // clean any files that may no longer exist
      // // var i = sessions.length;
      // // while (i--) {
      // //   if (!map[sessions[i].path]) {
      // //     sessions.splice(i, 1);
      // //   }
      // // }
      //
      // return sessions.map(function(item) {
      //   return map[item.path];
      // }, this);

    }
  },
  dirty: {
    get: function() {
      var sessions = this._sessions;
      return this.sessions.filter(function(item) {
        return item.isDirty;
      });
    }
  }
});


/*
 * module exports
 */
module.exports = function() {

  var sessions = new Sessions(fsw.map);
  return sessions;

};

},{"../../file-system-watcher":26,"../models/session":37}],40:[function(require,module,exports){


window.app = require('./app');


//window.fs = require('./fs');

// // **********//*
// // Shims
// // ***********
require('./array');
//
// // ***********
// // Directives
// // ***********
// require('./app/directives/negate');
// require('./app/directives/focus');
// require('./app/directives/db-diagram');
// require('./app/directives/right-click');
// // require('./app/directives/behave');
//
//
// // ***********
// // Controllers
// // ***********
//
// // dialog controllers
// require('./controllers/confirm');
// require('./controllers/alert');
// require('./controllers/prompt');
//
// // home controllers
// require('./home/controllers/home');
// require('./home/controllers/tree');
// require('./home/controllers/file');
// require('./home/controllers/finder');
//
// // db model controllers
// require('./controllers/key');
// require('./controllers/array-def');
// require('./controllers/schema');
// require('./controllers/model');
// require('./controllers/db');
//
//
// // api model controllers
// require('./api/controllers/api');
// require('./api/controllers/controller');
// require('./api/controllers/handler');
// require('./api/controllers/route');
// require('./api/controllers/action');
// require('./api/controllers/diagram');
// require('./api/controllers/add-resource');
//
//
// // main app controller
// require('./app/controllers/app');
//
//
// // ***********
// // Services
// // ***********
// require('./services/dialog');

},{"./app":11,"./array":17}],41:[function(require,module,exports){
var p = require('path');

var FileSystemObject = function(path, stat) {
  this.name = p.basename(path) || path;
  this.path = path;
  this.dir = p.dirname(path);
  this.isDirectory = typeof stat === 'boolean' ? stat : stat.isDirectory();
  this.ext = p.extname(path);
  this.stat = stat;
};
FileSystemObject.prototype = {
  get isFile() {
    return !this.isDirectory;
  }
};
module.exports = FileSystemObject;

},{"path":43}],42:[function(require,module,exports){
/* global dialog */

module.exports = {
  rndstr: function() {
    return (+new Date()).toString(36);
  },
  getuid: function() {
    return Math.round((Math.random() * 1e7)).toString();
  },
  getuidstr: function() {
    return (+new Date()).toString(36);
  },
  urlRoot: function() {
    var location = window.location;
    return location.protocol + '//' + location.host;
  },
  encodeString: function(str) {
    return btoa(encodeURIComponent(str));
  },
  decodeString: function(str) {
    return decodeURIComponent(atob(str));
  },
  extend: function extend(origin, add) {
    // Don't do anything if add isn't an object
    if (!add || typeof add !== 'object') {
      return origin;
    }

    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  },
  ui: {
    responseHandler: function(fn) {
      return function(rsp, showError) {
        showError = showError || true;
        if (rsp.err) {
          if (showError) {
            dialog.alert({
              title: 'Error',
              message: JSON.stringify(rsp.err)
            });
          }
        } else {
          fn(rsp.data);
        }
      };
    }
  }
};

},{}],43:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("q+64fw"))
},{"q+64fw":44}],44:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[40])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2Nvb2tpZS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZW1pdHRlci1jb21wb25lbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2pzLWJlYXV0aWZ5L2pzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9saWIvYmVhdXRpZnktY3NzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9saWIvYmVhdXRpZnktaHRtbC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvanMtYmVhdXRpZnkvanMvbGliL2JlYXV0aWZ5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9kaXJlY3RpdmVzL3Njcm9sbGVkLWludG8tdmlldy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvZGlyZWN0aXZlcy9zY3JvbGxlZC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL21vZGVscy9hcHAuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL21vZHVsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvY29sb3IuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL3NlcnZpY2VzL2ZpbGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL3NlcnZpY2VzL3Jlc3BvbnNlLWhhbmRsZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXJyYXkuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvY29uZmlnLmpzb24iLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2FsZXJ0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9jb25maXJtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvcHJvbXB0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9zZXJ2aWNlcy9kaWFsb2cuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZmlsZS1zeXN0ZW0td2F0Y2hlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZGlyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL2ZpbGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmluZGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3NlYXJjaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy90cmVlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL21vZGVscy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL3Nlc3Npb24uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL3NlcnZpY2VzL3Nlc3Npb24uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC91dGlscy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2wzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2NERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlBBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vLyBTZXJpYWxpemUgdGhlIGEgbmFtZSB2YWx1ZSBwYWlyIGludG8gYSBjb29raWUgc3RyaW5nIHN1aXRhYmxlIGZvclxuLy8vIGh0dHAgaGVhZGVycy4gQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3Qgc3BlY2lmaWVkIGNvb2tpZSBwYXJhbWV0ZXJzXG4vLy9cbi8vLyBzZXJpYWxpemUoJ2ZvbycsICdiYXInLCB7IGh0dHBPbmx5OiB0cnVlIH0pXG4vLy8gICA9PiBcImZvbz1iYXI7IGh0dHBPbmx5XCJcbi8vL1xuLy8vIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4vLy8gQHBhcmFtIHtTdHJpbmd9IHZhbFxuLy8vIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4vLy8gQHJldHVybiB7U3RyaW5nfVxudmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbCwgb3B0KXtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdmFyIGVuYyA9IG9wdC5lbmNvZGUgfHwgZW5jb2RlO1xuICAgIHZhciBwYWlycyA9IFtuYW1lICsgJz0nICsgZW5jKHZhbCldO1xuXG4gICAgaWYgKG51bGwgIT0gb3B0Lm1heEFnZSkge1xuICAgICAgICB2YXIgbWF4QWdlID0gb3B0Lm1heEFnZSAtIDA7XG4gICAgICAgIGlmIChpc05hTihtYXhBZ2UpKSB0aHJvdyBuZXcgRXJyb3IoJ21heEFnZSBzaG91bGQgYmUgYSBOdW1iZXInKTtcbiAgICAgICAgcGFpcnMucHVzaCgnTWF4LUFnZT0nICsgbWF4QWdlKTtcbiAgICB9XG5cbiAgICBpZiAob3B0LmRvbWFpbikgcGFpcnMucHVzaCgnRG9tYWluPScgKyBvcHQuZG9tYWluKTtcbiAgICBpZiAob3B0LnBhdGgpIHBhaXJzLnB1c2goJ1BhdGg9JyArIG9wdC5wYXRoKTtcbiAgICBpZiAob3B0LmV4cGlyZXMpIHBhaXJzLnB1c2goJ0V4cGlyZXM9JyArIG9wdC5leHBpcmVzLnRvVVRDU3RyaW5nKCkpO1xuICAgIGlmIChvcHQuaHR0cE9ubHkpIHBhaXJzLnB1c2goJ0h0dHBPbmx5Jyk7XG4gICAgaWYgKG9wdC5zZWN1cmUpIHBhaXJzLnB1c2goJ1NlY3VyZScpO1xuXG4gICAgcmV0dXJuIHBhaXJzLmpvaW4oJzsgJyk7XG59O1xuXG4vLy8gUGFyc2UgdGhlIGdpdmVuIGNvb2tpZSBoZWFkZXIgc3RyaW5nIGludG8gYW4gb2JqZWN0XG4vLy8gVGhlIG9iamVjdCBoYXMgdGhlIHZhcmlvdXMgY29va2llcyBhcyBrZXlzKG5hbWVzKSA9PiB2YWx1ZXNcbi8vLyBAcGFyYW0ge1N0cmluZ30gc3RyXG4vLy8gQHJldHVybiB7T2JqZWN0fVxudmFyIHBhcnNlID0gZnVuY3Rpb24oc3RyLCBvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdmFyIG9iaiA9IHt9XG4gICAgdmFyIHBhaXJzID0gc3RyLnNwbGl0KC87ICovKTtcbiAgICB2YXIgZGVjID0gb3B0LmRlY29kZSB8fCBkZWNvZGU7XG5cbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKHBhaXIpIHtcbiAgICAgICAgdmFyIGVxX2lkeCA9IHBhaXIuaW5kZXhPZignPScpXG5cbiAgICAgICAgLy8gc2tpcCB0aGluZ3MgdGhhdCBkb24ndCBsb29rIGxpa2Uga2V5PXZhbHVlXG4gICAgICAgIGlmIChlcV9pZHggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5ID0gcGFpci5zdWJzdHIoMCwgZXFfaWR4KS50cmltKClcbiAgICAgICAgdmFyIHZhbCA9IHBhaXIuc3Vic3RyKCsrZXFfaWR4LCBwYWlyLmxlbmd0aCkudHJpbSgpO1xuXG4gICAgICAgIC8vIHF1b3RlZCB2YWx1ZXNcbiAgICAgICAgaWYgKCdcIicgPT0gdmFsWzBdKSB7XG4gICAgICAgICAgICB2YWwgPSB2YWwuc2xpY2UoMSwgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb25seSBhc3NpZ24gb25jZVxuICAgICAgICBpZiAodW5kZWZpbmVkID09IG9ialtrZXldKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9ialtrZXldID0gZGVjKHZhbCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG59O1xuXG52YXIgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xudmFyIGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudDtcblxubW9kdWxlLmV4cG9ydHMuc2VyaWFsaXplID0gc2VyaWFsaXplO1xubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbiIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHNlbGYub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiIsIi8qKlxuVGhlIGZvbGxvd2luZyBiYXRjaGVzIGFyZSBlcXVpdmFsZW50OlxuXG52YXIgYmVhdXRpZnlfanMgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpO1xudmFyIGJlYXV0aWZ5X2pzID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5qcztcbnZhciBiZWF1dGlmeV9qcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuanNfYmVhdXRpZnk7XG5cbnZhciBiZWF1dGlmeV9jc3MgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmNzcztcbnZhciBiZWF1dGlmeV9jc3MgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmNzc19iZWF1dGlmeTtcblxudmFyIGJlYXV0aWZ5X2h0bWwgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmh0bWw7XG52YXIgYmVhdXRpZnlfaHRtbCA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuaHRtbF9iZWF1dGlmeTtcblxuQWxsIG1ldGhvZHMgcmV0dXJuZWQgYWNjZXB0IHR3byBhcmd1bWVudHMsIHRoZSBzb3VyY2Ugc3RyaW5nIGFuZCBhbiBvcHRpb25zIG9iamVjdC5cbioqL1xuXG5mdW5jdGlvbiBnZXRfYmVhdXRpZnkoanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeSwgaHRtbF9iZWF1dGlmeSkge1xuICAgIC8vIHRoZSBkZWZhdWx0IGlzIGpzXG4gICAgdmFyIGJlYXV0aWZ5ID0gZnVuY3Rpb24gKHNyYywgY29uZmlnKSB7XG4gICAgICAgIHJldHVybiBqc19iZWF1dGlmeS5qc19iZWF1dGlmeShzcmMsIGNvbmZpZyk7XG4gICAgfTtcblxuICAgIC8vIHNob3J0IGFsaWFzZXNcbiAgICBiZWF1dGlmeS5qcyAgID0ganNfYmVhdXRpZnkuanNfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuY3NzICA9IGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuaHRtbCA9IGh0bWxfYmVhdXRpZnkuaHRtbF9iZWF1dGlmeTtcblxuICAgIC8vIGxlZ2FjeSBhbGlhc2VzXG4gICAgYmVhdXRpZnkuanNfYmVhdXRpZnkgICA9IGpzX2JlYXV0aWZ5LmpzX2JlYXV0aWZ5O1xuICAgIGJlYXV0aWZ5LmNzc19iZWF1dGlmeSAgPSBjc3NfYmVhdXRpZnkuY3NzX2JlYXV0aWZ5O1xuICAgIGJlYXV0aWZ5Lmh0bWxfYmVhdXRpZnkgPSBodG1sX2JlYXV0aWZ5Lmh0bWxfYmVhdXRpZnk7XG5cbiAgICByZXR1cm4gYmVhdXRpZnk7XG59XG5cbmlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFkZCBzdXBwb3J0IGZvciBBTUQgKCBodHRwczovL2dpdGh1Yi5jb20vYW1kanMvYW1kanMtYXBpL3dpa2kvQU1EI2RlZmluZWFtZC1wcm9wZXJ0eS0gKVxuICAgIGRlZmluZShbXG4gICAgICAgIFwiLi9saWIvYmVhdXRpZnlcIixcbiAgICAgICAgXCIuL2xpYi9iZWF1dGlmeS1jc3NcIixcbiAgICAgICAgXCIuL2xpYi9iZWF1dGlmeS1odG1sXCJcbiAgICBdLCBmdW5jdGlvbihqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KSB7XG4gICAgICAgIHJldHVybiBnZXRfYmVhdXRpZnkoanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeSwgaHRtbF9iZWF1dGlmeSk7XG4gICAgfSk7XG59IGVsc2Uge1xuICAgIChmdW5jdGlvbihtb2QpIHtcbiAgICAgICAgdmFyIGpzX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9saWIvYmVhdXRpZnknKTtcbiAgICAgICAgdmFyIGNzc19iZWF1dGlmeSA9IHJlcXVpcmUoJy4vbGliL2JlYXV0aWZ5LWNzcycpO1xuICAgICAgICB2YXIgaHRtbF9iZWF1dGlmeSA9IHJlcXVpcmUoJy4vbGliL2JlYXV0aWZ5LWh0bWwnKTtcblxuICAgICAgICBtb2QuZXhwb3J0cyA9IGdldF9iZWF1dGlmeShqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KTtcblxuICAgIH0pKG1vZHVsZSk7XG59XG5cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNoaW50IGN1cmx5OnRydWUsIGVxZXFlcTp0cnVlLCBsYXhicmVhazp0cnVlLCBub2VtcHR5OmZhbHNlICovXG4vKlxuXG4gIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gIENvcHlyaWdodCAoYykgMjAwNy0yMDEzIEVpbmFyIExpZWxtYW5pcyBhbmQgY29udHJpYnV0b3JzLlxuXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzXG4gICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlNcbiAgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4gIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAgU09GVFdBUkUuXG5cblxuIENTUyBCZWF1dGlmaWVyXG4tLS0tLS0tLS0tLS0tLS1cblxuICAgIFdyaXR0ZW4gYnkgSGFydXR5dW4gQW1pcmphbnlhbiwgKGFtaXJqYW55YW5AZ21haWwuY29tKVxuXG4gICAgQmFzZWQgb24gY29kZSBpbml0aWFsbHkgZGV2ZWxvcGVkIGJ5OiBFaW5hciBMaWVsbWFuaXMsIDxlaW5hckBqc2JlYXV0aWZpZXIub3JnPlxuICAgICAgICBodHRwOi8vanNiZWF1dGlmaWVyLm9yZy9cblxuICAgIFVzYWdlOlxuICAgICAgICBjc3NfYmVhdXRpZnkoc291cmNlX3RleHQpO1xuICAgICAgICBjc3NfYmVhdXRpZnkoc291cmNlX3RleHQsIG9wdGlvbnMpO1xuXG4gICAgVGhlIG9wdGlvbnMgYXJlIChkZWZhdWx0IGluIGJyYWNrZXRzKTpcbiAgICAgICAgaW5kZW50X3NpemUgKDQpICAgICAgICAgICAgICAgICAgIOKAlCBpbmRlbnRhdGlvbiBzaXplLFxuICAgICAgICBpbmRlbnRfY2hhciAoc3BhY2UpICAgICAgICAgICAgICAg4oCUIGNoYXJhY3RlciB0byBpbmRlbnQgd2l0aCxcbiAgICAgICAgc2VsZWN0b3Jfc2VwYXJhdG9yX25ld2xpbmUgKHRydWUpIC0gc2VwYXJhdGUgc2VsZWN0b3JzIHdpdGggbmV3bGluZSBvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3QgKGUuZy4gXCJhLFxcbmJyXCIgb3IgXCJhLCBiclwiKVxuICAgICAgICBlbmRfd2l0aF9uZXdsaW5lIChmYWxzZSkgICAgICAgICAgLSBlbmQgd2l0aCBhIG5ld2xpbmVcblxuICAgIGUuZ1xuXG4gICAgY3NzX2JlYXV0aWZ5KGNzc19zb3VyY2VfdGV4dCwge1xuICAgICAgJ2luZGVudF9zaXplJzogMSxcbiAgICAgICdpbmRlbnRfY2hhcic6ICdcXHQnLFxuICAgICAgJ3NlbGVjdG9yX3NlcGFyYXRvcic6ICcgJyxcbiAgICAgICdlbmRfd2l0aF9uZXdsaW5lJzogZmFsc2UsXG4gICAgfSk7XG4qL1xuXG4vLyBodHRwOi8vd3d3LnczLm9yZy9UUi9DU1MyMS9zeW5kYXRhLmh0bWwjdG9rZW5pemF0aW9uXG4vLyBodHRwOi8vd3d3LnczLm9yZy9UUi9jc3MzLXN5bnRheC9cblxuKGZ1bmN0aW9uKCkge1xuICAgIGZ1bmN0aW9uIGNzc19iZWF1dGlmeShzb3VyY2VfdGV4dCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdmFyIGluZGVudFNpemUgPSBvcHRpb25zLmluZGVudF9zaXplIHx8IDQ7XG4gICAgICAgIHZhciBpbmRlbnRDaGFyYWN0ZXIgPSBvcHRpb25zLmluZGVudF9jaGFyIHx8ICcgJztcbiAgICAgICAgdmFyIHNlbGVjdG9yU2VwYXJhdG9yTmV3bGluZSA9IChvcHRpb25zLnNlbGVjdG9yX3NlcGFyYXRvcl9uZXdsaW5lID09PSB1bmRlZmluZWQpID8gdHJ1ZSA6IG9wdGlvbnMuc2VsZWN0b3Jfc2VwYXJhdG9yX25ld2xpbmU7XG4gICAgICAgIHZhciBlbmRfd2l0aF9uZXdsaW5lID0gKG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZSA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lO1xuXG4gICAgICAgIC8vIGNvbXBhdGliaWxpdHlcbiAgICAgICAgaWYgKHR5cGVvZiBpbmRlbnRTaXplID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBpbmRlbnRTaXplID0gcGFyc2VJbnQoaW5kZW50U2l6ZSwgMTApO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyB0b2tlbml6ZXJcbiAgICAgICAgdmFyIHdoaXRlUmUgPSAvXlxccyskLztcbiAgICAgICAgdmFyIHdvcmRSZSA9IC9bXFx3JFxcLV9dLztcblxuICAgICAgICB2YXIgcG9zID0gLTEsXG4gICAgICAgICAgICBjaDtcblxuICAgICAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VfdGV4dC5jaGFyQXQoKytwb3MpO1xuICAgICAgICAgICAgcmV0dXJuIGNoIHx8ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcGVlayhza2lwV2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgdmFyIHByZXZfcG9zID0gcG9zO1xuICAgICAgICAgICAgaWYgKHNraXBXaGl0ZXNwYWNlKSB7XG4gICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gc291cmNlX3RleHQuY2hhckF0KHBvcyArIDEpIHx8ICcnO1xuICAgICAgICAgICAgcG9zID0gcHJldl9wb3MgLSAxO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVhdFN0cmluZyhlbmRDaGFycykge1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gcG9zO1xuICAgICAgICAgICAgd2hpbGUgKG5leHQoKSkge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5kQ2hhcnMuaW5kZXhPZihjaCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZV90ZXh0LnN1YnN0cmluZyhzdGFydCwgcG9zICsgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwZWVrU3RyaW5nKGVuZENoYXIpIHtcbiAgICAgICAgICAgIHZhciBwcmV2X3BvcyA9IHBvcztcbiAgICAgICAgICAgIHZhciBzdHIgPSBlYXRTdHJpbmcoZW5kQ2hhcik7XG4gICAgICAgICAgICBwb3MgPSBwcmV2X3BvcyAtIDE7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZWF0V2hpdGVzcGFjZSgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgICAgICAgIHdoaWxlICh3aGl0ZVJlLnRlc3QocGVlaygpKSkge1xuICAgICAgICAgICAgICAgIG5leHQoKVxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBza2lwV2hpdGVzcGFjZSgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgICAgICAgIGlmIChjaCAmJiB3aGl0ZVJlLnRlc3QoY2gpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAod2hpdGVSZS50ZXN0KG5leHQoKSkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gY2hcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlYXRDb21tZW50KHNpbmdsZUxpbmUpIHtcbiAgICAgICAgICAgIHZhciBzdGFydCA9IHBvcztcbiAgICAgICAgICAgIHZhciBzaW5nbGVMaW5lID0gcGVlaygpID09PSBcIi9cIjtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIHdoaWxlIChuZXh0KCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNpbmdsZUxpbmUgJiYgY2ggPT09IFwiKlwiICYmIHBlZWsoKSA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNpbmdsZUxpbmUgJiYgY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZV90ZXh0LnN1YnN0cmluZyhzdGFydCwgcG9zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzb3VyY2VfdGV4dC5zdWJzdHJpbmcoc3RhcnQsIHBvcykgKyBjaDtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gbG9va0JhY2soc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlX3RleHQuc3Vic3RyaW5nKHBvcyAtIHN0ci5sZW5ndGgsIHBvcykudG9Mb3dlckNhc2UoKSA9PT1cbiAgICAgICAgICAgICAgICBzdHI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXN0ZWQgcHNldWRvLWNsYXNzIGlmIHdlIGFyZSBpbnNpZGVSdWxlXG4gICAgICAgIC8vIGFuZCB0aGUgbmV4dCBzcGVjaWFsIGNoYXJhY3RlciBmb3VuZCBvcGVuc1xuICAgICAgICAvLyBhIG5ldyBibG9ja1xuICAgICAgICBmdW5jdGlvbiBmb3VuZE5lc3RlZFBzZXVkb0NsYXNzKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHBvcyArIDE7IGkgPCBzb3VyY2VfdGV4dC5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgdmFyIGNoID0gc291cmNlX3RleHQuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gXCJ7XCIpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIjtcIiB8fCBjaCA9PT0gXCJ9XCIgfHwgY2ggPT09IFwiKVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcmludGVyXG4gICAgICAgIHZhciBiYXNlYmFzZUluZGVudFN0cmluZyA9IHNvdXJjZV90ZXh0Lm1hdGNoKC9eW1xcdCBdKi8pWzBdO1xuICAgICAgICB2YXIgc2luZ2xlSW5kZW50ID0gbmV3IEFycmF5KGluZGVudFNpemUgKyAxKS5qb2luKGluZGVudENoYXJhY3Rlcik7XG4gICAgICAgIHZhciBpbmRlbnRMZXZlbCA9IDA7XG4gICAgICAgIHZhciBuZXN0ZWRMZXZlbCA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZW50KCkge1xuICAgICAgICAgICAgaW5kZW50TGV2ZWwrKztcbiAgICAgICAgICAgIGJhc2ViYXNlSW5kZW50U3RyaW5nICs9IHNpbmdsZUluZGVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG91dGRlbnQoKSB7XG4gICAgICAgICAgICBpbmRlbnRMZXZlbC0tO1xuICAgICAgICAgICAgYmFzZWJhc2VJbmRlbnRTdHJpbmcgPSBiYXNlYmFzZUluZGVudFN0cmluZy5zbGljZSgwLCAtaW5kZW50U2l6ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJpbnQgPSB7fTtcbiAgICAgICAgcHJpbnRbXCJ7XCJdID0gZnVuY3Rpb24oY2gpIHtcbiAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgIH07XG4gICAgICAgIHByaW50W1wifVwiXSA9IGZ1bmN0aW9uKGNoKSB7XG4gICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJpbnQuX2xhc3RDaGFyV2hpdGVzcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdoaXRlUmUudGVzdChvdXRwdXRbb3V0cHV0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmludC5uZXdMaW5lID0gZnVuY3Rpb24oa2VlcFdoaXRlc3BhY2UpIHtcbiAgICAgICAgICAgIGlmICgha2VlcFdoaXRlc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBwcmludC50cmltKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvdXRwdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJhc2ViYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goYmFzZWJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBwcmludC5zaW5nbGVTcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggJiYgIXByaW50Ll9sYXN0Q2hhcldoaXRlc3BhY2UoKSkge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKCcgJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJpbnQudHJpbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2hpbGUgKHByaW50Ll9sYXN0Q2hhcldoaXRlc3BhY2UoKSkge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBcbiAgICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgICBpZiAoYmFzZWJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGJhc2ViYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICAvKl9fX19fX19fX19fX19fX19fX19fXy0tLS0tLS0tLS0tLS0tLS0tLS0tX19fX19fX19fX19fX19fX19fX19fKi9cblxuICAgICAgICB2YXIgaW5zaWRlUnVsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwID0gZmFsc2U7XG4gICAgICAgIHZhciB0b3BfY2ggPSAnJztcbiAgICAgICAgdmFyIGxhc3RfdG9wX2NoID0gJyc7XG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciB3aGl0ZXNwYWNlID0gc2tpcFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgIHZhciBpc0FmdGVyU3BhY2UgPSB3aGl0ZXNwYWNlICE9PSAnJztcbiAgICAgICAgICAgIHZhciBpc0FmdGVyTmV3bGluZSA9IHdoaXRlc3BhY2UuaW5kZXhPZignXFxuJykgIT09IC0xO1xuICAgICAgICAgICAgdmFyIGxhc3RfdG9wX2NoID0gdG9wX2NoO1xuICAgICAgICAgICAgdmFyIHRvcF9jaCA9IGNoO1xuXG4gICAgICAgICAgICBpZiAoIWNoKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycgJiYgcGVlaygpID09PSAnKicpIHsgLyogY3NzIGNvbW1lbnQgKi9cbiAgICAgICAgICAgICAgICB2YXIgaGVhZGVyID0gbG9va0JhY2soXCJcIik7XG4gICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSgpO1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGVhdENvbW1lbnQoKSk7XG4gICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSgpO1xuICAgICAgICAgICAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSh0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycgJiYgcGVlaygpID09PSAnLycpIHsgLy8gc2luZ2xlIGxpbmUgY29tbWVudFxuICAgICAgICAgICAgICAgIGlmICghaXNBZnRlck5ld2xpbmUgJiYgbGFzdF90b3BfY2ggIT09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICBwcmludC50cmltKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0Q29tbWVudCgpKTtcbiAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnQCcpIHtcbiAgICAgICAgICAgICAgICAvLyBwYXNzIGFsb25nIHRoZSBzcGFjZSB3ZSBmb3VuZCBhcyBhIHNlcGFyYXRlIGl0ZW1cbiAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0cmlwIHRyYWlsaW5nIHNwYWNlLCBpZiBwcmVzZW50LCBmb3IgaGFzaCBwcm9wZXJ0eSBjaGVja3NcbiAgICAgICAgICAgICAgICB2YXIgdmFyaWFibGVPclJ1bGUgPSBwZWVrU3RyaW5nKFwiOiAsO3t9KClbXS89J1xcXCJcIikucmVwbGFjZSgvXFxzJC8sICcnKTtcblxuICAgICAgICAgICAgICAgIC8vIG1pZ2h0IGJlIGEgbmVzdGluZyBhdC1ydWxlXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlT3JSdWxlIGluIGNzc19iZWF1dGlmeS5ORVNURURfQVRfUlVMRSkge1xuICAgICAgICAgICAgICAgICAgICBuZXN0ZWRMZXZlbCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFibGVPclJ1bGUgaW4gY3NzX2JlYXV0aWZ5LkNPTkRJVElPTkFMX0dST1VQX1JVTEUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyaW5nQ29uZGl0aW9uYWxHcm91cCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCc6ICcuaW5kZXhPZih2YXJpYWJsZU9yUnVsZVt2YXJpYWJsZU9yUnVsZS5sZW5ndGggLTFdKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgaGF2ZSBhIHZhcmlhYmxlLCBhZGQgaXQgYW5kIGluc2VydCBvbmUgc3BhY2UgYmVmb3JlIGNvbnRpbnVpbmdcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZU9yUnVsZSA9IGVhdFN0cmluZyhcIjogXCIpLnJlcGxhY2UoL1xccyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKHZhcmlhYmxlT3JSdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAneycpIHtcbiAgICAgICAgICAgICAgICBpZiAocGVlayh0cnVlKSA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChcInt9XCIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFtcIntcIl0oY2gpO1xuICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIGVudGVyaW5nIGNvbmRpdGlvbmFsIGdyb3Vwcywgb25seSBydWxlc2V0cyBhcmUgYWxsb3dlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2lkZVJ1bGUgPSAoaW5kZW50TGV2ZWwgPiBuZXN0ZWRMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UsIGRlY2xhcmF0aW9ucyBhcmUgYWxzbyBhbGxvd2VkXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNpZGVSdWxlID0gKGluZGVudExldmVsID49IG5lc3RlZExldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICd9Jykge1xuICAgICAgICAgICAgICAgIG91dGRlbnQoKTtcbiAgICAgICAgICAgICAgICBwcmludFtcIn1cIl0oY2gpO1xuICAgICAgICAgICAgICAgIGluc2lkZVJ1bGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAobmVzdGVkTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgbmVzdGVkTGV2ZWwtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIjpcIikge1xuICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICBpZiAoKGluc2lkZVJ1bGUgfHwgZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgICAgICEobG9va0JhY2soXCImXCIpIHx8IGZvdW5kTmVzdGVkUHNldWRvQ2xhc3MoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gJ3Byb3BlcnR5OiB2YWx1ZScgZGVsaW1pdGVyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIGNvdWxkIGJlIGluIGEgY29uZGl0aW9uYWwgZ3JvdXAgcXVlcnlcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goJzonKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBzYXNzL2xlc3MgcGFyZW50IHJlZmVyZW5jZSBkb24ndCB1c2UgYSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICAvLyBzYXNzIG5lc3RlZCBwc2V1ZG8tY2xhc3MgZG9uJ3QgdXNlIGEgc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZWsoKSA9PT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBzZXVkby1lbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChcIjo6XCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHNldWRvLWNsYXNzXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCgnOicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1wiJyB8fCBjaCA9PT0gJ1xcJycpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGVhdFN0cmluZyhjaCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJzsnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcoJykgeyAvLyBtYXkgYmUgYSB1cmxcbiAgICAgICAgICAgICAgICBpZiAobG9va0JhY2soXCJ1cmxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaCAhPT0gJyknICYmIGNoICE9PSAnXCInICYmIGNoICE9PSAnXFwnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGVhdFN0cmluZygnKScpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zLS07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcpJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcsJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnNpZGVSdWxlICYmIHNlbGVjdG9yU2VwYXJhdG9yTmV3bGluZSkge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICc9JykgeyAvLyBubyB3aGl0ZXNwYWNlIGJlZm9yZSBvciBhZnRlclxuICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBzd2VldENvZGUgPSBvdXRwdXQuam9pbignJykucmVwbGFjZSgvW1xcclxcblxcdCBdKyQvLCAnJyk7XG5cbiAgICAgICAgLy8gZXN0YWJsaXNoIGVuZF93aXRoX25ld2xpbmVcbiAgICAgICAgaWYgKGVuZF93aXRoX25ld2xpbmUpIHtcbiAgICAgICAgICAgIHN3ZWV0Q29kZSArPSBcIlxcblwiO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN3ZWV0Q29kZTtcbiAgICB9XG5cbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9DU1MvQXQtcnVsZVxuICAgIGNzc19iZWF1dGlmeS5ORVNURURfQVRfUlVMRSA9IHtcbiAgICAgICAgXCJAcGFnZVwiOiB0cnVlLFxuICAgICAgICBcIkBmb250LWZhY2VcIjogdHJ1ZSxcbiAgICAgICAgXCJAa2V5ZnJhbWVzXCI6IHRydWUsXG4gICAgICAgIC8vIGFsc28gaW4gQ09ORElUSU9OQUxfR1JPVVBfUlVMRSBiZWxvd1xuICAgICAgICBcIkBtZWRpYVwiOiB0cnVlLFxuICAgICAgICBcIkBzdXBwb3J0c1wiOiB0cnVlLFxuICAgICAgICBcIkBkb2N1bWVudFwiOiB0cnVlXG4gICAgfTtcbiAgICBjc3NfYmVhdXRpZnkuQ09ORElUSU9OQUxfR1JPVVBfUlVMRSA9IHtcbiAgICAgICAgXCJAbWVkaWFcIjogdHJ1ZSxcbiAgICAgICAgXCJAc3VwcG9ydHNcIjogdHJ1ZSxcbiAgICAgICAgXCJAZG9jdW1lbnRcIjogdHJ1ZVxuICAgIH07XG5cbiAgICAvKmdsb2JhbCBkZWZpbmUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNzc19iZWF1dGlmeTogY3NzX2JlYXV0aWZ5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBDb21tb25KUy4gSnVzdCBwdXQgdGhpcyBmaWxlIHNvbWV3aGVyZSBvbiB5b3VyIHJlcXVpcmUucGF0aHNcbiAgICAgICAgLy8gYW5kIHlvdSB3aWxsIGJlIGFibGUgdG8gYHZhciBodG1sX2JlYXV0aWZ5ID0gcmVxdWlyZShcImJlYXV0aWZ5XCIpLmh0bWxfYmVhdXRpZnlgLlxuICAgICAgICBleHBvcnRzLmNzc19iZWF1dGlmeSA9IGNzc19iZWF1dGlmeTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcnVubmluZyBhIHdlYiBwYWdlIGFuZCBkb24ndCBoYXZlIGVpdGhlciBvZiB0aGUgYWJvdmUsIGFkZCBvdXIgb25lIGdsb2JhbFxuICAgICAgICB3aW5kb3cuY3NzX2JlYXV0aWZ5ID0gY3NzX2JlYXV0aWZ5O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSBkb24ndCBldmVuIGhhdmUgd2luZG93LCB0cnkgZ2xvYmFsLlxuICAgICAgICBnbG9iYWwuY3NzX2JlYXV0aWZ5ID0gY3NzX2JlYXV0aWZ5O1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzaGludCBjdXJseTp0cnVlLCBlcWVxZXE6dHJ1ZSwgbGF4YnJlYWs6dHJ1ZSwgbm9lbXB0eTpmYWxzZSAqL1xuLypcblxuICBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuICBDb3B5cmlnaHQgKGMpIDIwMDctMjAxMyBFaW5hciBMaWVsbWFuaXMgYW5kIGNvbnRyaWJ1dG9ycy5cblxuICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlc1xuICAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG4gIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG4gIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuICBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxuICBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTXG4gIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuICBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTlxuICBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gIFNPRlRXQVJFLlxuXG5cbiBTdHlsZSBIVE1MXG4tLS0tLS0tLS0tLS0tLS1cblxuICBXcml0dGVuIGJ5IE5vY2h1bSBTb3Nzb25rbywgKG5zb3Nzb25rb0Bob3RtYWlsLmNvbSlcblxuICBCYXNlZCBvbiBjb2RlIGluaXRpYWxseSBkZXZlbG9wZWQgYnk6IEVpbmFyIExpZWxtYW5pcywgPGVpbmFyQGpzYmVhdXRpZmllci5vcmc+XG4gICAgaHR0cDovL2pzYmVhdXRpZmllci5vcmcvXG5cbiAgVXNhZ2U6XG4gICAgc3R5bGVfaHRtbChodG1sX3NvdXJjZSk7XG5cbiAgICBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zKTtcblxuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgaW5kZW50X2lubmVyX2h0bWwgKGRlZmF1bHQgZmFsc2UpICDigJQgaW5kZW50IDxoZWFkPiBhbmQgPGJvZHk+IHNlY3Rpb25zLFxuICAgIGluZGVudF9zaXplIChkZWZhdWx0IDQpICAgICAgICAgIOKAlCBpbmRlbnRhdGlvbiBzaXplLFxuICAgIGluZGVudF9jaGFyIChkZWZhdWx0IHNwYWNlKSAgICAgIOKAlCBjaGFyYWN0ZXIgdG8gaW5kZW50IHdpdGgsXG4gICAgd3JhcF9saW5lX2xlbmd0aCAoZGVmYXVsdCAyNTApICAgICAgICAgICAgLSAgbWF4aW11bSBhbW91bnQgb2YgY2hhcmFjdGVycyBwZXIgbGluZSAoMCA9IGRpc2FibGUpXG4gICAgYnJhY2Vfc3R5bGUgKGRlZmF1bHQgXCJjb2xsYXBzZVwiKSAtIFwiY29sbGFwc2VcIiB8IFwiZXhwYW5kXCIgfCBcImVuZC1leHBhbmRcIlxuICAgICAgICAgICAgcHV0IGJyYWNlcyBvbiB0aGUgc2FtZSBsaW5lIGFzIGNvbnRyb2wgc3RhdGVtZW50cyAoZGVmYXVsdCksIG9yIHB1dCBicmFjZXMgb24gb3duIGxpbmUgKEFsbG1hbiAvIEFOU0kgc3R5bGUpLCBvciBqdXN0IHB1dCBlbmQgYnJhY2VzIG9uIG93biBsaW5lLlxuICAgIHVuZm9ybWF0dGVkIChkZWZhdWx0cyB0byBpbmxpbmUgdGFncykgLSBsaXN0IG9mIHRhZ3MsIHRoYXQgc2hvdWxkbid0IGJlIHJlZm9ybWF0dGVkXG4gICAgaW5kZW50X3NjcmlwdHMgKGRlZmF1bHQgbm9ybWFsKSAgLSBcImtlZXBcInxcInNlcGFyYXRlXCJ8XCJub3JtYWxcIlxuICAgIHByZXNlcnZlX25ld2xpbmVzIChkZWZhdWx0IHRydWUpIC0gd2hldGhlciBleGlzdGluZyBsaW5lIGJyZWFrcyBiZWZvcmUgZWxlbWVudHMgc2hvdWxkIGJlIHByZXNlcnZlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9ubHkgd29ya3MgYmVmb3JlIGVsZW1lbnRzLCBub3QgaW5zaWRlIHRhZ3Mgb3IgZm9yIHRleHQuXG4gICAgbWF4X3ByZXNlcnZlX25ld2xpbmVzIChkZWZhdWx0IHVubGltaXRlZCkgLSBtYXhpbXVtIG51bWJlciBvZiBsaW5lIGJyZWFrcyB0byBiZSBwcmVzZXJ2ZWQgaW4gb25lIGNodW5rXG4gICAgaW5kZW50X2hhbmRsZWJhcnMgKGRlZmF1bHQgZmFsc2UpIC0gZm9ybWF0IGFuZCBpbmRlbnQge3sjZm9vfX0gYW5kIHt7L2Zvb319XG4gICAgZW5kX3dpdGhfbmV3bGluZSAoZmFsc2UpICAgICAgICAgIC0gZW5kIHdpdGggYSBuZXdsaW5lXG5cblxuICAgIGUuZy5cblxuICAgIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIHtcbiAgICAgICdpbmRlbnRfaW5uZXJfaHRtbCc6IGZhbHNlLFxuICAgICAgJ2luZGVudF9zaXplJzogMixcbiAgICAgICdpbmRlbnRfY2hhcic6ICcgJyxcbiAgICAgICd3cmFwX2xpbmVfbGVuZ3RoJzogNzgsXG4gICAgICAnYnJhY2Vfc3R5bGUnOiAnZXhwYW5kJyxcbiAgICAgICd1bmZvcm1hdHRlZCc6IFsnYScsICdzdWInLCAnc3VwJywgJ2InLCAnaScsICd1J10sXG4gICAgICAncHJlc2VydmVfbmV3bGluZXMnOiB0cnVlLFxuICAgICAgJ21heF9wcmVzZXJ2ZV9uZXdsaW5lcyc6IDUsXG4gICAgICAnaW5kZW50X2hhbmRsZWJhcnMnOiBmYWxzZVxuICAgIH0pO1xuKi9cblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgZnVuY3Rpb24gdHJpbShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsdHJpbShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL15cXHMrL2csICcnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydHJpbShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL1xccyskL2csJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMsIGpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnkpIHtcbiAgICAgICAgLy9XcmFwcGVyIGZ1bmN0aW9uIHRvIGludm9rZSBhbGwgdGhlIG5lY2Vzc2FyeSBjb25zdHJ1Y3RvcnMgYW5kIGRlYWwgd2l0aCB0aGUgb3V0cHV0LlxuXG4gICAgICAgIHZhciBtdWx0aV9wYXJzZXIsXG4gICAgICAgICAgICBpbmRlbnRfaW5uZXJfaHRtbCxcbiAgICAgICAgICAgIGluZGVudF9zaXplLFxuICAgICAgICAgICAgaW5kZW50X2NoYXJhY3RlcixcbiAgICAgICAgICAgIHdyYXBfbGluZV9sZW5ndGgsXG4gICAgICAgICAgICBicmFjZV9zdHlsZSxcbiAgICAgICAgICAgIHVuZm9ybWF0dGVkLFxuICAgICAgICAgICAgcHJlc2VydmVfbmV3bGluZXMsXG4gICAgICAgICAgICBtYXhfcHJlc2VydmVfbmV3bGluZXMsXG4gICAgICAgICAgICBpbmRlbnRfaGFuZGxlYmFycyxcbiAgICAgICAgICAgIGVuZF93aXRoX25ld2xpbmU7XG5cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgdG8gMS4zLjRcbiAgICAgICAgaWYgKChvcHRpb25zLndyYXBfbGluZV9sZW5ndGggPT09IHVuZGVmaW5lZCB8fCBwYXJzZUludChvcHRpb25zLndyYXBfbGluZV9sZW5ndGgsIDEwKSA9PT0gMCkgJiZcbiAgICAgICAgICAgICAgICAob3B0aW9ucy5tYXhfY2hhciAhPT0gdW5kZWZpbmVkICYmIHBhcnNlSW50KG9wdGlvbnMubWF4X2NoYXIsIDEwKSAhPT0gMCkpIHtcbiAgICAgICAgICAgIG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCA9IG9wdGlvbnMubWF4X2NoYXI7XG4gICAgICAgIH1cblxuICAgICAgICBpbmRlbnRfaW5uZXJfaHRtbCA9IChvcHRpb25zLmluZGVudF9pbm5lcl9odG1sID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmluZGVudF9pbm5lcl9odG1sO1xuICAgICAgICBpbmRlbnRfc2l6ZSA9IChvcHRpb25zLmluZGVudF9zaXplID09PSB1bmRlZmluZWQpID8gNCA6IHBhcnNlSW50KG9wdGlvbnMuaW5kZW50X3NpemUsIDEwKTtcbiAgICAgICAgaW5kZW50X2NoYXJhY3RlciA9IChvcHRpb25zLmluZGVudF9jaGFyID09PSB1bmRlZmluZWQpID8gJyAnIDogb3B0aW9ucy5pbmRlbnRfY2hhcjtcbiAgICAgICAgYnJhY2Vfc3R5bGUgPSAob3B0aW9ucy5icmFjZV9zdHlsZSA9PT0gdW5kZWZpbmVkKSA/ICdjb2xsYXBzZScgOiBvcHRpb25zLmJyYWNlX3N0eWxlO1xuICAgICAgICB3cmFwX2xpbmVfbGVuZ3RoID0gIHBhcnNlSW50KG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCwgMTApID09PSAwID8gMzI3ODYgOiBwYXJzZUludChvcHRpb25zLndyYXBfbGluZV9sZW5ndGggfHwgMjUwLCAxMCk7XG4gICAgICAgIHVuZm9ybWF0dGVkID0gb3B0aW9ucy51bmZvcm1hdHRlZCB8fCBbJ2EnLCAnc3BhbicsICdpbWcnLCAnYmRvJywgJ2VtJywgJ3N0cm9uZycsICdkZm4nLCAnY29kZScsICdzYW1wJywgJ2tiZCcsICd2YXInLCAnY2l0ZScsICdhYmJyJywgJ2Fjcm9ueW0nLCAncScsICdzdWInLCAnc3VwJywgJ3R0JywgJ2knLCAnYicsICdiaWcnLCAnc21hbGwnLCAndScsICdzJywgJ3N0cmlrZScsICdmb250JywgJ2lucycsICdkZWwnLCAncHJlJywgJ2FkZHJlc3MnLCAnZHQnLCAnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnXTtcbiAgICAgICAgcHJlc2VydmVfbmV3bGluZXMgPSAob3B0aW9ucy5wcmVzZXJ2ZV9uZXdsaW5lcyA9PT0gdW5kZWZpbmVkKSA/IHRydWUgOiBvcHRpb25zLnByZXNlcnZlX25ld2xpbmVzO1xuICAgICAgICBtYXhfcHJlc2VydmVfbmV3bGluZXMgPSBwcmVzZXJ2ZV9uZXdsaW5lcyA/XG4gICAgICAgICAgICAoaXNOYU4ocGFyc2VJbnQob3B0aW9ucy5tYXhfcHJlc2VydmVfbmV3bGluZXMsIDEwKSkgPyAzMjc4NiA6IHBhcnNlSW50KG9wdGlvbnMubWF4X3ByZXNlcnZlX25ld2xpbmVzLCAxMCkpXG4gICAgICAgICAgICA6IDA7XG4gICAgICAgIGluZGVudF9oYW5kbGViYXJzID0gKG9wdGlvbnMuaW5kZW50X2hhbmRsZWJhcnMgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuaW5kZW50X2hhbmRsZWJhcnM7XG4gICAgICAgIGVuZF93aXRoX25ld2xpbmUgPSAob3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmVuZF93aXRoX25ld2xpbmU7XG5cbiAgICAgICAgZnVuY3Rpb24gUGFyc2VyKCkge1xuXG4gICAgICAgICAgICB0aGlzLnBvcyA9IDA7IC8vUGFyc2VyIHBvc2l0aW9uXG4gICAgICAgICAgICB0aGlzLnRva2VuID0gJyc7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJzsgLy9yZWZsZWN0cyB0aGUgY3VycmVudCBQYXJzZXIgbW9kZTogVEFHL0NPTlRFTlRcbiAgICAgICAgICAgIHRoaXMudGFncyA9IHsgLy9BbiBvYmplY3QgdG8gaG9sZCB0YWdzLCB0aGVpciBwb3NpdGlvbiwgYW5kIHRoZWlyIHBhcmVudC10YWdzLCBpbml0aWF0ZWQgd2l0aCBkZWZhdWx0IHZhbHVlc1xuICAgICAgICAgICAgICAgIHBhcmVudDogJ3BhcmVudDEnLFxuICAgICAgICAgICAgICAgIHBhcmVudGNvdW50OiAxLFxuICAgICAgICAgICAgICAgIHBhcmVudDE6ICcnXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy50b2tlbl90ZXh0ID0gdGhpcy5sYXN0X3Rva2VuID0gdGhpcy5sYXN0X3RleHQgPSB0aGlzLnRva2VuX3R5cGUgPSAnJztcbiAgICAgICAgICAgIHRoaXMubmV3bGluZXMgPSAwO1xuICAgICAgICAgICAgdGhpcy5pbmRlbnRfY29udGVudCA9IGluZGVudF9pbm5lcl9odG1sO1xuXG4gICAgICAgICAgICB0aGlzLlV0aWxzID0geyAvL1VpbGl0aWVzIG1hZGUgYXZhaWxhYmxlIHRvIHRoZSB2YXJpb3VzIGZ1bmN0aW9uc1xuICAgICAgICAgICAgICAgIHdoaXRlc3BhY2U6IFwiXFxuXFxyXFx0IFwiLnNwbGl0KCcnKSxcbiAgICAgICAgICAgICAgICBzaW5nbGVfdG9rZW46ICdicixpbnB1dCxsaW5rLG1ldGEsIWRvY3R5cGUsYmFzZWZvbnQsYmFzZSxhcmVhLGhyLHdicixwYXJhbSxpbWcsaXNpbmRleCw/eG1sLGVtYmVkLD9waHAsPyw/PScuc3BsaXQoJywnKSwgLy9hbGwgdGhlIHNpbmdsZSB0YWdzIGZvciBIVE1MXG4gICAgICAgICAgICAgICAgZXh0cmFfbGluZXJzOiAnaGVhZCxib2R5LC9odG1sJy5zcGxpdCgnLCcpLCAvL2ZvciB0YWdzIHRoYXQgbmVlZCBhIGxpbmUgb2Ygd2hpdGVzcGFjZSBiZWZvcmUgdGhlbVxuICAgICAgICAgICAgICAgIGluX2FycmF5OiBmdW5jdGlvbih3aGF0LCBhcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aGF0ID09PSBhcnJbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUmV0dXJuIHRydWUgaWZmIHRoZSBnaXZlbiB0ZXh0IGlzIGNvbXBvc2VkIGVudGlyZWx5IG9mXG4gICAgICAgICAgICAvLyB3aGl0ZXNwYWNlLlxuICAgICAgICAgICAgdGhpcy5pc193aGl0ZXNwYWNlID0gZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgdGV4dC5sZW5ndGg7IHRleHQrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuVXRpbHMuaW5fYXJyYXkodGV4dC5jaGFyQXQobiksIHRoaXMuVXRpbHMud2hpdGVzcGFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X2NoYXIgPSAnJztcblxuICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuVXRpbHMuaW5fYXJyYXkoaW5wdXRfY2hhciwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5ld2xpbmVzID0gMDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuVXRpbHMuaW5fYXJyYXkoaW5wdXRfY2hhciwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXNlcnZlX25ld2xpbmVzICYmIGlucHV0X2NoYXIgPT09ICdcXG4nICYmIHRoaXMubmV3bGluZXMgPD0gbWF4X3ByZXNlcnZlX25ld2xpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXdsaW5lcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gQXBwZW5kIGEgc3BhY2UgdG8gdGhlIGdpdmVuIGNvbnRlbnQgKHN0cmluZyBhcnJheSkgb3IsIGlmIHdlIGFyZVxuICAgICAgICAgICAgLy8gYXQgdGhlIHdyYXBfbGluZV9sZW5ndGgsIGFwcGVuZCBhIG5ld2xpbmUvaW5kZW50YXRpb24uXG4gICAgICAgICAgICB0aGlzLnNwYWNlX29yX3dyYXAgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGluZV9jaGFyX2NvdW50ID49IHRoaXMud3JhcF9saW5lX2xlbmd0aCkgeyAvL2luc2VydCBhIGxpbmUgd2hlbiB0aGUgd3JhcF9saW5lX2xlbmd0aCBpcyByZWFjaGVkXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZShmYWxzZSwgY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfaW5kZW50YXRpb24oY29udGVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5wdXNoKCcgJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfY29udGVudCA9IGZ1bmN0aW9uKCkgeyAvL2Z1bmN0aW9uIHRvIGNhcHR1cmUgcmVndWxhciBjb250ZW50IGJldHdlZW4gdGFnc1xuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSBmYWxzZTsgLy9pZiBhIHNwYWNlIGlzIG5lZWRlZFxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKSAhPT0gJzwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoID8gY29udGVudC5qb2luKCcnKSA6IFsnJywgJ1RLX0VPRiddO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwYWNlX29yX3dyYXAoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRlbnRfaGFuZGxlYmFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlYmFycyBwYXJzaW5nIGlzIGNvbXBsaWNhdGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ge3sjZm9vfX0gYW5kIHt7L2Zvb319IGFyZSBmb3JtYXR0ZWQgdGFncy5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHt7c29tZXRoaW5nfX0gc2hvdWxkIGdldCB0cmVhdGVkIGFzIGNvbnRlbnQsIGV4Y2VwdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHt7ZWxzZX19IHNwZWNpZmljYWxseSBiZWhhdmVzIGxpa2Uge3sjaWZ9fSBhbmQge3svaWZ9fVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBlZWszID0gdGhpcy5pbnB1dC5zdWJzdHIodGhpcy5wb3MsIDMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZWszID09PSAne3sjJyB8fCBwZWVrMyA9PT0gJ3t7LycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGVzZSBhcmUgdGFncyBhbmQgbm90IGNvbnRlbnQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMucG9zLCAyKSA9PT0gJ3t7Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmdldF90YWcodHJ1ZSkgPT09ICd7e2Vsc2V9fScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5wdXNoKGlucHV0X2NoYXIpOyAvL2xldHRlciBhdC1hLXRpbWUgKG9yIHN0cmluZykgaW5zZXJ0ZWQgdG8gYW4gYXJyYXlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoID8gY29udGVudC5qb2luKCcnKSA6ICcnO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfY29udGVudHNfdG8gPSBmdW5jdGlvbihuYW1lKSB7IC8vZ2V0IHRoZSBmdWxsIGNvbnRlbnQgb2YgYSBzY3JpcHQgb3Igc3R5bGUgdG8gcGFzcyB0byBqc19iZWF1dGlmeVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvcyA9PT0gdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsnJywgJ1RLX0VPRiddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnO1xuICAgICAgICAgICAgICAgIHZhciBjb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgdmFyIHJlZ19tYXRjaCA9IG5ldyBSZWdFeHAoJzwvJyArIG5hbWUgKyAnXFxcXHMqPicsICdpZ20nKTtcbiAgICAgICAgICAgICAgICByZWdfbWF0Y2gubGFzdEluZGV4ID0gdGhpcy5wb3M7XG4gICAgICAgICAgICAgICAgdmFyIHJlZ19hcnJheSA9IHJlZ19tYXRjaC5leGVjKHRoaXMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIHZhciBlbmRfc2NyaXB0ID0gcmVnX2FycmF5ID8gcmVnX2FycmF5LmluZGV4IDogdGhpcy5pbnB1dC5sZW5ndGg7IC8vYWJzb2x1dGUgZW5kIG9mIHNjcmlwdFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvcyA8IGVuZF9zY3JpcHQpIHsgLy9nZXQgZXZlcnl0aGluZyBpbiBiZXR3ZWVuIHRoZSBzY3JpcHQgdGFnc1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gdGhpcy5pbnB1dC5zdWJzdHJpbmcodGhpcy5wb3MsIGVuZF9zY3JpcHQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IGVuZF9zY3JpcHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5yZWNvcmRfdGFnID0gZnVuY3Rpb24odGFnKSB7IC8vZnVuY3Rpb24gdG8gcmVjb3JkIGEgdGFnIGFuZCBpdHMgcGFyZW50IGluIHRoaXMudGFncyBPYmplY3RcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50YWdzW3RhZyArICdjb3VudCddKSB7IC8vY2hlY2sgZm9yIHRoZSBleGlzdGVuY2Ugb2YgdGhpcyB0YWcgdHlwZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10rKztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXV0gPSB0aGlzLmluZGVudF9sZXZlbDsgLy9hbmQgcmVjb3JkIHRoZSBwcmVzZW50IGluZGVudCBsZXZlbFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vb3RoZXJ3aXNlIGluaXRpYWxpemUgdGhpcyB0YWcgdHlwZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gPSAxO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXSA9IHRoaXMuaW5kZW50X2xldmVsOyAvL2FuZCByZWNvcmQgdGhlIHByZXNlbnQgaW5kZW50IGxldmVsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gKyAncGFyZW50J10gPSB0aGlzLnRhZ3MucGFyZW50OyAvL3NldCB0aGUgcGFyZW50IChpLmUuIGluIHRoZSBjYXNlIG9mIGEgZGl2IHRoaXMudGFncy5kaXYxcGFyZW50KVxuICAgICAgICAgICAgICAgIHRoaXMudGFncy5wYXJlbnQgPSB0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J107IC8vYW5kIG1ha2UgdGhpcyB0aGUgY3VycmVudCBwYXJlbnQgKGkuZS4gaW4gdGhlIGNhc2Ugb2YgYSBkaXYgJ2RpdjEnKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5yZXRyaWV2ZV90YWcgPSBmdW5jdGlvbih0YWcpIHsgLy9mdW5jdGlvbiB0byByZXRyaWV2ZSB0aGUgb3BlbmluZyB0YWcgdG8gdGhlIGNvcnJlc3BvbmRpbmcgY2xvc2VyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSkgeyAvL2lmIHRoZSBvcGVuZW5lciBpcyBub3QgaW4gdGhlIE9iamVjdCB3ZSBpZ25vcmUgaXRcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBfcGFyZW50ID0gdGhpcy50YWdzLnBhcmVudDsgLy9jaGVjayB0byBzZWUgaWYgaXQncyBhIGNsb3NhYmxlIHRhZy5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHRlbXBfcGFyZW50KSB7IC8vdGlsbCB3ZSByZWFjaCAnJyAodGhlIGluaXRpYWwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSA9PT0gdGVtcF9wYXJlbnQpIHsgLy9pZiB0aGlzIGlzIGl0IHVzZSBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcF9wYXJlbnQgPSB0aGlzLnRhZ3NbdGVtcF9wYXJlbnQgKyAncGFyZW50J107IC8vb3RoZXJ3aXNlIGtlZXAgb24gY2xpbWJpbmcgdXAgdGhlIERPTSBUcmVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBfcGFyZW50KSB7IC8vaWYgd2UgY2F1Z2h0IHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfbGV2ZWwgPSB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXTsgLy9zZXQgdGhlIGluZGVudF9sZXZlbCBhY2NvcmRpbmdseVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdzLnBhcmVudCA9IHRoaXMudGFnc1t0ZW1wX3BhcmVudCArICdwYXJlbnQnXTsgLy9hbmQgc2V0IHRoZSBjdXJyZW50IHBhcmVudFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddICsgJ3BhcmVudCddOyAvL2RlbGV0ZSB0aGUgY2xvc2VkIHRhZ3MgcGFyZW50IHJlZmVyZW5jZS4uLlxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXV07IC8vLi4uYW5kIHRoZSB0YWcgaXRzZWxmXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J107XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10tLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuaW5kZW50X3RvX3RhZyA9IGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAgICAgICAgIC8vIE1hdGNoIHRoZSBpbmRlbnRhdGlvbiBsZXZlbCB0byB0aGUgbGFzdCB1c2Ugb2YgdGhpcyB0YWcsIGJ1dCBkb24ndCByZW1vdmUgaXQuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdGVtcF9wYXJlbnQgPSB0aGlzLnRhZ3MucGFyZW50O1xuICAgICAgICAgICAgICAgIHdoaWxlICh0ZW1wX3BhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddID09PSB0ZW1wX3BhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGVtcF9wYXJlbnQgPSB0aGlzLnRhZ3NbdGVtcF9wYXJlbnQgKyAncGFyZW50J107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0ZW1wX3BhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbCA9IHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X3RhZyA9IGZ1bmN0aW9uKHBlZWspIHsgLy9mdW5jdGlvbiB0byBnZXQgYSBmdWxsIHRhZyBhbmQgcGFyc2UgaXRzIHR5cGVcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gW10sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJyxcbiAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0LCB0YWdfZW5kLFxuICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnRfY2hhcixcbiAgICAgICAgICAgICAgICAgICAgb3JpZ19wb3MgPSB0aGlzLnBvcyxcbiAgICAgICAgICAgICAgICAgICAgb3JpZ19saW5lX2NoYXJfY291bnQgPSB0aGlzLmxpbmVfY2hhcl9jb3VudDtcblxuICAgICAgICAgICAgICAgIHBlZWsgPSBwZWVrICE9PSB1bmRlZmluZWQgPyBwZWVrIDogZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IG9yaWdfcG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gb3JpZ19saW5lX2NoYXJfY291bnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5sZW5ndGggPyBjb250ZW50LmpvaW4oJycpIDogWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLlV0aWxzLmluX2FycmF5KGlucHV0X2NoYXIsIHRoaXMuVXRpbHMud2hpdGVzcGFjZSkpIHsgLy9kb24ndCB3YW50IHRvIGluc2VydCB1bm5lY2Vzc2FyeSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gXCInXCIgfHwgaW5wdXRfY2hhciA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciArPSB0aGlzLmdldF91bmZvcm1hdHRlZChpbnB1dF9jaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0X2NoYXIgPT09ICc9JykgeyAvL25vIHNwYWNlIGJlZm9yZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSAhPT0gJz0nICYmIGlucHV0X2NoYXIgIT09ICc+JyAmJiBzcGFjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9ubyBzcGFjZSBhZnRlciA9IG9yIGJlZm9yZSA+XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwYWNlX29yX3dyYXAoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzICYmIHRhZ19zdGFydF9jaGFyID09PSAnPCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gaW5zaWRlIGFuIGFuZ2xlLWJyYWNrZXQgdGFnLCBwdXQgc3BhY2VzIGFyb3VuZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlYmFycyBub3QgaW5zaWRlIG9mIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGlucHV0X2NoYXIgKyB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcykpID09PSAne3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciArPSB0aGlzLmdldF91bmZvcm1hdHRlZCgnfX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudC5sZW5ndGggJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdICE9PSAnICcgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdICE9PSAnPCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9ICcgJyArIGlucHV0X2NoYXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSAnPCcgJiYgIXRhZ19zdGFydF9jaGFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnQgPSB0aGlzLnBvcyAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnRfY2hhciA9ICc8JztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRlbnRfaGFuZGxlYmFycyAmJiAhdGFnX3N0YXJ0X2NoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCA+PSAyICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSA9PT0gJ3snICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAyXSA9PSAneycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gJyMnIHx8IGlucHV0X2NoYXIgPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnQgPSB0aGlzLnBvcyAtIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0ID0gdGhpcy5wb3MgLSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnRfY2hhciA9ICd7JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQucHVzaChpbnB1dF9jaGFyKTsgLy9pbnNlcnRzIGNoYXJhY3RlciBhdC1hLXRpbWUgKG9yIHN0cmluZylcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudFsxXSAmJiBjb250ZW50WzFdID09PSAnIScpIHsgLy9pZiB3ZSdyZSBpbiBhIGNvbW1lbnQsIGRvIHNvbWV0aGluZyBzcGVjaWFsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSB0cmVhdCBhbGwgY29tbWVudHMgYXMgbGl0ZXJhbHMsIGV2ZW4gbW9yZSB0aGFuIHByZWZvcm1hdHRlZCB0YWdzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBqdXN0IGxvb2sgZm9yIHRoZSBhcHByb3ByaWF0ZSBjbG9zZSB0YWdcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBbdGhpcy5nZXRfY29tbWVudCh0YWdfc3RhcnQpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzICYmIHRhZ19zdGFydF9jaGFyID09PSAneycgJiYgY29udGVudC5sZW5ndGggPiAyICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAyXSA9PT0gJ30nICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGlucHV0X2NoYXIgIT09ICc+Jyk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdGFnX2NvbXBsZXRlID0gY29udGVudC5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFnX2luZGV4O1xuICAgICAgICAgICAgICAgIHZhciB0YWdfb2Zmc2V0O1xuXG4gICAgICAgICAgICAgICAgaWYgKHRhZ19jb21wbGV0ZS5pbmRleE9mKCcgJykgIT09IC0xKSB7IC8vaWYgdGhlcmUncyB3aGl0ZXNwYWNlLCB0aGF0cyB3aGVyZSB0aGUgdGFnIG5hbWUgZW5kc1xuICAgICAgICAgICAgICAgICAgICB0YWdfaW5kZXggPSB0YWdfY29tcGxldGUuaW5kZXhPZignICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFnX2NvbXBsZXRlWzBdID09PSAneycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFnX2luZGV4ID0gdGFnX2NvbXBsZXRlLmluZGV4T2YoJ30nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL290aGVyd2lzZSBnbyB3aXRoIHRoZSB0YWcgZW5kaW5nXG4gICAgICAgICAgICAgICAgICAgIHRhZ19pbmRleCA9IHRhZ19jb21wbGV0ZS5pbmRleE9mKCc+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0YWdfY29tcGxldGVbMF0gPT09ICc8JyB8fCAhaW5kZW50X2hhbmRsZWJhcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFnX29mZnNldCA9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFnX29mZnNldCA9IHRhZ19jb21wbGV0ZVsyXSA9PT0gJyMnID8gMyA6IDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB0YWdfY2hlY2sgPSB0YWdfY29tcGxldGUuc3Vic3RyaW5nKHRhZ19vZmZzZXQsIHRhZ19pbmRleCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBpZiAodGFnX2NvbXBsZXRlLmNoYXJBdCh0YWdfY29tcGxldGUubGVuZ3RoIC0gMikgPT09ICcvJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLlV0aWxzLmluX2FycmF5KHRhZ19jaGVjaywgdGhpcy5VdGlscy5zaW5nbGVfdG9rZW4pKSB7IC8vaWYgdGhpcyB0YWcgbmFtZSBpcyBhIHNpbmdsZSB0YWcgdHlwZSAoZWl0aGVyIGluIHRoZSBsaXN0IG9yIGhhcyBhIGNsb3NpbmcgLylcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ1NJTkdMRSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGVudF9oYW5kbGViYXJzICYmIHRhZ19jb21wbGV0ZVswXSA9PT0gJ3snICYmIHRhZ19jaGVjayA9PT0gJ2Vsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfdG9fdGFnKCdpZicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdIQU5ETEVCQVJTX0VMU0UnO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfY29udGVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYXZlcnNlX3doaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc191bmZvcm1hdHRlZCh0YWdfY2hlY2ssIHVuZm9ybWF0dGVkKSkgeyAvLyBkbyBub3QgcmVmb3JtYXQgdGhlIFwidW5mb3JtYXR0ZWRcIiB0YWdzXG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSB0aGlzLmdldF91bmZvcm1hdHRlZCgnPC8nICsgdGFnX2NoZWNrICsgJz4nLCB0YWdfY29tcGxldGUpOyAvLy4uLmRlbGVnYXRlIHRvIGdldF91bmZvcm1hdHRlZCBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goY29tbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHRhZ19lbmQgPSB0aGlzLnBvcyAtIDE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0lOR0xFJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhZ19jaGVjayA9PT0gJ3NjcmlwdCcgJiZcbiAgICAgICAgICAgICAgICAgICAgKHRhZ19jb21wbGV0ZS5zZWFyY2goJ3R5cGUnKSA9PT0gLTEgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRhZ19jb21wbGV0ZS5zZWFyY2goJ3R5cGUnKSA+IC0xICYmXG4gICAgICAgICAgICAgICAgICAgIHRhZ19jb21wbGV0ZS5zZWFyY2goL1xcYih0ZXh0fGFwcGxpY2F0aW9uKVxcLyh4LSk/KGphdmFzY3JpcHR8ZWNtYXNjcmlwdHxqc2NyaXB0fGxpdmVzY3JpcHQpLykgPiAtMSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRfdGFnKHRhZ19jaGVjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ1NDUklQVCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhZ19jaGVjayA9PT0gJ3N0eWxlJyAmJlxuICAgICAgICAgICAgICAgICAgICAodGFnX2NvbXBsZXRlLnNlYXJjaCgndHlwZScpID09PSAtMSB8fFxuICAgICAgICAgICAgICAgICAgICAodGFnX2NvbXBsZXRlLnNlYXJjaCgndHlwZScpID4gLTEgJiYgdGFnX2NvbXBsZXRlLnNlYXJjaCgndGV4dC9jc3MnKSA+IC0xKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlY29yZF90YWcodGFnX2NoZWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU1RZTEUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YWdfY2hlY2suY2hhckF0KDApID09PSAnIScpIHsgLy9wZWVrIGZvciA8ISBjb21tZW50XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciBjb21tZW50cyBjb250ZW50IGlzIGFscmVhZHkgY29ycmVjdC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ1NJTkdMRSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYXZlcnNlX3doaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhZ19jaGVjay5jaGFyQXQoMCkgPT09ICcvJykgeyAvL3RoaXMgdGFnIGlzIGEgZG91YmxlIHRhZyBzbyBjaGVjayBmb3IgdGFnLWVuZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXRyaWV2ZV90YWcodGFnX2NoZWNrLnN1YnN0cmluZygxKSk7IC8vcmVtb3ZlIGl0IGFuZCBhbGwgYW5jZXN0b3JzXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ0VORCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vb3RoZXJ3aXNlIGl0J3MgYSBzdGFydC10YWdcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkX3RhZyh0YWdfY2hlY2spOyAvL3B1c2ggaXQgb24gdGhlIHRhZyBzdGFja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhZ19jaGVjay50b0xvd2VyQ2FzZSgpICE9PSAnaHRtbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9jb250ZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU1RBUlQnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3cgcHJlc2VydmluZyBvZiBuZXdsaW5lcyBhZnRlciBhIHN0YXJ0IG9yIGVuZCB0YWdcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwYWNlX29yX3dyYXAoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5VdGlscy5pbl9hcnJheSh0YWdfY2hlY2ssIHRoaXMuVXRpbHMuZXh0cmFfbGluZXJzKSkgeyAvL2NoZWNrIGlmIHRoaXMgZG91YmxlIG5lZWRzIGFuIGV4dHJhIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZShmYWxzZSwgdGhpcy5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3V0cHV0Lmxlbmd0aCAmJiB0aGlzLm91dHB1dFt0aGlzLm91dHB1dC5sZW5ndGggLSAyXSAhPT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUodHJ1ZSwgdGhpcy5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MgPSBvcmlnX3BvcztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgPSBvcmlnX2xpbmVfY2hhcl9jb3VudDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5qb2luKCcnKTsgLy9yZXR1cm5zIGZ1bGx5IGZvcm1hdHRlZCB0YWdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X2NvbW1lbnQgPSBmdW5jdGlvbihzdGFydF9wb3MpIHsgLy9mdW5jdGlvbiB0byByZXR1cm4gY29tbWVudCBjb250ZW50IGluIGl0cyBlbnRpcmV0eVxuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgd2lsbCBoYXZlIHZlcnkgcG9vciBwZXJmLCBidXQgd2lsbCB3b3JrIGZvciBub3cuXG4gICAgICAgICAgICAgICAgdmFyIGNvbW1lbnQgPSAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gJz4nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0X3BvcztcbiAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5wb3MgPD0gdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBpbnB1dF9jaGFyO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBjaGVjayBmb3IgdGhlIGRlbGltaXRlciBpZiB0aGUgbGFzdCBjaGFycyBtYXRjaFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29tbWVudFtjb21tZW50Lmxlbmd0aCAtIDFdID09PSBkZWxpbWl0ZXJbZGVsaW1pdGVyLmxlbmd0aCAtIDFdICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50LmluZGV4T2YoZGVsaW1pdGVyKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIHNlYXJjaCBmb3IgY3VzdG9tIGRlbGltaXRlciBmb3IgdGhlIGZpcnN0IGZldyBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2hlZCAmJiBjb21tZW50Lmxlbmd0aCA8IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tbWVudC5pbmRleE9mKCc8IVtpZicpID09PSAwKSB7IC8vcGVlayBmb3IgPCFbaWYgY29uZGl0aW9uYWwgY29tbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9ICc8IVtlbmRpZl0+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tbWVudC5pbmRleE9mKCc8IVtjZGF0YVsnKSA9PT0gMCkgeyAvL2lmIGl0J3MgYSA8W2NkYXRhWyBjb21tZW50Li4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gJ11dPic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1lbnQuaW5kZXhPZignPCFbJykgPT09IDApIHsgLy8gc29tZSBvdGhlciAhWyBjb21tZW50PyAuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnXT4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tZW50LmluZGV4T2YoJzwhLS0nKSA9PT0gMCkgeyAvLyA8IS0tIGNvbW1lbnQgLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gJy0tPic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBjb21tZW50O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfdW5mb3JtYXR0ZWQgPSBmdW5jdGlvbihkZWxpbWl0ZXIsIG9yaWdfdGFnKSB7IC8vZnVuY3Rpb24gdG8gcmV0dXJuIHVuZm9ybWF0dGVkIGNvbnRlbnQgaW4gaXRzIGVudGlyZXR5XG5cbiAgICAgICAgICAgICAgICBpZiAob3JpZ190YWcgJiYgb3JpZ190YWcudG9Mb3dlckNhc2UoKS5pbmRleE9mKGRlbGltaXRlcikgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X2NoYXIgPSAnJztcbiAgICAgICAgICAgICAgICB2YXIgY29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgIHZhciBtaW5faW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIHZhciBzcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZG8ge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLlV0aWxzLmluX2FycmF5KGlucHV0X2NoYXIsIHRoaXMuVXRpbHMud2hpdGVzcGFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudC0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0X2NoYXIgPT09ICdcXG4nIHx8IGlucHV0X2NoYXIgPT09ICdcXHInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiAgRG9uJ3QgY2hhbmdlIHRhYiBpbmRlbnRpb24gZm9yIHVuZm9ybWF0dGVkIGJsb2Nrcy4gIElmIHVzaW5nIGNvZGUgZm9yIGh0bWwgZWRpdGluZywgdGhpcyB3aWxsIGdyZWF0bHkgYWZmZWN0IDxwcmU+IHRhZ3MgaWYgdGhleSBhcmUgc3BlY2lmaWVkIGluIHRoZSAndW5mb3JtYXR0ZWQgYXJyYXknXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRoaXMuaW5kZW50X2xldmVsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gdGhpcy5pbmRlbnRfc3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlOyAvLy4uLmFuZCBtYWtlIHN1cmUgb3RoZXIgaW5kZW50YXRpb24gaXMgZXJhc2VkXG4gICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBpbnB1dF9jaGFyO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzICYmIGlucHV0X2NoYXIgPT09ICd7JyAmJiBjb250ZW50Lmxlbmd0aCAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMl0gPT09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlYmFycyBleHByZXNzaW9ucyBpbiBzdHJpbmdzIHNob3VsZCBhbHNvIGJlIHVuZm9ybWF0dGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSB0aGlzLmdldF91bmZvcm1hdHRlZCgnfX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXNlIGV4cHJlc3Npb25zIGFyZSBvcGFxdWUuICBJZ25vcmUgZGVsaW1pdGVycyBmb3VuZCBpbiB0aGVtLlxuICAgICAgICAgICAgICAgICAgICAgICAgbWluX2luZGV4ID0gY29udGVudC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IHdoaWxlIChjb250ZW50LnRvTG93ZXJDYXNlKCkuaW5kZXhPZihkZWxpbWl0ZXIsIG1pbl9pbmRleCkgPT09IC0xKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X3Rva2VuID0gZnVuY3Rpb24oKSB7IC8vaW5pdGlhbCBoYW5kbGVyIGZvciB0b2tlbi1yZXRyaWV2YWxcbiAgICAgICAgICAgICAgICB2YXIgdG9rZW47XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5sYXN0X3Rva2VuID09PSAnVEtfVEFHX1NDUklQVCcgfHwgdGhpcy5sYXN0X3Rva2VuID09PSAnVEtfVEFHX1NUWUxFJykgeyAvL2NoZWNrIGlmIHdlIG5lZWQgdG8gZm9ybWF0IGphdmFzY3JpcHRcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSB0aGlzLmxhc3RfdG9rZW4uc3Vic3RyKDcpO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRoaXMuZ2V0X2NvbnRlbnRzX3RvKHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbdG9rZW4sICdUS18nICsgdHlwZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfbW9kZSA9PT0gJ0NPTlRFTlQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuID0gdGhpcy5nZXRfY29udGVudCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0b2tlbiwgJ1RLX0NPTlRFTlQnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfbW9kZSA9PT0gJ1RBRycpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLmdldF90YWcoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWdfbmFtZV90eXBlID0gJ1RLX1RBR18nICsgdGhpcy50YWdfdHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbdG9rZW4sIHRhZ19uYW1lX3R5cGVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfZnVsbF9pbmRlbnQgPSBmdW5jdGlvbihsZXZlbCkge1xuICAgICAgICAgICAgICAgIGxldmVsID0gdGhpcy5pbmRlbnRfbGV2ZWwgKyBsZXZlbCB8fCAwO1xuICAgICAgICAgICAgICAgIGlmIChsZXZlbCA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBBcnJheShsZXZlbCArIDEpLmpvaW4odGhpcy5pbmRlbnRfc3RyaW5nKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuaXNfdW5mb3JtYXR0ZWQgPSBmdW5jdGlvbih0YWdfY2hlY2ssIHVuZm9ybWF0dGVkKSB7XG4gICAgICAgICAgICAgICAgLy9pcyB0aGlzIGFuIEhUTUw1IGJsb2NrLWxldmVsIGxpbms/XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLlV0aWxzLmluX2FycmF5KHRhZ19jaGVjaywgdW5mb3JtYXR0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodGFnX2NoZWNrLnRvTG93ZXJDYXNlKCkgIT09ICdhJyB8fCAhdGhpcy5VdGlscy5pbl9hcnJheSgnYScsIHVuZm9ybWF0dGVkKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL2F0IHRoaXMgcG9pbnQgd2UgaGF2ZSBhbiAgdGFnOyBpcyBpdHMgZmlyc3QgY2hpbGQgc29tZXRoaW5nIHdlIHdhbnQgdG8gcmVtYWluXG4gICAgICAgICAgICAgICAgLy91bmZvcm1hdHRlZD9cbiAgICAgICAgICAgICAgICB2YXIgbmV4dF90YWcgPSB0aGlzLmdldF90YWcodHJ1ZSAvKiBwZWVrLiAqLyApO1xuXG4gICAgICAgICAgICAgICAgLy8gdGVzdCBuZXh0X3RhZyB0byBzZWUgaWYgaXQgaXMganVzdCBodG1sIHRhZyAobm8gZXh0ZXJuYWwgY29udGVudClcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gKG5leHRfdGFnIHx8IFwiXCIpLm1hdGNoKC9eXFxzKjxcXHMqXFwvPyhbYS16XSopXFxzKltePl0qPlxccyokLyk7XG5cbiAgICAgICAgICAgICAgICAvLyBpZiBuZXh0X3RhZyBjb21lcyBiYWNrIGJ1dCBpcyBub3QgYW4gaXNvbGF0ZWQgdGFnLCB0aGVuXG4gICAgICAgICAgICAgICAgLy8gbGV0J3MgdHJlYXQgdGhlICdhJyB0YWcgYXMgaGF2aW5nIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAvLyBhbmQgcmVzcGVjdCB0aGUgdW5mb3JtYXR0ZWQgb3B0aW9uXG4gICAgICAgICAgICAgICAgaWYgKCF0YWcgfHwgdGhpcy5VdGlscy5pbl9hcnJheSh0YWcsIHVuZm9ybWF0dGVkKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5wcmludGVyID0gZnVuY3Rpb24oanNfc291cmNlLCBpbmRlbnRfY2hhcmFjdGVyLCBpbmRlbnRfc2l6ZSwgd3JhcF9saW5lX2xlbmd0aCwgYnJhY2Vfc3R5bGUpIHsgLy9oYW5kbGVzIGlucHV0L291dHB1dCBhbmQgc29tZSBvdGhlciBwcmludGluZyBmdW5jdGlvbnNcblxuICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQgPSBqc19zb3VyY2UgfHwgJyc7IC8vZ2V0cyB0aGUgaW5wdXQgZm9yIHRoZSBQYXJzZXJcbiAgICAgICAgICAgICAgICB0aGlzLm91dHB1dCA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2NoYXJhY3RlciA9IGluZGVudF9jaGFyYWN0ZXI7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfc3RyaW5nID0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfc2l6ZSA9IGluZGVudF9zaXplO1xuICAgICAgICAgICAgICAgIHRoaXMuYnJhY2Vfc3R5bGUgPSBicmFjZV9zdHlsZTtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy53cmFwX2xpbmVfbGVuZ3RoID0gd3JhcF9saW5lX2xlbmd0aDtcbiAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IDA7IC8vY291bnQgdG8gc2VlIGlmIHdyYXBfbGluZV9sZW5ndGggd2FzIGV4Y2VlZGVkXG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaW5kZW50X3NpemU7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9zdHJpbmcgKz0gdGhpcy5pbmRlbnRfY2hhcmFjdGVyO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZSA9IGZ1bmN0aW9uKGZvcmNlLCBhcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWFyciB8fCAhYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChmb3JjZSB8fCAoYXJyW2Fyci5sZW5ndGggLSAxXSAhPT0gJ1xcbicpKSB7IC8vd2UgbWlnaHQgd2FudCB0aGUgZXh0cmEgbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChhcnJbYXJyLmxlbmd0aCAtIDFdICE9PSAnXFxuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJbYXJyLmxlbmd0aCAtIDFdID0gcnRyaW0oYXJyW2Fyci5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhcnIucHVzaCgnXFxuJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludF9pbmRlbnRhdGlvbiA9IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaW5kZW50X2xldmVsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyci5wdXNoKHRoaXMuaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCArPSB0aGlzLmluZGVudF9zdHJpbmcubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfdG9rZW4gPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEF2b2lkIHByaW50aW5nIGluaXRpYWwgd2hpdGVzcGFjZS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNfd2hpdGVzcGFjZSh0ZXh0KSAmJiAhdGhpcy5vdXRwdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQgfHwgdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm91dHB1dC5sZW5ndGggJiYgdGhpcy5vdXRwdXRbdGhpcy5vdXRwdXQubGVuZ3RoIC0gMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9pbmRlbnRhdGlvbih0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCA9IGx0cmltKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfdG9rZW5fcmF3KHRleHQpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLnByaW50X3Rva2VuX3JhdyA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgYXJlIGdvaW5nIHRvIHByaW50IG5ld2xpbmVzLCB0cnVuY2F0ZSB0cmFpbGluZ1xuICAgICAgICAgICAgICAgICAgICAvLyB3aGl0ZXNwYWNlLCBhcyB0aGUgbmV3bGluZXMgd2lsbCByZXByZXNlbnQgdGhlIHNwYWNlLlxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5uZXdsaW5lcyA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgPSBydHJpbSh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0ICYmIHRleHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGV4dC5sZW5ndGggPiAxICYmIHRleHRbdGV4dC5sZW5ndGggLSAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB1bmZvcm1hdHRlZCB0YWdzIGNhbiBncmFiIG5ld2xpbmVzIGFzIHRoZWlyIGxhc3QgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vdXRwdXQucHVzaCh0ZXh0LnNsaWNlKDAsIC0xKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKGZhbHNlLCB0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0LnB1c2godGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IHRoaXMubmV3bGluZXM7IG4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKG4gPiAwLCB0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXdsaW5lcyA9IDA7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsKys7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMudW5pbmRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZW50X2xldmVsID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfbGV2ZWwtLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICAvKl9fX19fX19fX19fX19fX19fX19fXy0tLS0tLS0tLS0tLS0tLS0tLS0tX19fX19fX19fX19fX19fX19fX19fKi9cblxuICAgICAgICBtdWx0aV9wYXJzZXIgPSBuZXcgUGFyc2VyKCk7IC8vd3JhcHBpbmcgZnVuY3Rpb25zIFBhcnNlclxuICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRlcihodG1sX3NvdXJjZSwgaW5kZW50X2NoYXJhY3RlciwgaW5kZW50X3NpemUsIHdyYXBfbGluZV9sZW5ndGgsIGJyYWNlX3N0eWxlKTsgLy9pbml0aWFsaXplIHN0YXJ0aW5nIHZhbHVlc1xuXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgdCA9IG11bHRpX3BhcnNlci5nZXRfdG9rZW4oKTtcbiAgICAgICAgICAgIG11bHRpX3BhcnNlci50b2tlbl90ZXh0ID0gdFswXTtcbiAgICAgICAgICAgIG11bHRpX3BhcnNlci50b2tlbl90eXBlID0gdFsxXTtcblxuICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci50b2tlbl90eXBlID09PSAnVEtfRU9GJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKG11bHRpX3BhcnNlci50b2tlbl90eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX1NUQVJUJzpcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X25ld2xpbmUoZmFsc2UsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLmluZGVudF9jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuaW5kZW50X2NvbnRlbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfU1RZTEUnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19TQ1JJUFQnOlxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19FTkQnOlxuICAgICAgICAgICAgICAgICAgICAvL1ByaW50IG5ldyBsaW5lIG9ubHkgaWYgdGhlIHRhZyBoYXMgbm8gY29udGVudCBhbmQgaGFzIGNoaWxkXG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIubGFzdF90b2tlbiA9PT0gJ1RLX0NPTlRFTlQnICYmIG11bHRpX3BhcnNlci5sYXN0X3RleHQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFnX25hbWUgPSBtdWx0aV9wYXJzZXIudG9rZW5fdGV4dC5tYXRjaCgvXFx3Ky8pWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLm91dHB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWdfZXh0cmFjdGVkX2Zyb21fbGFzdF9vdXRwdXQgPSBtdWx0aV9wYXJzZXIub3V0cHV0W211bHRpX3BhcnNlci5vdXRwdXQubGVuZ3RoIC0gMV0ubWF0Y2goLyg/Ojx8e3sjKVxccyooXFx3KykvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWdfZXh0cmFjdGVkX2Zyb21fbGFzdF9vdXRwdXQgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWdfZXh0cmFjdGVkX2Zyb21fbGFzdF9vdXRwdXRbMV0gIT09IHRhZ19uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X25ld2xpbmUoZmFsc2UsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19TSU5HTEUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBhZGQgYSBuZXdsaW5lIGJlZm9yZSBlbGVtZW50cyB0aGF0IHNob3VsZCByZW1haW4gdW5mb3JtYXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0YWdfY2hlY2sgPSBtdWx0aV9wYXJzZXIudG9rZW5fdGV4dC5tYXRjaCgvXlxccyo8KFthLXotXSspL2kpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRhZ19jaGVjayB8fCAhbXVsdGlfcGFyc2VyLlV0aWxzLmluX2FycmF5KHRhZ19jaGVja1sxXSwgdW5mb3JtYXR0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX0hBTkRMRUJBUlNfRUxTRSc6XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIuaW5kZW50X2NvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5pbmRlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5pbmRlbnRfY29udGVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX0NPTlRFTlQnOlxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ1RBRyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1NUWUxFJzpcbiAgICAgICAgICAgICAgICBjYXNlICdUS19TQ1JJUFQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3RleHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IG11bHRpX3BhcnNlci50b2tlbl90ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9iZWF1dGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdF9pbmRlbnRfbGV2ZWwgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci50b2tlbl90eXBlID09PSAnVEtfU0NSSVBUJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9iZWF1dGlmaWVyID0gdHlwZW9mIGpzX2JlYXV0aWZ5ID09PSAnZnVuY3Rpb24nICYmIGpzX2JlYXV0aWZ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtdWx0aV9wYXJzZXIudG9rZW5fdHlwZSA9PT0gJ1RLX1NUWUxFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9iZWF1dGlmaWVyID0gdHlwZW9mIGNzc19iZWF1dGlmeSA9PT0gJ2Z1bmN0aW9uJyAmJiBjc3NfYmVhdXRpZnk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmluZGVudF9zY3JpcHRzID09PSBcImtlZXBcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdF9pbmRlbnRfbGV2ZWwgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmluZGVudF9zY3JpcHRzID09PSBcInNlcGFyYXRlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHRfaW5kZW50X2xldmVsID0gLW11bHRpX3BhcnNlci5pbmRlbnRfbGV2ZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRlbnRhdGlvbiA9IG11bHRpX3BhcnNlci5nZXRfZnVsbF9pbmRlbnQoc2NyaXB0X2luZGVudF9sZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2JlYXV0aWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBCZWF1dGlmaWVyIGlmIGF2YWxpYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgPSBfYmVhdXRpZmllcih0ZXh0LnJlcGxhY2UoL15cXHMqLywgaW5kZW50YXRpb24pLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2ltcGx5IGluZGVudCB0aGUgc3RyaW5nIG90aGVyd2lzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aGl0ZSA9IHRleHQubWF0Y2goL15cXHMqLylbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF9sZXZlbCA9IHdoaXRlLm1hdGNoKC9bXlxcblxccl0qJC8pWzBdLnNwbGl0KG11bHRpX3BhcnNlci5pbmRlbnRfc3RyaW5nKS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWluZGVudCA9IG11bHRpX3BhcnNlci5nZXRfZnVsbF9pbmRlbnQoc2NyaXB0X2luZGVudF9sZXZlbCAtIF9sZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXlxccyovLCBpbmRlbnRhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcclxcbnxcXHJ8XFxuL2csICdcXG4nICsgcmVpbmRlbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHMrJC8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuX3Jhdyh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZSh0cnVlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ1RBRyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIHNob3VsZCBub3QgYmUgZ2V0dGluZyBoZXJlIGJ1dCB3ZSBkb24ndCB3YW50IHRvIGRyb3AgaW5wdXQgb24gdGhlIGZsb29yXG4gICAgICAgICAgICAgICAgICAgIC8vIEp1c3Qgb3V0cHV0IHRoZSB0ZXh0IGFuZCBtb3ZlIG9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdWx0aV9wYXJzZXIubGFzdF90b2tlbiA9IG11bHRpX3BhcnNlci50b2tlbl90eXBlO1xuICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmxhc3RfdGV4dCA9IG11bHRpX3BhcnNlci50b2tlbl90ZXh0O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzd2VldF9jb2RlID0gbXVsdGlfcGFyc2VyLm91dHB1dC5qb2luKCcnKS5yZXBsYWNlKC9bXFxyXFxuXFx0IF0rJC8sICcnKTtcbiAgICAgICAgaWYgKGVuZF93aXRoX25ld2xpbmUpIHtcbiAgICAgICAgICAgIHN3ZWV0X2NvZGUgKz0gJ1xcbic7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN3ZWV0X2NvZGU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBBTUQgKCBodHRwczovL2dpdGh1Yi5jb20vYW1kanMvYW1kanMtYXBpL3dpa2kvQU1EI2RlZmluZWFtZC1wcm9wZXJ0eS0gKVxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcIi4vYmVhdXRpZnlcIiwgXCIuL2JlYXV0aWZ5LWNzc1wiXSwgZnVuY3Rpb24ocmVxdWlyZWFtZCkge1xuICAgICAgICAgICAgdmFyIGpzX2JlYXV0aWZ5ID0gIHJlcXVpcmVhbWQoXCIuL2JlYXV0aWZ5XCIpO1xuICAgICAgICAgICAgdmFyIGNzc19iZWF1dGlmeSA9ICByZXF1aXJlYW1kKFwiLi9iZWF1dGlmeS1jc3NcIik7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGh0bWxfYmVhdXRpZnk6IGZ1bmN0aW9uKGh0bWxfc291cmNlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMsIGpzX2JlYXV0aWZ5LmpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnkuY3NzX2JlYXV0aWZ5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQ29tbW9uSlMuIEp1c3QgcHV0IHRoaXMgZmlsZSBzb21ld2hlcmUgb24geW91ciByZXF1aXJlLnBhdGhzXG4gICAgICAgIC8vIGFuZCB5b3Ugd2lsbCBiZSBhYmxlIHRvIGB2YXIgaHRtbF9iZWF1dGlmeSA9IHJlcXVpcmUoXCJiZWF1dGlmeVwiKS5odG1sX2JlYXV0aWZ5YC5cbiAgICAgICAgdmFyIGpzX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9iZWF1dGlmeS5qcycpO1xuICAgICAgICB2YXIgY3NzX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9iZWF1dGlmeS1jc3MuanMnKTtcblxuICAgICAgICBleHBvcnRzLmh0bWxfYmVhdXRpZnkgPSBmdW5jdGlvbihodG1sX3NvdXJjZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMsIGpzX2JlYXV0aWZ5LmpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnkuY3NzX2JlYXV0aWZ5KTtcbiAgICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcnVubmluZyBhIHdlYiBwYWdlIGFuZCBkb24ndCBoYXZlIGVpdGhlciBvZiB0aGUgYWJvdmUsIGFkZCBvdXIgb25lIGdsb2JhbFxuICAgICAgICB3aW5kb3cuaHRtbF9iZWF1dGlmeSA9IGZ1bmN0aW9uKGh0bWxfc291cmNlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywgd2luZG93LmpzX2JlYXV0aWZ5LCB3aW5kb3cuY3NzX2JlYXV0aWZ5KTtcbiAgICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gSWYgd2UgZG9uJ3QgZXZlbiBoYXZlIHdpbmRvdywgdHJ5IGdsb2JhbC5cbiAgICAgICAgZ2xvYmFsLmh0bWxfYmVhdXRpZnkgPSBmdW5jdGlvbihodG1sX3NvdXJjZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMsIGdsb2JhbC5qc19iZWF1dGlmeSwgZ2xvYmFsLmNzc19iZWF1dGlmeSk7XG4gICAgICAgIH07XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNoaW50IGN1cmx5OnRydWUsIGVxZXFlcTp0cnVlLCBsYXhicmVhazp0cnVlLCBub2VtcHR5OmZhbHNlICovXG4vKlxuXG4gIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gIENvcHlyaWdodCAoYykgMjAwNy0yMDEzIEVpbmFyIExpZWxtYW5pcyBhbmQgY29udHJpYnV0b3JzLlxuXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzXG4gICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlNcbiAgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4gIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAgU09GVFdBUkUuXG5cbiBKUyBCZWF1dGlmaWVyXG4tLS0tLS0tLS0tLS0tLS1cblxuXG4gIFdyaXR0ZW4gYnkgRWluYXIgTGllbG1hbmlzLCA8ZWluYXJAanNiZWF1dGlmaWVyLm9yZz5cbiAgICAgIGh0dHA6Ly9qc2JlYXV0aWZpZXIub3JnL1xuXG4gIE9yaWdpbmFsbHkgY29udmVydGVkIHRvIGphdmFzY3JpcHQgYnkgVml0YWwsIDx2aXRhbDc2QGdtYWlsLmNvbT5cbiAgXCJFbmQgYnJhY2VzIG9uIG93biBsaW5lXCIgYWRkZWQgYnkgQ2hyaXMgSi4gU2h1bGwsIDxjaHJpc2pzaHVsbEBnbWFpbC5jb20+XG4gIFBhcnNpbmcgaW1wcm92ZW1lbnRzIGZvciBicmFjZS1sZXNzIHN0YXRlbWVudHMgYnkgTGlhbSBOZXdtYW4gPGJpdHdpc2VtYW5AZ21haWwuY29tPlxuXG5cbiAgVXNhZ2U6XG4gICAganNfYmVhdXRpZnkoanNfc291cmNlX3RleHQpO1xuICAgIGpzX2JlYXV0aWZ5KGpzX3NvdXJjZV90ZXh0LCBvcHRpb25zKTtcblxuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgaW5kZW50X3NpemUgKGRlZmF1bHQgNCkgICAgICAgICAgLSBpbmRlbnRhdGlvbiBzaXplLFxuICAgIGluZGVudF9jaGFyIChkZWZhdWx0IHNwYWNlKSAgICAgIC0gY2hhcmFjdGVyIHRvIGluZGVudCB3aXRoLFxuICAgIHByZXNlcnZlX25ld2xpbmVzIChkZWZhdWx0IHRydWUpIC0gd2hldGhlciBleGlzdGluZyBsaW5lIGJyZWFrcyBzaG91bGQgYmUgcHJlc2VydmVkLFxuICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyAoZGVmYXVsdCB1bmxpbWl0ZWQpIC0gbWF4aW11bSBudW1iZXIgb2YgbGluZSBicmVha3MgdG8gYmUgcHJlc2VydmVkIGluIG9uZSBjaHVuayxcblxuICAgIGpzbGludF9oYXBweSAoZGVmYXVsdCBmYWxzZSkgLSBpZiB0cnVlLCB0aGVuIGpzbGludC1zdHJpY3RlciBtb2RlIGlzIGVuZm9yY2VkLlxuXG4gICAgICAgICAgICBqc2xpbnRfaGFwcHkgICAgICAgICFqc2xpbnRfaGFwcHlcbiAgICAgICAgICAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgZnVuY3Rpb24gKCkgICAgICAgICBmdW5jdGlvbigpXG5cbiAgICAgICAgICAgIHN3aXRjaCAoKSB7ICAgICAgICAgc3dpdGNoKCkge1xuICAgICAgICAgICAgY2FzZSAxOiAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgYnJlYWs7ICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICB9XG5cbiAgICBzcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uIChkZWZhdWx0IGZhbHNlKSAtIHNob3VsZCB0aGUgc3BhY2UgYmVmb3JlIGFuIGFub255bW91cyBmdW5jdGlvbidzIHBhcmVucyBiZSBhZGRlZCwgXCJmdW5jdGlvbigpXCIgdnMgXCJmdW5jdGlvbiAoKVwiLFxuICAgICAgICAgIE5PVEU6IFRoaXMgb3B0aW9uIGlzIG92ZXJyaWRlbiBieSBqc2xpbnRfaGFwcHkgKGkuZS4gaWYganNsaW50X2hhcHB5IGlzIHRydWUsIHNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gaXMgdHJ1ZSBieSBkZXNpZ24pXG5cbiAgICBicmFjZV9zdHlsZSAoZGVmYXVsdCBcImNvbGxhcHNlXCIpIC0gXCJjb2xsYXBzZVwiIHwgXCJleHBhbmRcIiB8IFwiZW5kLWV4cGFuZFwiXG4gICAgICAgICAgICBwdXQgYnJhY2VzIG9uIHRoZSBzYW1lIGxpbmUgYXMgY29udHJvbCBzdGF0ZW1lbnRzIChkZWZhdWx0KSwgb3IgcHV0IGJyYWNlcyBvbiBvd24gbGluZSAoQWxsbWFuIC8gQU5TSSBzdHlsZSksIG9yIGp1c3QgcHV0IGVuZCBicmFjZXMgb24gb3duIGxpbmUuXG5cbiAgICBzcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwgKGRlZmF1bHQgdHJ1ZSkgLSBzaG91bGQgdGhlIHNwYWNlIGJlZm9yZSBjb25kaXRpb25hbCBzdGF0ZW1lbnQgYmUgYWRkZWQsIFwiaWYodHJ1ZSlcIiB2cyBcImlmICh0cnVlKVwiLFxuXG4gICAgdW5lc2NhcGVfc3RyaW5ncyAoZGVmYXVsdCBmYWxzZSkgLSBzaG91bGQgcHJpbnRhYmxlIGNoYXJhY3RlcnMgaW4gc3RyaW5ncyBlbmNvZGVkIGluIFxceE5OIG5vdGF0aW9uIGJlIHVuZXNjYXBlZCwgXCJleGFtcGxlXCIgdnMgXCJcXHg2NVxceDc4XFx4NjFcXHg2ZFxceDcwXFx4NmNcXHg2NVwiXG5cbiAgICB3cmFwX2xpbmVfbGVuZ3RoIChkZWZhdWx0IHVubGltaXRlZCkgLSBsaW5lcyBzaG91bGQgd3JhcCBhdCBuZXh0IG9wcG9ydHVuaXR5IGFmdGVyIHRoaXMgbnVtYmVyIG9mIGNoYXJhY3RlcnMuXG4gICAgICAgICAgTk9URTogVGhpcyBpcyBub3QgYSBoYXJkIGxpbWl0LiBMaW5lcyB3aWxsIGNvbnRpbnVlIHVudGlsIGEgcG9pbnQgd2hlcmUgYSBuZXdsaW5lIHdvdWxkXG4gICAgICAgICAgICAgICAgYmUgcHJlc2VydmVkIGlmIGl0IHdlcmUgcHJlc2VudC5cblxuICAgIGVuZF93aXRoX25ld2xpbmUgKGRlZmF1bHQgZmFsc2UpICAtIGVuZCBvdXRwdXQgd2l0aCBhIG5ld2xpbmVcblxuXG4gICAgZS5nXG5cbiAgICBqc19iZWF1dGlmeShqc19zb3VyY2VfdGV4dCwge1xuICAgICAgJ2luZGVudF9zaXplJzogMSxcbiAgICAgICdpbmRlbnRfY2hhcic6ICdcXHQnXG4gICAgfSk7XG5cbiovXG5cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBhY29ybiA9IHt9O1xuICAgIChmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICAgLy8gVGhpcyBzZWN0aW9uIG9mIGNvZGUgaXMgdGFrZW4gZnJvbSBhY29ybi5cbiAgICAgIC8vXG4gICAgICAvLyBBY29ybiB3YXMgd3JpdHRlbiBieSBNYXJpam4gSGF2ZXJiZWtlIGFuZCByZWxlYXNlZCB1bmRlciBhbiBNSVRcbiAgICAgIC8vIGxpY2Vuc2UuIFRoZSBVbmljb2RlIHJlZ2V4cHMgKGZvciBpZGVudGlmaWVycyBhbmQgd2hpdGVzcGFjZSkgd2VyZVxuICAgICAgLy8gdGFrZW4gZnJvbSBbRXNwcmltYV0oaHR0cDovL2VzcHJpbWEub3JnKSBieSBBcml5YSBIaWRheWF0LlxuICAgICAgLy9cbiAgICAgIC8vIEdpdCByZXBvc2l0b3JpZXMgZm9yIEFjb3JuIGFyZSBhdmFpbGFibGUgYXRcbiAgICAgIC8vXG4gICAgICAvLyAgICAgaHR0cDovL21hcmlqbmhhdmVyYmVrZS5ubC9naXQvYWNvcm5cbiAgICAgIC8vICAgICBodHRwczovL2dpdGh1Yi5jb20vbWFyaWpuaC9hY29ybi5naXRcblxuICAgICAgLy8gIyMgQ2hhcmFjdGVyIGNhdGVnb3JpZXNcblxuICAgICAgLy8gQmlnIHVnbHkgcmVndWxhciBleHByZXNzaW9ucyB0aGF0IG1hdGNoIGNoYXJhY3RlcnMgaW4gdGhlXG4gICAgICAvLyB3aGl0ZXNwYWNlLCBpZGVudGlmaWVyLCBhbmQgaWRlbnRpZmllci1zdGFydCBjYXRlZ29yaWVzLiBUaGVzZVxuICAgICAgLy8gYXJlIG9ubHkgYXBwbGllZCB3aGVuIGEgY2hhcmFjdGVyIGlzIGZvdW5kIHRvIGFjdHVhbGx5IGhhdmUgYVxuICAgICAgLy8gY29kZSBwb2ludCBhYm92ZSAxMjguXG5cbiAgICAgIHZhciBub25BU0NJSXdoaXRlc3BhY2UgPSAvW1xcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0vO1xuICAgICAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgPSBcIlxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2RcXHUwYzU4XFx1MGM1OVxcdTBjNjBcXHUwYzYxXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDYwXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWMxLVxcdTE5YzdcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5N1xcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhODAtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXCI7XG4gICAgICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyQ2hhcnMgPSBcIlxcdTAzMDAtXFx1MDM2ZlxcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2MjAtXFx1MDY0OVxcdTA2NzItXFx1MDZkM1xcdTA2ZTctXFx1MDZlOFxcdTA2ZmItXFx1MDZmY1xcdTA3MzAtXFx1MDc0YVxcdTA4MDAtXFx1MDgxNFxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NDAtXFx1MDg1N1xcdTA4ZTQtXFx1MDhmZVxcdTA5MDAtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjItXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5ODEtXFx1MDk4M1xcdTA5YmNcXHUwOWJlLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5ZDdcXHUwOWRmLVxcdTA5ZTBcXHUwYTAxLVxcdTBhMDNcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE2Ni1cXHUwYTcxXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhYmNcXHUwYWJlLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWUyLVxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNWYtXFx1MGI2MFxcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMS1cXHUwYzAzXFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyLVxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgyXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTItXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBkMDJcXHUwZDAzXFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ1N1xcdTBkNjItXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGYyXFx1MGRmM1xcdTBlMzQtXFx1MGUzYVxcdTBlNDAtXFx1MGU0NVxcdTBlNTAtXFx1MGU1OVxcdTBlYjQtXFx1MGViOVxcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGY0MS1cXHUwZjQ3XFx1MGY3MS1cXHUwZjg0XFx1MGY4Ni1cXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMDAtXFx1MTAyOVxcdTEwNDAtXFx1MTA0OVxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTE3MGUtXFx1MTcxMFxcdTE3MjAtXFx1MTczMFxcdTE3NDAtXFx1MTc1MFxcdTE3NzJcXHUxNzczXFx1MTc4MC1cXHUxN2IyXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NTEtXFx1MTk2ZFxcdTE5YjAtXFx1MTljMFxcdTE5YzgtXFx1MTljOVxcdTE5ZDAtXFx1MTlkOVxcdTFhMDAtXFx1MWExNVxcdTFhMjAtXFx1MWE1M1xcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFiNDYtXFx1MWI0YlxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMDAtXFx1MWMyMlxcdTFjNDAtXFx1MWM0OVxcdTFjNWItXFx1MWM3ZFxcdTFjZDAtXFx1MWNkMlxcdTFkMDAtXFx1MWRiZVxcdTFlMDEtXFx1MWYxNVxcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTJkODEtXFx1MmQ5NlxcdTJkZTAtXFx1MmRmZlxcdTMwMjEtXFx1MzAyOFxcdTMwOTlcXHUzMDlhXFx1YTY0MC1cXHVhNjZkXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZlxcdWE2ZjAtXFx1YTZmMVxcdWE3ZjgtXFx1YTgwMFxcdWE4MDZcXHVhODBiXFx1YTgyMy1cXHVhODI3XFx1YTg4MC1cXHVhODgxXFx1YThiNC1cXHVhOGM0XFx1YThkMC1cXHVhOGQ5XFx1YThmMy1cXHVhOGY3XFx1YTkwMC1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTkzMC1cXHVhOTQ1XFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YWEwMC1cXHVhYTI3XFx1YWE0MC1cXHVhYTQxXFx1YWE0Yy1cXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE3YlxcdWFhZTAtXFx1YWFlOVxcdWFhZjItXFx1YWFmM1xcdWFiYzAtXFx1YWJlMVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIyMC1cXHVmYjI4XFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTI2XFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmXCI7XG4gICAgICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIFwiXVwiKTtcbiAgICAgIHZhciBub25BU0NJSWlkZW50aWZpZXIgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIG5vbkFTQ0lJaWRlbnRpZmllckNoYXJzICsgXCJdXCIpO1xuXG4gICAgICAvLyBXaGV0aGVyIGEgc2luZ2xlIGNoYXJhY3RlciBkZW5vdGVzIGEgbmV3bGluZS5cblxuICAgICAgdmFyIG5ld2xpbmUgPSBleHBvcnRzLm5ld2xpbmUgPSAvW1xcblxcclxcdTIwMjhcXHUyMDI5XS87XG5cbiAgICAgIC8vIE1hdGNoZXMgYSB3aG9sZSBsaW5lIGJyZWFrICh3aGVyZSBDUkxGIGlzIGNvbnNpZGVyZWQgYSBzaW5nbGVcbiAgICAgIC8vIGxpbmUgYnJlYWspLiBVc2VkIHRvIGNvdW50IGxpbmVzLlxuXG4gICAgICB2YXIgbGluZUJyZWFrID0gL1xcclxcbnxbXFxuXFxyXFx1MjAyOFxcdTIwMjldL2c7XG5cbiAgICAgIC8vIFRlc3Qgd2hldGhlciBhIGdpdmVuIGNoYXJhY3RlciBjb2RlIHN0YXJ0cyBhbiBpZGVudGlmaWVyLlxuXG4gICAgICB2YXIgaXNJZGVudGlmaWVyU3RhcnQgPSBleHBvcnRzLmlzSWRlbnRpZmllclN0YXJ0ID0gZnVuY3Rpb24oY29kZSkge1xuICAgICAgICBpZiAoY29kZSA8IDY1KSByZXR1cm4gY29kZSA9PT0gMzY7XG4gICAgICAgIGlmIChjb2RlIDwgOTEpIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoY29kZSA8IDk3KSByZXR1cm4gY29kZSA9PT0gOTU7XG4gICAgICAgIGlmIChjb2RlIDwgMTIzKXJldHVybiB0cnVlO1xuICAgICAgICByZXR1cm4gY29kZSA+PSAweGFhICYmIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0LnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBjaGFyYWN0ZXIgaXMgcGFydCBvZiBhbiBpZGVudGlmaWVyLlxuXG4gICAgICB2YXIgaXNJZGVudGlmaWVyQ2hhciA9IGV4cG9ydHMuaXNJZGVudGlmaWVyQ2hhciA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPCA0OCkgcmV0dXJuIGNvZGUgPT09IDM2O1xuICAgICAgICBpZiAoY29kZSA8IDU4KSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKGNvZGUgPCA2NSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoY29kZSA8IDkxKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKGNvZGUgPCA5NykgcmV0dXJuIGNvZGUgPT09IDk1O1xuICAgICAgICBpZiAoY29kZSA8IDEyMylyZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNvZGUgPj0gMHhhYSAmJiBub25BU0NJSWlkZW50aWZpZXIudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpKTtcbiAgICAgIH07XG4gICAgfSkoYWNvcm4pO1xuXG4gICAgZnVuY3Rpb24gaW5fYXJyYXkod2hhdCwgYXJyKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAoYXJyW2ldID09PSB3aGF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyaW0ocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24ganNfYmVhdXRpZnkoanNfc291cmNlX3RleHQsIG9wdGlvbnMpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBiZWF1dGlmaWVyID0gbmV3IEJlYXV0aWZpZXIoanNfc291cmNlX3RleHQsIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gYmVhdXRpZmllci5iZWF1dGlmeSgpO1xuICAgIH1cblxuICAgIHZhciBNT0RFID0ge1xuICAgICAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsIC8vICdCTE9DSydcbiAgICAgICAgICAgIFN0YXRlbWVudDogJ1N0YXRlbWVudCcsIC8vICdTVEFURU1FTlQnXG4gICAgICAgICAgICBPYmplY3RMaXRlcmFsOiAnT2JqZWN0TGl0ZXJhbCcsIC8vICdPQkpFQ1QnLFxuICAgICAgICAgICAgQXJyYXlMaXRlcmFsOiAnQXJyYXlMaXRlcmFsJywgLy8nW0VYUFJFU1NJT05dJyxcbiAgICAgICAgICAgIEZvckluaXRpYWxpemVyOiAnRm9ySW5pdGlhbGl6ZXInLCAvLycoRk9SLUVYUFJFU1NJT04pJyxcbiAgICAgICAgICAgIENvbmRpdGlvbmFsOiAnQ29uZGl0aW9uYWwnLCAvLycoQ09ORC1FWFBSRVNTSU9OKScsXG4gICAgICAgICAgICBFeHByZXNzaW9uOiAnRXhwcmVzc2lvbicgLy8nKEVYUFJFU1NJT04pJ1xuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gQmVhdXRpZmllcihqc19zb3VyY2VfdGV4dCwgb3B0aW9ucykge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgdmFyIG91dHB1dFxuICAgICAgICB2YXIgdG9rZW5zID0gW10sIHRva2VuX3BvcztcbiAgICAgICAgdmFyIFRva2VuaXplcjtcbiAgICAgICAgdmFyIGN1cnJlbnRfdG9rZW47XG4gICAgICAgIHZhciBsYXN0X3R5cGUsIGxhc3RfbGFzdF90ZXh0LCBpbmRlbnRfc3RyaW5nO1xuICAgICAgICB2YXIgZmxhZ3MsIHByZXZpb3VzX2ZsYWdzLCBmbGFnX3N0b3JlO1xuICAgICAgICB2YXIgcHJlZml4O1xuXG4gICAgICAgIHZhciBoYW5kbGVycywgb3B0O1xuICAgICAgICB2YXIgYmFzZUluZGVudFN0cmluZyA9ICcnO1xuXG4gICAgICAgIGhhbmRsZXJzID0ge1xuICAgICAgICAgICAgJ1RLX1NUQVJUX0VYUFInOiBoYW5kbGVfc3RhcnRfZXhwcixcbiAgICAgICAgICAgICdUS19FTkRfRVhQUic6IGhhbmRsZV9lbmRfZXhwcixcbiAgICAgICAgICAgICdUS19TVEFSVF9CTE9DSyc6IGhhbmRsZV9zdGFydF9ibG9jayxcbiAgICAgICAgICAgICdUS19FTkRfQkxPQ0snOiBoYW5kbGVfZW5kX2Jsb2NrLFxuICAgICAgICAgICAgJ1RLX1dPUkQnOiBoYW5kbGVfd29yZCxcbiAgICAgICAgICAgICdUS19SRVNFUlZFRCc6IGhhbmRsZV93b3JkLFxuICAgICAgICAgICAgJ1RLX1NFTUlDT0xPTic6IGhhbmRsZV9zZW1pY29sb24sXG4gICAgICAgICAgICAnVEtfU1RSSU5HJzogaGFuZGxlX3N0cmluZyxcbiAgICAgICAgICAgICdUS19FUVVBTFMnOiBoYW5kbGVfZXF1YWxzLFxuICAgICAgICAgICAgJ1RLX09QRVJBVE9SJzogaGFuZGxlX29wZXJhdG9yLFxuICAgICAgICAgICAgJ1RLX0NPTU1BJzogaGFuZGxlX2NvbW1hLFxuICAgICAgICAgICAgJ1RLX0JMT0NLX0NPTU1FTlQnOiBoYW5kbGVfYmxvY2tfY29tbWVudCxcbiAgICAgICAgICAgICdUS19JTkxJTkVfQ09NTUVOVCc6IGhhbmRsZV9pbmxpbmVfY29tbWVudCxcbiAgICAgICAgICAgICdUS19DT01NRU5UJzogaGFuZGxlX2NvbW1lbnQsXG4gICAgICAgICAgICAnVEtfRE9UJzogaGFuZGxlX2RvdCxcbiAgICAgICAgICAgICdUS19VTktOT1dOJzogaGFuZGxlX3Vua25vd24sXG4gICAgICAgICAgICAnVEtfRU9GJzogaGFuZGxlX2VvZlxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZV9mbGFncyhmbGFnc19iYXNlLCBtb2RlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dF9pbmRlbnRfbGV2ZWwgPSAwO1xuICAgICAgICAgICAgaWYgKGZsYWdzX2Jhc2UpIHtcbiAgICAgICAgICAgICAgICBuZXh0X2luZGVudF9sZXZlbCA9IGZsYWdzX2Jhc2UuaW5kZW50YXRpb25fbGV2ZWw7XG4gICAgICAgICAgICAgICAgaWYgKCFvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3NfYmFzZS5saW5lX2luZGVudF9sZXZlbCA+IG5leHRfaW5kZW50X2xldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRfaW5kZW50X2xldmVsID0gZmxhZ3NfYmFzZS5saW5lX2luZGVudF9sZXZlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBuZXh0X2ZsYWdzID0ge1xuICAgICAgICAgICAgICAgIG1vZGU6IG1vZGUsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBmbGFnc19iYXNlLFxuICAgICAgICAgICAgICAgIGxhc3RfdGV4dDogZmxhZ3NfYmFzZSA/IGZsYWdzX2Jhc2UubGFzdF90ZXh0IDogJycsIC8vIGxhc3QgdG9rZW4gdGV4dFxuICAgICAgICAgICAgICAgIGxhc3Rfd29yZDogZmxhZ3NfYmFzZSA/IGZsYWdzX2Jhc2UubGFzdF93b3JkIDogJycsIC8vIGxhc3QgJ1RLX1dPUkQnIHBhc3NlZFxuICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uX3N0YXRlbWVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVjbGFyYXRpb25fYXNzaWdubWVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbXVsdGlsaW5lX2ZyYW1lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpZl9ibG9jazogZmFsc2UsXG4gICAgICAgICAgICAgICAgZWxzZV9ibG9jazogZmFsc2UsXG4gICAgICAgICAgICAgICAgZG9fYmxvY2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRvX3doaWxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbl9jYXNlX3N0YXRlbWVudDogZmFsc2UsIC8vIHN3aXRjaCguLil7IElOU0lERSBIRVJFIH1cbiAgICAgICAgICAgICAgICBpbl9jYXNlOiBmYWxzZSwgLy8gd2UncmUgb24gdGhlIGV4YWN0IGxpbmUgd2l0aCBcImNhc2UgMDpcIlxuICAgICAgICAgICAgICAgIGNhc2VfYm9keTogZmFsc2UsIC8vIHRoZSBpbmRlbnRlZCBjYXNlLWFjdGlvbiBibG9ja1xuICAgICAgICAgICAgICAgIGluZGVudGF0aW9uX2xldmVsOiBuZXh0X2luZGVudF9sZXZlbCxcbiAgICAgICAgICAgICAgICBsaW5lX2luZGVudF9sZXZlbDogZmxhZ3NfYmFzZSA/IGZsYWdzX2Jhc2UubGluZV9pbmRlbnRfbGV2ZWwgOiBuZXh0X2luZGVudF9sZXZlbCxcbiAgICAgICAgICAgICAgICBzdGFydF9saW5lX2luZGV4OiBvdXRwdXQuZ2V0X2xpbmVfbnVtYmVyKCksXG4gICAgICAgICAgICAgICAgdGVybmFyeV9kZXB0aDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBuZXh0X2ZsYWdzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU29tZSBpbnRlcnByZXRlcnMgaGF2ZSB1bmV4cGVjdGVkIHJlc3VsdHMgd2l0aCBmb28gPSBiYXogfHwgYmFyO1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyA/IG9wdGlvbnMgOiB7fTtcbiAgICAgICAgb3B0ID0ge307XG5cbiAgICAgICAgLy8gY29tcGF0aWJpbGl0eVxuICAgICAgICBpZiAob3B0aW9ucy5icmFjZXNfb25fb3duX2xpbmUgIT09IHVuZGVmaW5lZCkgeyAvL2dyYWNlZnVsIGhhbmRsaW5nIG9mIGRlcHJlY2F0ZWQgb3B0aW9uXG4gICAgICAgICAgICBvcHQuYnJhY2Vfc3R5bGUgPSBvcHRpb25zLmJyYWNlc19vbl9vd25fbGluZSA/IFwiZXhwYW5kXCIgOiBcImNvbGxhcHNlXCI7XG4gICAgICAgIH1cbiAgICAgICAgb3B0LmJyYWNlX3N0eWxlID0gb3B0aW9ucy5icmFjZV9zdHlsZSA/IG9wdGlvbnMuYnJhY2Vfc3R5bGUgOiAob3B0LmJyYWNlX3N0eWxlID8gb3B0LmJyYWNlX3N0eWxlIDogXCJjb2xsYXBzZVwiKTtcblxuICAgICAgICAvLyBncmFjZWZ1bCBoYW5kbGluZyBvZiBkZXByZWNhdGVkIG9wdGlvblxuICAgICAgICBpZiAob3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZC1zdHJpY3RcIikge1xuICAgICAgICAgICAgb3B0LmJyYWNlX3N0eWxlID0gXCJleHBhbmRcIjtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgb3B0LmluZGVudF9zaXplID0gb3B0aW9ucy5pbmRlbnRfc2l6ZSA/IHBhcnNlSW50KG9wdGlvbnMuaW5kZW50X3NpemUsIDEwKSA6IDQ7XG4gICAgICAgIG9wdC5pbmRlbnRfY2hhciA9IG9wdGlvbnMuaW5kZW50X2NoYXIgPyBvcHRpb25zLmluZGVudF9jaGFyIDogJyAnO1xuICAgICAgICBvcHQucHJlc2VydmVfbmV3bGluZXMgPSAob3B0aW9ucy5wcmVzZXJ2ZV9uZXdsaW5lcyA9PT0gdW5kZWZpbmVkKSA/IHRydWUgOiBvcHRpb25zLnByZXNlcnZlX25ld2xpbmVzO1xuICAgICAgICBvcHQuYnJlYWtfY2hhaW5lZF9tZXRob2RzID0gKG9wdGlvbnMuYnJlYWtfY2hhaW5lZF9tZXRob2RzID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmJyZWFrX2NoYWluZWRfbWV0aG9kcztcbiAgICAgICAgb3B0Lm1heF9wcmVzZXJ2ZV9uZXdsaW5lcyA9IChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcyA9PT0gdW5kZWZpbmVkKSA/IDAgOiBwYXJzZUludChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcywgMTApO1xuICAgICAgICBvcHQuc3BhY2VfaW5fcGFyZW4gPSAob3B0aW9ucy5zcGFjZV9pbl9wYXJlbiA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5zcGFjZV9pbl9wYXJlbjtcbiAgICAgICAgb3B0LnNwYWNlX2luX2VtcHR5X3BhcmVuID0gKG9wdGlvbnMuc3BhY2VfaW5fZW1wdHlfcGFyZW4gPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuc3BhY2VfaW5fZW1wdHlfcGFyZW47XG4gICAgICAgIG9wdC5qc2xpbnRfaGFwcHkgPSAob3B0aW9ucy5qc2xpbnRfaGFwcHkgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuanNsaW50X2hhcHB5O1xuICAgICAgICBvcHQuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiA9IChvcHRpb25zLnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbjtcbiAgICAgICAgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gPSAob3B0aW9ucy5rZWVwX2FycmF5X2luZGVudGF0aW9uID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmtlZXBfYXJyYXlfaW5kZW50YXRpb247XG4gICAgICAgIG9wdC5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwgPSAob3B0aW9ucy5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwgPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWw7XG4gICAgICAgIG9wdC51bmVzY2FwZV9zdHJpbmdzID0gKG9wdGlvbnMudW5lc2NhcGVfc3RyaW5ncyA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy51bmVzY2FwZV9zdHJpbmdzO1xuICAgICAgICBvcHQud3JhcF9saW5lX2xlbmd0aCA9IChvcHRpb25zLndyYXBfbGluZV9sZW5ndGggPT09IHVuZGVmaW5lZCkgPyAwIDogcGFyc2VJbnQob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoLCAxMCk7XG4gICAgICAgIG9wdC5lNHggPSAob3B0aW9ucy5lNHggPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuZTR4O1xuICAgICAgICBvcHQuZW5kX3dpdGhfbmV3bGluZSA9IChvcHRpb25zLmVuZF93aXRoX25ld2xpbmUgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZTtcblxuXG4gICAgICAgIC8vIGZvcmNlIG9wdC5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uIHRvIHRydWUgaWYgb3B0LmpzbGludF9oYXBweVxuICAgICAgICBpZihvcHQuanNsaW50X2hhcHB5KSB7XG4gICAgICAgICAgICBvcHQuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZihvcHRpb25zLmluZGVudF93aXRoX3RhYnMpe1xuICAgICAgICAgICAgb3B0LmluZGVudF9jaGFyID0gJ1xcdCc7XG4gICAgICAgICAgICBvcHQuaW5kZW50X3NpemUgPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIGluZGVudF9zdHJpbmcgPSAnJztcbiAgICAgICAgd2hpbGUgKG9wdC5pbmRlbnRfc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIGluZGVudF9zdHJpbmcgKz0gb3B0LmluZGVudF9jaGFyO1xuICAgICAgICAgICAgb3B0LmluZGVudF9zaXplIC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJlaW5kZW50X2luZGV4ID0gMDtcbiAgICAgICAgaWYoanNfc291cmNlX3RleHQgJiYganNfc291cmNlX3RleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICB3aGlsZSAoIChqc19zb3VyY2VfdGV4dC5jaGFyQXQocHJlaW5kZW50X2luZGV4KSA9PT0gJyAnIHx8XG4gICAgICAgICAgICAgICAgICAgIGpzX3NvdXJjZV90ZXh0LmNoYXJBdChwcmVpbmRlbnRfaW5kZXgpID09PSAnXFx0JykpIHtcbiAgICAgICAgICAgICAgICBiYXNlSW5kZW50U3RyaW5nICs9IGpzX3NvdXJjZV90ZXh0LmNoYXJBdChwcmVpbmRlbnRfaW5kZXgpO1xuICAgICAgICAgICAgICAgIHByZWluZGVudF9pbmRleCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAganNfc291cmNlX3RleHQgPSBqc19zb3VyY2VfdGV4dC5zdWJzdHJpbmcocHJlaW5kZW50X2luZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxhc3RfdHlwZSA9ICdUS19TVEFSVF9CTE9DSyc7IC8vIGxhc3QgdG9rZW4gdHlwZVxuICAgICAgICBsYXN0X2xhc3RfdGV4dCA9ICcnOyAvLyBwcmUtbGFzdCB0b2tlbiB0ZXh0XG4gICAgICAgIG91dHB1dCA9IG5ldyBPdXRwdXQoaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZyk7XG5cblxuICAgICAgICAvLyBTdGFjayBvZiBwYXJzaW5nL2Zvcm1hdHRpbmcgc3RhdGVzLCBpbmNsdWRpbmcgTU9ERS5cbiAgICAgICAgLy8gV2UgdG9rZW5pemUsIHBhcnNlLCBhbmQgb3V0cHV0IGluIGFuIGFsbW9zdCBwdXJlbHkgYSBmb3J3YXJkLW9ubHkgc3RyZWFtIG9mIHRva2VuIGlucHV0XG4gICAgICAgIC8vIGFuZCBmb3JtYXR0ZWQgb3V0cHV0LiAgVGhpcyBtYWtlcyB0aGUgYmVhdXRpZmllciBsZXNzIGFjY3VyYXRlIHRoYW4gZnVsbCBwYXJzZXJzXG4gICAgICAgIC8vIGJ1dCBhbHNvIGZhciBtb3JlIHRvbGVyYW50IG9mIHN5bnRheCBlcnJvcnMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEZvciBleGFtcGxlLCB0aGUgZGVmYXVsdCBtb2RlIGlzIE1PREUuQmxvY2tTdGF0ZW1lbnQuIElmIHdlIHNlZSBhICd7JyB3ZSBwdXNoIGEgbmV3IGZyYW1lIG9mIHR5cGVcbiAgICAgICAgLy8gTU9ERS5CbG9ja1N0YXRlbWVudCBvbiB0aGUgdGhlIHN0YWNrLCBldmVuIHRob3VnaCBpdCBjb3VsZCBiZSBvYmplY3QgbGl0ZXJhbC4gIElmIHdlIGxhdGVyXG4gICAgICAgIC8vIGVuY291bnRlciBhIFwiOlwiLCB3ZSdsbCBzd2l0Y2ggdG8gdG8gTU9ERS5PYmplY3RMaXRlcmFsLiAgSWYgd2UgdGhlbiBzZWUgYSBcIjtcIixcbiAgICAgICAgLy8gbW9zdCBmdWxsIHBhcnNlcnMgd291bGQgZGllLCBidXQgdGhlIGJlYXV0aWZpZXIgZ3JhY2VmdWxseSBmYWxscyBiYWNrIHRvXG4gICAgICAgIC8vIE1PREUuQmxvY2tTdGF0ZW1lbnQgYW5kIGNvbnRpbnVlcyBvbi5cbiAgICAgICAgZmxhZ19zdG9yZSA9IFtdO1xuICAgICAgICBzZXRfbW9kZShNT0RFLkJsb2NrU3RhdGVtZW50KTtcblxuICAgICAgICB0aGlzLmJlYXV0aWZ5ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qanNoaW50IG9uZXZhcjp0cnVlICovXG4gICAgICAgICAgICB2YXIgbG9jYWxfdG9rZW4sIHN3ZWV0X2NvZGU7XG4gICAgICAgICAgICBUb2tlbml6ZXIgPSBuZXcgdG9rZW5pemVyKGpzX3NvdXJjZV90ZXh0LCBvcHQsIGluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgdG9rZW5zID0gVG9rZW5pemVyLnRva2VuaXplKCk7XG4gICAgICAgICAgICB0b2tlbl9wb3MgPSAwO1xuXG4gICAgICAgICAgICB3aGlsZSAobG9jYWxfdG9rZW4gPSBnZXRfdG9rZW4oKSkge1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsb2NhbF90b2tlbi5jb21tZW50c19iZWZvcmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNsZWFuZXN0IGhhbmRsaW5nIG9mIGlubGluZSBjb21tZW50cyBpcyB0byB0cmVhdCB0aGVtIGFzIHRob3VnaCB0aGV5IGFyZW4ndCB0aGVyZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gSnVzdCBjb250aW51ZSBmb3JtYXR0aW5nIGFuZCB0aGUgYmVoYXZpb3Igc2hvdWxkIGJlIGxvZ2ljYWwuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gaWdub3JlIHVua25vd24gdG9rZW5zLiAgQWdhaW4sIHRoaXMgc2hvdWxkIHJlc3VsdCBpbiBiZXR0ZXIgYmVoYXZpb3IuXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZV90b2tlbihsb2NhbF90b2tlbi5jb21tZW50c19iZWZvcmVbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVfdG9rZW4obG9jYWxfdG9rZW4pO1xuXG4gICAgICAgICAgICAgICAgbGFzdF9sYXN0X3RleHQgPSBmbGFncy5sYXN0X3RleHQ7XG4gICAgICAgICAgICAgICAgbGFzdF90eXBlID0gbG9jYWxfdG9rZW4udHlwZTtcbiAgICAgICAgICAgICAgICBmbGFncy5sYXN0X3RleHQgPSBsb2NhbF90b2tlbi50ZXh0O1xuXG4gICAgICAgICAgICAgICAgdG9rZW5fcG9zICs9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3ZWV0X2NvZGUgPSBvdXRwdXQuZ2V0X2NvZGUoKTtcbiAgICAgICAgICAgIGlmIChvcHQuZW5kX3dpdGhfbmV3bGluZSkge1xuICAgICAgICAgICAgICAgIHN3ZWV0X2NvZGUgKz0gJ1xcbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzd2VldF9jb2RlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV90b2tlbihsb2NhbF90b2tlbikge1xuICAgICAgICAgICAgdmFyIG5ld2xpbmVzID0gbG9jYWxfdG9rZW4ubmV3bGluZXM7XG4gICAgICAgICAgICB2YXIga2VlcF93aGl0ZXNwYWNlID0gb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gJiYgaXNfYXJyYXkoZmxhZ3MubW9kZSk7XG5cbiAgICAgICAgICAgIGlmIChrZWVwX3doaXRlc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbmV3bGluZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGkgPiAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHQubWF4X3ByZXNlcnZlX25ld2xpbmVzICYmIG5ld2xpbmVzID4gb3B0Lm1heF9wcmVzZXJ2ZV9uZXdsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBuZXdsaW5lcyA9IG9wdC5tYXhfcHJlc2VydmVfbmV3bGluZXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG9wdC5wcmVzZXJ2ZV9uZXdsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxfdG9rZW4ubmV3bGluZXMgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG5ld2xpbmVzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdXJyZW50X3Rva2VuID0gbG9jYWxfdG9rZW47XG4gICAgICAgICAgICBoYW5kbGVyc1tjdXJyZW50X3Rva2VuLnR5cGVdKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB3ZSBjb3VsZCB1c2UganVzdCBzdHJpbmcuc3BsaXQsIGJ1dFxuICAgICAgICAvLyBJRSBkb2Vzbid0IGxpa2UgcmV0dXJuaW5nIGVtcHR5IHN0cmluZ3NcblxuICAgICAgICBmdW5jdGlvbiBzcGxpdF9uZXdsaW5lcyhzKSB7XG4gICAgICAgICAgICAvL3JldHVybiBzLnNwbGl0KC9cXHgwZFxceDBhfFxceDBhLyk7XG5cbiAgICAgICAgICAgIHMgPSBzLnJlcGxhY2UoL1xceDBkL2csICcnKTtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXSxcbiAgICAgICAgICAgICAgICBpZHggPSBzLmluZGV4T2YoXCJcXG5cIik7XG4gICAgICAgICAgICB3aGlsZSAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKHMuc3Vic3RyaW5nKDAsIGlkeCkpO1xuICAgICAgICAgICAgICAgIHMgPSBzLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBpZHggPSBzLmluZGV4T2YoXCJcXG5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvdXQucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGZvcmNlX2xpbmV3cmFwKSB7XG4gICAgICAgICAgICBmb3JjZV9saW5ld3JhcCA9IChmb3JjZV9saW5ld3JhcCA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogZm9yY2VfbGluZXdyYXA7XG5cbiAgICAgICAgICAgIGlmIChvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKChvcHQucHJlc2VydmVfbmV3bGluZXMgJiYgY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkgfHwgZm9yY2VfbGluZXdyYXApIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0LndyYXBfbGluZV9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBuZXZlciB3cmFwIHRoZSBmaXJzdCB0b2tlbiBvZiBhIGxpbmUgZHVlIHRvIG5ld2xpbmUgY2hlY2sgYWJvdmUuXG4gICAgICAgICAgICAgICAgdmFyIHByb3Bvc2VkX2xpbmVfbGVuZ3RoID0gb3V0cHV0LmN1cnJlbnRfbGluZS5nZXRfY2hhcmFjdGVyX2NvdW50KCkgKyBjdXJyZW50X3Rva2VuLnRleHQubGVuZ3RoICtcbiAgICAgICAgICAgICAgICAgICAgKG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgaWYgKHByb3Bvc2VkX2xpbmVfbGVuZ3RoID49IG9wdC53cmFwX2xpbmVfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByaW50X25ld2xpbmUoZm9yY2VfbmV3bGluZSwgcHJlc2VydmVfc3RhdGVtZW50X2ZsYWdzKSB7XG4gICAgICAgICAgICBpZiAoIXByZXNlcnZlX3N0YXRlbWVudF9mbGFncykge1xuICAgICAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgIT09ICc7JyAmJiBmbGFncy5sYXN0X3RleHQgIT09ICcsJyAmJiBmbGFncy5sYXN0X3RleHQgIT09ICc9JyAmJiBsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50ICYmICFmbGFncy5pZl9ibG9jayAmJiAhZmxhZ3MuZG9fYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3V0cHV0LmFkZF9uZXdfbGluZShmb3JjZV9uZXdsaW5lKSkge1xuICAgICAgICAgICAgICAgIGZsYWdzLm11bHRpbGluZV9mcmFtZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcmludF90b2tlbl9saW5lX2luZGVudGF0aW9uKCkge1xuICAgICAgICAgICAgaWYgKG91dHB1dC5qdXN0X2FkZGVkX25ld2xpbmUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiAmJiBpc19hcnJheShmbGFncy5tb2RlKSAmJiBjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHByZXZlbnQgcmVtb3Zpbmcgb2YgdGhpcyB3aGl0ZXNwYWNlIGFzIHJlZHVuZGFudFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuY3VycmVudF9saW5lLnB1c2goJycpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGN1cnJlbnRfdG9rZW4ud2hpdGVzcGFjZV9iZWZvcmUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5jdXJyZW50X2xpbmUucHVzaChjdXJyZW50X3Rva2VuLndoaXRlc3BhY2VfYmVmb3JlW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvdXRwdXQuYWRkX2luZGVudF9zdHJpbmcoZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmxpbmVfaW5kZW50X2xldmVsID0gZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcHJpbnRfdG9rZW4ocHJpbnRhYmxlX3Rva2VuKSB7XG4gICAgICAgICAgICBwcmludGFibGVfdG9rZW4gPSBwcmludGFibGVfdG9rZW4gfHwgY3VycmVudF90b2tlbi50ZXh0O1xuICAgICAgICAgICAgcHJpbnRfdG9rZW5fbGluZV9pbmRlbnRhdGlvbigpO1xuICAgICAgICAgICAgb3V0cHV0LmFkZF90b2tlbihwcmludGFibGVfdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZW50KCkge1xuICAgICAgICAgICAgZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwgKz0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRlaW5kZW50KCkge1xuICAgICAgICAgICAgaWYgKGZsYWdzLmluZGVudGF0aW9uX2xldmVsID4gMCAmJlxuICAgICAgICAgICAgICAgICgoIWZsYWdzLnBhcmVudCkgfHwgZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwgPiBmbGFncy5wYXJlbnQuaW5kZW50YXRpb25fbGV2ZWwpKVxuICAgICAgICAgICAgICAgIGZsYWdzLmluZGVudGF0aW9uX2xldmVsIC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRfbW9kZShtb2RlKSB7XG4gICAgICAgICAgICBpZiAoZmxhZ3MpIHtcbiAgICAgICAgICAgICAgICBmbGFnX3N0b3JlLnB1c2goZmxhZ3MpO1xuICAgICAgICAgICAgICAgIHByZXZpb3VzX2ZsYWdzID0gZmxhZ3M7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByZXZpb3VzX2ZsYWdzID0gY3JlYXRlX2ZsYWdzKG51bGwsIG1vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmbGFncyA9IGNyZWF0ZV9mbGFncyhwcmV2aW91c19mbGFncywgbW9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc19hcnJheShtb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZSA9PT0gTU9ERS5BcnJheUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc19leHByZXNzaW9uKG1vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBpbl9hcnJheShtb2RlLCBbTU9ERS5FeHByZXNzaW9uLCBNT0RFLkZvckluaXRpYWxpemVyLCBNT0RFLkNvbmRpdGlvbmFsXSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZXN0b3JlX21vZGUoKSB7XG4gICAgICAgICAgICBpZiAoZmxhZ19zdG9yZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcHJldmlvdXNfZmxhZ3MgPSBmbGFncztcbiAgICAgICAgICAgICAgICBmbGFncyA9IGZsYWdfc3RvcmUucG9wKCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzX2ZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5yZW1vdmVfcmVkdW5kYW50X2luZGVudGF0aW9uKHByZXZpb3VzX2ZsYWdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdGFydF9vZl9vYmplY3RfcHJvcGVydHkoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmxhZ3MucGFyZW50Lm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCAmJiBmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCAmJiAoXG4gICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJzonICYmIGZsYWdzLnRlcm5hcnlfZGVwdGggPT09IDApIHx8IChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ2dldCcsICdzZXQnXSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN0YXJ0X29mX3N0YXRlbWVudCgpIHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCddKSAmJiBjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19XT1JEJykgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdkbycpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAncmV0dXJuJyAmJiAhY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdlbHNlJyAmJiAhKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdpZicpKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfRU5EX0VYUFInICYmIChwcmV2aW91c19mbGFncy5tb2RlID09PSBNT0RFLkZvckluaXRpYWxpemVyIHx8IHByZXZpb3VzX2ZsYWdzLm1vZGUgPT09IE1PREUuQ29uZGl0aW9uYWwpKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfV09SRCcgJiYgZmxhZ3MubW9kZSA9PT0gTU9ERS5CbG9ja1N0YXRlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgIWZsYWdzLmluX2Nhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICEoY3VycmVudF90b2tlbi50ZXh0ID09PSAnLS0nIHx8IGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJysrJylcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIGN1cnJlbnRfdG9rZW4udHlwZSAhPT0gJ1RLX1dPUkQnICYmIGN1cnJlbnRfdG9rZW4udHlwZSAhPT0gJ1RLX1JFU0VSVkVEJykgfHxcbiAgICAgICAgICAgICAgICAgICAgKGZsYWdzLm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnOicgJiYgZmxhZ3MudGVybmFyeV9kZXB0aCA9PT0gMCkgfHwgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnZ2V0JywgJ3NldCddKSkpKVxuICAgICAgICAgICAgICAgICkge1xuXG4gICAgICAgICAgICAgICAgc2V0X21vZGUoTU9ERS5TdGF0ZW1lbnQpO1xuICAgICAgICAgICAgICAgIGluZGVudCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCddKSAmJiBjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19XT1JEJykge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9zdGF0ZW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElzc3VlICMyNzY6XG4gICAgICAgICAgICAgICAgLy8gSWYgc3RhcnRpbmcgYSBuZXcgc3RhdGVtZW50IHdpdGggW2lmLCBmb3IsIHdoaWxlLCBkb10sIHB1c2ggdG8gYSBuZXcgbGluZS5cbiAgICAgICAgICAgICAgICAvLyBpZiAoYSkgaWYgKGIpIGlmKGMpIGQoKTsgZWxzZSBlKCk7IGVsc2UgZigpO1xuICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnZG8nLCAnZm9yJywgJ2lmJywgJ3doaWxlJ10pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFsbF9saW5lc19zdGFydF93aXRoKGxpbmVzLCBjKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmUgPSB0cmltKGxpbmVzW2ldKTtcbiAgICAgICAgICAgICAgICBpZiAobGluZS5jaGFyQXQoMCkgIT09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZWFjaF9saW5lX21hdGNoZXNfaW5kZW50KGxpbmVzLCBpbmRlbnQpIHtcbiAgICAgICAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSBsaW5lcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgbGluZTtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsaW5lID0gbGluZXNbaV07XG4gICAgICAgICAgICAgICAgLy8gYWxsb3cgZW1wdHkgbGluZXMgdG8gcGFzcyB0aHJvdWdoXG4gICAgICAgICAgICAgICAgaWYgKGxpbmUgJiYgbGluZS5pbmRleE9mKGluZGVudCkgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNfc3BlY2lhbF93b3JkKHdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbl9hcnJheSh3b3JkLCBbJ2Nhc2UnLCAncmV0dXJuJywgJ2RvJywgJ2lmJywgJ3Rocm93JywgJ2Vsc2UnXSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRfdG9rZW4ob2Zmc2V0KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0b2tlbl9wb3MgKyAob2Zmc2V0IHx8IDApO1xuICAgICAgICAgICAgcmV0dXJuIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdG9rZW5zLmxlbmd0aCkgPyBudWxsIDogdG9rZW5zW2luZGV4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zdGFydF9leHByKCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbmV4dF9tb2RlID0gTU9ERS5FeHByZXNzaW9uO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ1snKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfV09SRCcgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnKScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhcnJheSBpbmRleCBzcGVjaWZpZXIsIGJyZWFrIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIC8vIGFbeF0sIGZuKClbeF1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFRva2VuaXplci5saW5lX3N0YXJ0ZXJzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2V0X21vZGUobmV4dF9tb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfaW5fcGFyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBuZXh0X21vZGUgPSBNT0RFLkFycmF5TGl0ZXJhbDtcbiAgICAgICAgICAgICAgICBpZiAoaXNfYXJyYXkoZmxhZ3MubW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJ1snIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnLCcgJiYgKGxhc3RfbGFzdF90ZXh0ID09PSAnXScgfHwgbGFzdF9sYXN0X3RleHQgPT09ICd9JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBdLCBbIGdvZXMgdG8gbmV3IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0sIFsgZ29lcyB0byBuZXcgbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2ZvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dF9tb2RlID0gTU9ERS5Gb3JJbml0aWFsaXplcjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnaWYnLCAnd2hpbGUnXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dF9tb2RlID0gTU9ERS5Db25kaXRpb25hbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBuZXh0X21vZGUgPSBNT0RFLkV4cHJlc3Npb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ID09PSAnOycgfHwgbGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicgfHwgbGFzdF90eXBlID09PSAnVEtfU1RBUlRfRVhQUicgfHwgbGFzdF90eXBlID09PSAnVEtfRU5EX0JMT0NLJyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICcuJykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IENvbnNpZGVyIHdoZXRoZXIgZm9yY2luZyB0aGlzIGlzIHJlcXVpcmVkLiAgUmV2aWV3IGZhaWxpbmcgdGVzdHMgd2hlbiByZW1vdmVkLlxuICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSk7XG4gICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZyBvbiAoKCBhbmQgKSggYW5kIF1bIGFuZCBdKCBhbmQgLihcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnKCcpICYmIGxhc3RfdHlwZSAhPT0gJ1RLX1dPUkQnICYmIGxhc3RfdHlwZSAhPT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIChmbGFncy5sYXN0X3dvcmQgPT09ICdmdW5jdGlvbicgfHwgZmxhZ3MubGFzdF93b3JkID09PSAndHlwZW9mJykpIHx8XG4gICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJyonICYmIGxhc3RfbGFzdF90ZXh0ID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uKCkgdnMgZnVuY3Rpb24gKClcbiAgICAgICAgICAgICAgICBpZiAob3B0LnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgKGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgVG9rZW5pemVyLmxpbmVfc3RhcnRlcnMpIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2NhdGNoJykpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0LnNwYWNlX2JlZm9yZV9jb25kaXRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN1cHBvcnQgb2YgdGhpcyBraW5kIG9mIG5ld2xpbmUgcHJlc2VydmF0aW9uLlxuICAgICAgICAgICAgLy8gYSA9IChiICYmXG4gICAgICAgICAgICAvLyAgICAgKGMgfHwgZCkpO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJygnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0VRVUFMUycgfHwgbGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2V0X21vZGUobmV4dF9tb2RlKTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBpZiAob3B0LnNwYWNlX2luX3BhcmVuKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluIGFsbCBjYXNlcywgaWYgd2UgbmV3bGluZSB3aGlsZSBpbnNpZGUgYW4gZXhwcmVzc2lvbiBpdCBzaG91bGQgYmUgaW5kZW50ZWQuXG4gICAgICAgICAgICBpbmRlbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9lbmRfZXhwcigpIHtcbiAgICAgICAgICAgIC8vIHN0YXRlbWVudHMgaW5zaWRlIGV4cHJlc3Npb25zIGFyZSBub3QgdmFsaWQgc3ludGF4LCBidXQuLi5cbiAgICAgICAgICAgIC8vIHN0YXRlbWVudHMgbXVzdCBhbGwgYmUgY2xvc2VkIHdoZW4gdGhlaXIgY29udGFpbmVyIGNsb3Nlc1xuICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFncy5tdWx0aWxpbmVfZnJhbWUpIHtcbiAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ10nICYmIGlzX2FycmF5KGZsYWdzLm1vZGUpICYmICFvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfaW5fcGFyZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfU1RBUlRfRVhQUicgJiYgISBvcHQuc3BhY2VfaW5fZW1wdHlfcGFyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gKCkgW10gbm8gaW5uZXIgc3BhY2UgaW4gZW1wdHkgcGFyZW5zIGxpa2UgdGhlc2UsIGV2ZXIsIHJlZiAjMzIwXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnXScgJiYgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0LnJlbW92ZV9yZWR1bmRhbnRfaW5kZW50YXRpb24ocHJldmlvdXNfZmxhZ3MpO1xuXG4gICAgICAgICAgICAvLyBkbyB7fSB3aGlsZSAoKSAvLyBubyBzdGF0ZW1lbnQgcmVxdWlyZWQgYWZ0ZXJcbiAgICAgICAgICAgIGlmIChmbGFncy5kb193aGlsZSAmJiBwcmV2aW91c19mbGFncy5tb2RlID09PSBNT0RFLkNvbmRpdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgcHJldmlvdXNfZmxhZ3MubW9kZSA9IE1PREUuRXhwcmVzc2lvbjtcbiAgICAgICAgICAgICAgICBmbGFncy5kb19ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGZsYWdzLmRvX3doaWxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zdGFydF9ibG9jaygpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSBPYmplY3RMaXRlcmFsXG4gICAgICAgICAgICB2YXIgbmV4dF90b2tlbiA9IGdldF90b2tlbigxKVxuICAgICAgICAgICAgdmFyIHNlY29uZF90b2tlbiA9IGdldF90b2tlbigyKVxuICAgICAgICAgICAgaWYgKHNlY29uZF90b2tlbiAmJiAoXG4gICAgICAgICAgICAgICAgICAgIChzZWNvbmRfdG9rZW4udGV4dCA9PT0gJzonICYmIGluX2FycmF5KG5leHRfdG9rZW4udHlwZSwgWydUS19TVFJJTkcnLCAnVEtfV09SRCcsICdUS19SRVNFUlZFRCddKSlcbiAgICAgICAgICAgICAgICAgICAgfHwgKGluX2FycmF5KG5leHRfdG9rZW4udGV4dCwgWydnZXQnLCAnc2V0J10pICYmIGluX2FycmF5KHNlY29uZF90b2tlbi50eXBlLCBbJ1RLX1dPUkQnLCAnVEtfUkVTRVJWRUQnXSkpXG4gICAgICAgICAgICAgICAgKSkge1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgVHlwZVNjcmlwdCxidXQgd2UgZGlkbid0IGJyZWFrIGl0IGZvciBhIHZlcnkgbG9uZyB0aW1lLlxuICAgICAgICAgICAgICAgIC8vIFdlJ2xsIHRyeSB0byBrZWVwIG5vdCBicmVha2luZyBpdC5cbiAgICAgICAgICAgICAgICBpZiAoIWluX2FycmF5KGxhc3RfbGFzdF90ZXh0LCBbJ2NsYXNzJywnaW50ZXJmYWNlJ10pKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldF9tb2RlKE1PREUuT2JqZWN0TGl0ZXJhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0X21vZGUoTU9ERS5CbG9ja1N0YXRlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRfbW9kZShNT0RFLkJsb2NrU3RhdGVtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVtcHR5X2JyYWNlcyA9ICFuZXh0X3Rva2VuLmNvbW1lbnRzX2JlZm9yZS5sZW5ndGggJiYgIG5leHRfdG9rZW4udGV4dCA9PT0gJ30nO1xuICAgICAgICAgICAgdmFyIGVtcHR5X2Fub255bW91c19mdW5jdGlvbiA9IGVtcHR5X2JyYWNlcyAmJiBmbGFncy5sYXN0X3dvcmQgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgICBsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUic7XG5cbiAgICAgICAgICAgIGlmIChvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InICYmXG4gICAgICAgICAgICAgICAgICAgIChlbXB0eV9hbm9ueW1vdXNfZnVuY3Rpb24gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfdHlwZSA9PT0gJ1RLX0VRVUFMUycgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaXNfc3BlY2lhbF93b3JkKGZsYWdzLmxhc3RfdGV4dCkgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnZWxzZScpKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBjb2xsYXBzZVxuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicgJiYgbGFzdF90eXBlICE9PSAnVEtfU1RBUlRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0JMT0NLJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBUS19PUEVSQVRPUiBvciBUS19TVEFSVF9FWFBSXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc19hcnJheShwcmV2aW91c19mbGFncy5tb2RlKSAmJiBmbGFncy5sYXN0X3RleHQgPT09ICcsJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfbGFzdF90ZXh0ID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB9LCB7IGluIGFycmF5IGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpOyAvLyBbYSwgYiwgYywge1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2VuZF9ibG9jaygpIHtcbiAgICAgICAgICAgIC8vIHN0YXRlbWVudHMgbXVzdCBhbGwgYmUgY2xvc2VkIHdoZW4gdGhlaXIgY29udGFpbmVyIGNsb3Nlc1xuICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZW1wdHlfYnJhY2VzID0gbGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snO1xuXG4gICAgICAgICAgICBpZiAob3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlbXB0eV9icmFjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gc2tpcCB7fVxuICAgICAgICAgICAgICAgIGlmICghZW1wdHlfYnJhY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc19hcnJheShmbGFncy5tb2RlKSAmJiBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgUkVBTExZIG5lZWQgYSBuZXdsaW5lIGhlcmUsIGJ1dCBuZXdsaW5lciB3b3VsZCBza2lwIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV93b3JkKCkge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5tb2RlICE9PSBNT0RFLk9iamVjdExpdGVyYWwgJiZcbiAgICAgICAgICAgICAgICBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnc2V0JywgJ2dldCddKSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRfdG9rZW4udHlwZSA9ICdUS19XT1JEJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dF90b2tlbiA9IGdldF90b2tlbigxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dF90b2tlbi50ZXh0ID09ICc6Jykge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50X3Rva2VuLnR5cGUgPSAnVEtfV09SRCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUgJiYgIWlzX2V4cHJlc3Npb24oZmxhZ3MubW9kZSkgJiZcbiAgICAgICAgICAgICAgICAobGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InIHx8IChmbGFncy5sYXN0X3RleHQgPT09ICctLScgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnKysnKSkgJiZcbiAgICAgICAgICAgICAgICBsYXN0X3R5cGUgIT09ICdUS19FUVVBTFMnICYmXG4gICAgICAgICAgICAgICAgKG9wdC5wcmVzZXJ2ZV9uZXdsaW5lcyB8fCAhKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCcsICdzZXQnLCAnZ2V0J10pKSkpIHtcblxuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZsYWdzLmRvX2Jsb2NrICYmICFmbGFncy5kb193aGlsZSkge1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnd2hpbGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIHt9ICMjIHdoaWxlICgpXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZG9fd2hpbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8ge30gc2hvdWxkIGFsd2F5cyBoYXZlIHdoaWxlIGFzIHRoZSBuZXh0IHdvcmQuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdlIGRvbid0IHNlZSB0aGUgZXhwZWN0ZWQgd2hpbGUsIHJlY292ZXJcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5kb19ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgbWF5IGJlIGZvbGxvd2VkIGJ5IGVsc2UsIG9yIG5vdFxuICAgICAgICAgICAgLy8gQmFyZS9pbmxpbmUgaWZzIGFyZSB0cmlja3lcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gdW53aW5kIHRoZSBtb2RlcyBjb3JyZWN0bHk6IGlmIChhKSBpZiAoYikgYygpOyBlbHNlIGQoKTsgZWxzZSBlKCk7XG4gICAgICAgICAgICBpZiAoZmxhZ3MuaWZfYmxvY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZsYWdzLmVsc2VfYmxvY2sgJiYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdlbHNlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZWxzZV9ibG9jayA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmbGFncy5pZl9ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5lbHNlX2Jsb2NrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICdjYXNlJyB8fCAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnZGVmYXVsdCcgJiYgZmxhZ3MuaW5fY2FzZV9zdGF0ZW1lbnQpKSkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MuY2FzZV9ib2R5IHx8IG9wdC5qc2xpbnRfaGFwcHkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3dpdGNoIGNhc2VzIGZvbGxvd2luZyBvbmUgYW5vdGhlclxuICAgICAgICAgICAgICAgICAgICBkZWluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5jYXNlX2JvZHkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICBmbGFncy5pbl9jYXNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBmbGFncy5pbl9jYXNlX3N0YXRlbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGlmIChpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnfScsICc7J10pIHx8IChvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkgJiYgISBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnWycsICd7JywgJzonLCAnPScsICcsJ10pKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlcmUgaXMgYSBuaWNlIGNsZWFuIHNwYWNlIG9mIGF0IGxlYXN0IG9uZSBibGFuayBsaW5lXG4gICAgICAgICAgICAgICAgICAgIC8vIGJlZm9yZSBhIG5ldyBmdW5jdGlvbiBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICggIW91dHB1dC5qdXN0X2FkZGVkX2JsYW5rbGluZSgpICYmICFjdXJyZW50X3Rva2VuLmNvbW1lbnRzX2JlZm9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyB8fCBsYXN0X3R5cGUgPT09ICdUS19XT1JEJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWydnZXQnLCAnc2V0JywgJ25ldycsICdyZXR1cm4nLCAnZXhwb3J0J10pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZGVmYXVsdCcgJiYgbGFzdF9sYXN0X3RleHQgPT09ICdleHBvcnQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvbyA9IGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZsYWdzLm11bHRpbGluZV9mcmFtZSAmJiAoaXNfZXhwcmVzc2lvbihmbGFncy5tb2RlKSB8fCBpc19hcnJheShmbGFncy5tb2RlKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gKGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0NPTU1BJyB8fCBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9FWFBSJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FUVVBTFMnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiAgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ2Z1bmN0aW9uJywgJ2dldCcsICdzZXQnXSkpIHtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIGZsYWdzLmxhc3Rfd29yZCA9IGN1cnJlbnRfdG9rZW4udGV4dDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZWZpeCA9ICdOT05FJztcblxuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9CTE9DSycpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ2Vsc2UnLCAnY2F0Y2gnLCAnZmluYWxseSddKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kXCIgfHwgb3B0LmJyYWNlX3N0eWxlID09PSBcImVuZC1leHBhbmRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ1NQQUNFJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TRU1JQ09MT04nICYmIGZsYWdzLm1vZGUgPT09IE1PREUuQmxvY2tTdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBTaG91bGQgdGhpcyBiZSBmb3IgU1RBVEVNRU5UIGFzIHdlbGw/XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TRU1JQ09MT04nICYmIGlzX2V4cHJlc3Npb24oZmxhZ3MubW9kZSkpIHtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnU1BBQ0UnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TVFJJTkcnKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgfHwgbGFzdF90eXBlID09PSAnVEtfV09SRCcgfHxcbiAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnKicgJiYgbGFzdF9sYXN0X3RleHQgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ1NQQUNFJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnKScpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ID09PSAnZWxzZScgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnZXhwb3J0Jykge1xuICAgICAgICAgICAgICAgICAgICBwcmVmaXggPSAnU1BBQ0UnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnZWxzZScsICdjYXRjaCcsICdmaW5hbGx5J10pKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSAhPT0gJ1RLX0VORF9CTE9DSycgfHwgb3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZFwiIHx8IG9wdC5icmFjZV9zdHlsZSA9PT0gXCJlbmQtZXhwYW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC50cmltKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGluZSA9IG91dHB1dC5jdXJyZW50X2xpbmU7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIHRyaW1tZWQgYW5kIHRoZXJlJ3Mgc29tZXRoaW5nIG90aGVyIHRoYW4gYSBjbG9zZSBibG9jayBiZWZvcmUgdXNcbiAgICAgICAgICAgICAgICAgICAgLy8gcHV0IGEgbmV3bGluZSBiYWNrIGluLiAgSGFuZGxlcyAnfSAvLyBjb21tZW50JyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmUubGFzdCgpICE9PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZWZpeCA9PT0gJ05FV0xJTkUnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpc19zcGVjaWFsX3dvcmQoZmxhZ3MubGFzdF90ZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBubyBuZXdsaW5lIGJldHdlZW4gJ3JldHVybiBubm4nXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlICE9PSAnVEtfRU5EX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobGFzdF90eXBlICE9PSAnVEtfU1RBUlRfRVhQUicgfHwgIShjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ3ZhcicsICdsZXQnLCAnY29uc3QnXSkpKSAmJiBmbGFncy5sYXN0X3RleHQgIT09ICc6Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBmb3JjZSBuZXdsaW5lIG9uICd2YXInOiBmb3IgKHZhciB4ID0gMC4uLilcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnaWYnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2Vsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmV3bGluZSBmb3IgfSBlbHNlIGlmIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnKScpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmxhZ3MubXVsdGlsaW5lX2ZyYW1lICYmIGlzX2FycmF5KGZsYWdzLm1vZGUpICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJywnICYmIGxhc3RfbGFzdF90ZXh0ID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7IC8vIH0sIGluIGxpc3RzIGdldCBhIG5ld2xpbmUgdHJlYXRtZW50XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZWZpeCA9PT0gJ1NQQUNFJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGZsYWdzLmxhc3Rfd29yZCA9IGN1cnJlbnRfdG9rZW4udGV4dDtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdkbycpIHtcbiAgICAgICAgICAgICAgICBmbGFncy5kb19ibG9jayA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnaWYnKSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MuaWZfYmxvY2sgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3NlbWljb2xvbigpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgICAgICAvLyBTZW1pY29sb24gY2FuIGJlIHRoZSBzdGFydCAoYW5kIGVuZCkgb2YgYSBzdGF0ZW1lbnRcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQgJiYgIWZsYWdzLmlmX2Jsb2NrICYmICFmbGFncy5kb19ibG9jaykge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zdHJpbmcoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICAgICAgLy8gT25lIGRpZmZlcmVuY2UgLSBzdHJpbmdzIHdhbnQgYXQgbGVhc3QgYSBzcGFjZSBiZWZvcmVcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1dPUkQnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0NPTU1BJyB8fCBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9FWFBSJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FUVVBTFMnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9lcXVhbHMoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFncy5kZWNsYXJhdGlvbl9zdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBqdXN0IGdvdCBhbiAnPScgaW4gYSB2YXItbGluZSwgZGlmZmVyZW50IGZvcm1hdHRpbmcvbGluZS1icmVha2luZywgZXRjIHdpbGwgbm93IGJlIGRvbmVcbiAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2NvbW1hKCkge1xuICAgICAgICAgICAgaWYgKGZsYWdzLmRlY2xhcmF0aW9uX3N0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc19leHByZXNzaW9uKGZsYWdzLnBhcmVudC5tb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3QgYnJlYWsgb24gY29tbWEsIGZvcih2YXIgYSA9IDEsIGIgPSAyKVxuICAgICAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcblxuICAgICAgICAgICAgICAgIGlmIChmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmRlY2xhcmF0aW9uX2Fzc2lnbm1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGlmIChmbGFncy5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwgfHxcbiAgICAgICAgICAgICAgICAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQgJiYgZmxhZ3MucGFyZW50Lm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRVhQUiBvciBET19CTE9DS1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfb3BlcmF0b3IoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaXNfc3BlY2lhbF93b3JkKGZsYWdzLmxhc3RfdGV4dCkpIHtcbiAgICAgICAgICAgICAgICAvLyBcInJldHVyblwiIGhhZCBhIHNwZWNpYWwgaGFuZGxpbmcgaW4gVEtfV09SRC4gTm93IHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBmYXZvclxuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBoYWNrIGZvciBhY3Rpb25zY3JpcHQncyBpbXBvcnQgLio7XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnKicgJiYgbGFzdF90eXBlID09PSAnVEtfRE9UJykge1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnOicgJiYgZmxhZ3MuaW5fY2FzZSkge1xuICAgICAgICAgICAgICAgIGZsYWdzLmNhc2VfYm9keSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgZmxhZ3MuaW5fY2FzZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJzo6Jykge1xuICAgICAgICAgICAgICAgIC8vIG5vIHNwYWNlcyBhcm91bmQgZXhvdGljIG5hbWVzcGFjaW5nIHN5bnRheCBvcGVyYXRvclxuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNS4xLyNzZWMtNy45LjFcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgbmV3bGluZSBiZXR3ZWVuIC0tIG9yICsrIGFuZCBhbnl0aGluZyBlbHNlIHdlIHNob3VsZCBwcmVzZXJ2ZSBpdC5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lICYmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICctLScgfHwgY3VycmVudF90b2tlbi50ZXh0ID09PSAnKysnKSkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBbGxvdyBsaW5lIHdyYXBwaW5nIGJldHdlZW4gb3BlcmF0b3JzXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3BhY2VfYmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBzcGFjZV9hZnRlciA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmIChpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnLS0nLCAnKysnLCAnIScsICd+J10pIHx8IChpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnLScsICcrJ10pICYmIChpbl9hcnJheShsYXN0X3R5cGUsIFsnVEtfU1RBUlRfQkxPQ0snLCAnVEtfU1RBUlRfRVhQUicsICdUS19FUVVBTFMnLCAnVEtfT1BFUkFUT1InXSkgfHwgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnLCcpKSkge1xuICAgICAgICAgICAgICAgIC8vIHVuYXJ5IG9wZXJhdG9ycyAoYW5kIGJpbmFyeSArLy0gcHJldGVuZGluZyB0byBiZSB1bmFyeSkgc3BlY2lhbCBjYXNlc1xuXG4gICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc3BhY2VfYWZ0ZXIgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgPT09ICc7JyAmJiBpc19leHByZXNzaW9uKGZsYWdzLm1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciAoOzsgKytpKVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgXl5eXG4gICAgICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgKGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWyctLScsICctJ10pICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWyctLScsICctJ10pKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWycrKycsICcrJ10pICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWycrKycsICcrJ10pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKGZsYWdzLm1vZGUgPT09IE1PREUuQmxvY2tTdGF0ZW1lbnQgfHwgZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpICYmIChmbGFncy5sYXN0X3RleHQgPT09ICd7JyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICc7JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8geyBmb287IC0taSB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvbygpOyAtLWJhcjtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnOicpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MudGVybmFyeV9kZXB0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDb2xvbiBpcyBpbnZhbGlkIGphdmFzY3JpcHQgb3V0c2lkZSBvZiB0ZXJuYXJ5IGFuZCBvYmplY3QsIGJ1dCBkbyBvdXIgYmVzdCB0byBndWVzcyB3aGF0IHdhcyBtZWFudC5cbiAgICAgICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MudGVybmFyeV9kZXB0aCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnPycpIHtcbiAgICAgICAgICAgICAgICBmbGFncy50ZXJuYXJ5X2RlcHRoICs9IDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJyonICYmIGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzcGFjZV9hZnRlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gfHwgc3BhY2VfYmVmb3JlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBzcGFjZV9hZnRlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9ibG9ja19jb21tZW50KCkge1xuICAgICAgICAgICAgdmFyIGxpbmVzID0gc3BsaXRfbmV3bGluZXMoY3VycmVudF90b2tlbi50ZXh0KTtcbiAgICAgICAgICAgIHZhciBqOyAvLyBpdGVyYXRvciBmb3IgdGhpcyBjYXNlXG4gICAgICAgICAgICB2YXIgamF2YWRvYyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHN0YXJsZXNzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgbGFzdEluZGVudCA9IGN1cnJlbnRfdG9rZW4ud2hpdGVzcGFjZV9iZWZvcmUuam9pbignJyk7XG4gICAgICAgICAgICB2YXIgbGFzdEluZGVudExlbmd0aCA9IGxhc3RJbmRlbnQubGVuZ3RoO1xuXG4gICAgICAgICAgICAvLyBibG9jayBjb21tZW50IHN0YXJ0cyB3aXRoIGEgbmV3IGxpbmVcbiAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWxsX2xpbmVzX3N0YXJ0X3dpdGgobGluZXMuc2xpY2UoMSksICcqJykpIHtcbiAgICAgICAgICAgICAgICAgICAgamF2YWRvYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGVhY2hfbGluZV9tYXRjaGVzX2luZGVudChsaW5lcy5zbGljZSgxKSwgbGFzdEluZGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Rhcmxlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZmlyc3QgbGluZSBhbHdheXMgaW5kZW50ZWRcbiAgICAgICAgICAgIHByaW50X3Rva2VuKGxpbmVzWzBdKTtcbiAgICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmIChqYXZhZG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGphdmFkb2M6IHJlZm9ybWF0IGFuZCByZS1pbmRlbnRcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oJyAnICsgdHJpbShsaW5lc1tqXSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3Rhcmxlc3MgJiYgbGluZXNbal0ubGVuZ3RoID4gbGFzdEluZGVudExlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzdGFybGVzczogcmUtaW5kZW50IG5vbi1lbXB0eSBjb250ZW50LCBhdm9pZGluZyB0cmltXG4gICAgICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKGxpbmVzW2pdLnN1YnN0cmluZyhsYXN0SW5kZW50TGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm9ybWFsIGNvbW1lbnRzIG91dHB1dCByYXdcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmFkZF90b2tlbihsaW5lc1tqXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmb3IgY29tbWVudHMgb2YgbW9yZSB0aGFuIG9uZSBsaW5lLCBtYWtlIHN1cmUgdGhlcmUncyBhIG5ldyBsaW5lIGFmdGVyXG4gICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9pbmxpbmVfY29tbWVudCgpIHtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2NvbW1lbnQoKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQudHJpbSh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZG90KCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGlzX3NwZWNpYWxfd29yZChmbGFncy5sYXN0X3RleHQpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFsbG93IHByZXNlcnZlZCBuZXdsaW5lcyBiZWZvcmUgZG90cyBpbiBnZW5lcmFsXG4gICAgICAgICAgICAgICAgLy8gZm9yY2UgbmV3bGluZXMgb24gZG90cyBhZnRlciBjbG9zZSBwYXJlbiB3aGVuIGJyZWFrX2NoYWluZWQgLSBmb3IgYmFyKCkuYmF6KClcbiAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGZsYWdzLmxhc3RfdGV4dCA9PT0gJyknICYmIG9wdC5icmVha19jaGFpbmVkX21ldGhvZHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3Vua25vd24oKSB7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0W2N1cnJlbnRfdG9rZW4udGV4dC5sZW5ndGggLSAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZW9mKCkge1xuICAgICAgICAgICAgLy8gVW53aW5kIGFueSBvcGVuIHN0YXRlbWVudHNcbiAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gT3V0cHV0TGluZSgpIHtcbiAgICAgICAgdmFyIGNoYXJhY3Rlcl9jb3VudCA9IDA7XG4gICAgICAgIHZhciBsaW5lX2l0ZW1zID0gW107XG5cbiAgICAgICAgdGhpcy5nZXRfY2hhcmFjdGVyX2NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcmFjdGVyX2NvdW50O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRfaXRlbV9jb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpbmVfaXRlbXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRfb3V0cHV0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZV9pdGVtcy5qb2luKCcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubGFzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGxpbmVfaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBsaW5lX2l0ZW1zW2xpbmVfaXRlbXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucHVzaCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgICAgICBsaW5lX2l0ZW1zLnB1c2goaW5wdXQpO1xuICAgICAgICAgICAgY2hhcmFjdGVyX2NvdW50ICs9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVtb3ZlX2luZGVudCA9IGZ1bmN0aW9uKGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBzcGxpY2VfaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAvLyBza2lwIGVtcHR5IGxpbmVzXG4gICAgICAgICAgICBpZiAobGluZV9pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNraXAgdGhlIHByZWluZGVudCBzdHJpbmcgaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGJhc2VJbmRlbnRTdHJpbmcgJiYgbGluZV9pdGVtc1swXSA9PT0gYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgICAgIHNwbGljZV9pbmRleCA9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSBvbmUgaW5kZW50LCBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAobGluZV9pdGVtc1tzcGxpY2VfaW5kZXhdID09PSBpbmRlbnRfc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyX2NvdW50IC09IGxpbmVfaXRlbXNbc3BsaWNlX2luZGV4XS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbGluZV9pdGVtcy5zcGxpY2Uoc3BsaWNlX2luZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHJpbSA9IGZ1bmN0aW9uKGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLmdldF9pdGVtX2NvdW50KCkgJiZcbiAgICAgICAgICAgICAgICAodGhpcy5sYXN0KCkgPT09ICcgJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3QoKSA9PT0gaW5kZW50X3N0cmluZyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3QoKSA9PT0gYmFzZUluZGVudFN0cmluZykpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGxpbmVfaXRlbXMucG9wKCk7XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyX2NvdW50IC09IGl0ZW0ubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gT3V0cHV0KGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgdmFyIGxpbmVzID1bXTtcbiAgICAgICAgdGhpcy5iYXNlSW5kZW50U3RyaW5nID0gYmFzZUluZGVudFN0cmluZztcbiAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUgPSBudWxsO1xuICAgICAgICB0aGlzLnNwYWNlX2JlZm9yZV90b2tlbiA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuZ2V0X2xpbmVfbnVtYmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNpbmcgb2JqZWN0IGluc3RlYWQgb2Ygc3RyaW5nIHRvIGFsbG93IGZvciBsYXRlciBleHBhbnNpb24gb2YgaW5mbyBhYm91dCBlYWNoIGxpbmVcbiAgICAgICAgdGhpcy5hZGRfbmV3X2xpbmUgPSBmdW5jdGlvbihmb3JjZV9uZXdsaW5lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRfbGluZV9udW1iZXIoKSA9PT0gMSAmJiB0aGlzLmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBubyBuZXdsaW5lIG9uIHN0YXJ0IG9mIGZpbGVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvcmNlX25ld2xpbmUgfHwgIXRoaXMuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZSA9IG5ldyBPdXRwdXRMaW5lKCk7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCh0aGlzLmN1cnJlbnRfbGluZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdGhpcy5hZGRfbmV3X2xpbmUodHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5nZXRfY29kZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHN3ZWV0X2NvZGUgPSBsaW5lc1swXS5nZXRfb3V0cHV0KCk7XG4gICAgICAgICAgICBmb3IgKHZhciBsaW5lX2luZGV4ID0gMTsgbGluZV9pbmRleCA8IGxpbmVzLmxlbmd0aDsgbGluZV9pbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgc3dlZXRfY29kZSArPSAnXFxuJyArIGxpbmVzW2xpbmVfaW5kZXhdLmdldF9vdXRwdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3ZWV0X2NvZGUgPSBzd2VldF9jb2RlLnJlcGxhY2UoL1tcXHJcXG5cXHQgXSskLywgJycpO1xuICAgICAgICAgICAgcmV0dXJuIHN3ZWV0X2NvZGU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFkZF9pbmRlbnRfc3RyaW5nID0gZnVuY3Rpb24oaW5kZW50YXRpb25fbGV2ZWwpIHtcbiAgICAgICAgICAgIGlmIChiYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUucHVzaChiYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTmV2ZXIgaW5kZW50IHlvdXIgZmlyc3Qgb3V0cHV0IGluZGVudCBhdCB0aGUgc3RhcnQgb2YgdGhlIGZpbGVcbiAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRlbnRhdGlvbl9sZXZlbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnB1c2goaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGRfdG9rZW4gPSBmdW5jdGlvbihwcmludGFibGVfdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkX3NwYWNlX2JlZm9yZV90b2tlbigpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUucHVzaChwcmludGFibGVfdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGRfc3BhY2VfYmVmb3JlX3Rva2VuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zcGFjZV9iZWZvcmVfdG9rZW4gJiYgdGhpcy5jdXJyZW50X2xpbmUuZ2V0X2l0ZW1fY291bnQoKSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXN0X291dHB1dCA9IHRoaXMuY3VycmVudF9saW5lLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF9vdXRwdXQgIT09ICcgJyAmJiBsYXN0X291dHB1dCAhPT0gaW5kZW50X3N0cmluZyAmJiBsYXN0X291dHB1dCAhPT0gYmFzZUluZGVudFN0cmluZykgeyAvLyBwcmV2ZW50IG9jY2Fzc2lvbmFsIGR1cGxpY2F0ZSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS5wdXNoKCcgJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVtb3ZlX3JlZHVuZGFudF9pbmRlbnRhdGlvbiA9IGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBlZmZlY3RpdmUgYnV0IGhhcyBzb21lIGlzc3VlczpcbiAgICAgICAgICAgIC8vICAgICAtIGxlc3MgdGhhbiBncmVhdCBwZXJmb3JtYW5jZSBkdWUgdG8gYXJyYXkgc3BsaWNpbmdcbiAgICAgICAgICAgIC8vICAgICAtIGNhbiBjYXVzZSBsaW5lIHdyYXAgdG8gaGFwcGVuIHRvbyBzb29uIGR1ZSB0byBpbmRlbnQgcmVtb3ZhbFxuICAgICAgICAgICAgLy8gICAgICAgICAgIGFmdGVyIHdyYXAgcG9pbnRzIGFyZSBjYWxjdWxhdGVkXG4gICAgICAgICAgICAvLyBUaGVzZSBpc3N1ZXMgYXJlIG1pbm9yIGNvbXBhcmVkIHRvIHVnbHkgaW5kZW50YXRpb24uXG5cbiAgICAgICAgICAgIGlmIChmcmFtZS5tdWx0aWxpbmVfZnJhbWUgfHxcbiAgICAgICAgICAgICAgICBmcmFtZS5tb2RlID09PSBNT0RFLkZvckluaXRpYWxpemVyIHx8XG4gICAgICAgICAgICAgICAgZnJhbWUubW9kZSA9PT0gTU9ERS5Db25kaXRpb25hbCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVtb3ZlIG9uZSBpbmRlbnQgZnJvbSBlYWNoIGxpbmUgaW5zaWRlIHRoaXMgc2VjdGlvblxuICAgICAgICAgICAgdmFyIGluZGV4ID0gZnJhbWUuc3RhcnRfbGluZV9pbmRleDtcbiAgICAgICAgICAgIHZhciBsaW5lO1xuXG4gICAgICAgICAgICB2YXIgb3V0cHV0X2xlbmd0aCA9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IG91dHB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsaW5lc1tpbmRleF0ucmVtb3ZlX2luZGVudChpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50cmltID0gZnVuY3Rpb24oZWF0X25ld2xpbmVzKSB7XG4gICAgICAgICAgICBlYXRfbmV3bGluZXMgPSAoZWF0X25ld2xpbmVzID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBlYXRfbmV3bGluZXM7XG5cbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnRyaW0oaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZyk7XG5cbiAgICAgICAgICAgIHdoaWxlIChlYXRfbmV3bGluZXMgJiYgbGluZXMubGVuZ3RoID4gMSAmJlxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLmdldF9pdGVtX2NvdW50KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBsaW5lcy5wb3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUudHJpbShpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuanVzdF9hZGRlZF9uZXdsaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50X2xpbmUuZ2V0X2l0ZW1fY291bnQoKSA9PT0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuanVzdF9hZGRlZF9ibGFua2xpbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gc3RhcnQgb2YgdGhlIGZpbGUgYW5kIG5ld2xpbmUgPSBibGFua1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBsaW5lID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMl07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpbmUuZ2V0X2l0ZW1fY291bnQoKSA9PT0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgdmFyIFRva2VuID0gZnVuY3Rpb24odHlwZSwgdGV4dCwgbmV3bGluZXMsIHdoaXRlc3BhY2VfYmVmb3JlLCBtb2RlLCBwYXJlbnQpIHtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5jb21tZW50c19iZWZvcmUgPSBbXTtcbiAgICAgICAgdGhpcy5uZXdsaW5lcyA9IG5ld2xpbmVzIHx8IDA7XG4gICAgICAgIHRoaXMud2FudGVkX25ld2xpbmUgPSBuZXdsaW5lcyA+IDA7XG4gICAgICAgIHRoaXMud2hpdGVzcGFjZV9iZWZvcmUgPSB3aGl0ZXNwYWNlX2JlZm9yZSB8fCBbXTtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRva2VuaXplcihpbnB1dCwgb3B0cywgaW5kZW50X3N0cmluZykge1xuXG4gICAgICAgIHZhciB3aGl0ZXNwYWNlID0gXCJcXG5cXHJcXHQgXCIuc3BsaXQoJycpO1xuICAgICAgICB2YXIgZGlnaXQgPSAvWzAtOV0vO1xuXG4gICAgICAgIHZhciBwdW5jdCA9ICgnKyAtICogLyAlICYgKysgLS0gPSArPSAtPSAqPSAvPSAlPSA9PSA9PT0gIT0gIT09ID4gPCA+PSA8PSA+PiA8PCA+Pj4gPj4+PSA+Pj0gPDw9ICYmICY9IHwgfHwgISB+ICwgOiA/IF4gXj0gfD0gOjogPT4nXG4gICAgICAgICAgICAgICAgKycgPCU9IDwlICU+IDw/PSA8PyA/PicpLnNwbGl0KCcgJyk7IC8vIHRyeSB0byBiZSBhIGdvb2QgYm95IGFuZCB0cnkgbm90IHRvIGJyZWFrIHRoZSBtYXJrdXAgbGFuZ3VhZ2UgaWRlbnRpZmllcnNcblxuICAgICAgICAvLyB3b3JkcyB3aGljaCBzaG91bGQgYWx3YXlzIHN0YXJ0IG9uIG5ldyBsaW5lLlxuICAgICAgICB0aGlzLmxpbmVfc3RhcnRlcnMgPSAnY29udGludWUsdHJ5LHRocm93LHJldHVybix2YXIsbGV0LGNvbnN0LGlmLHN3aXRjaCxjYXNlLGRlZmF1bHQsZm9yLHdoaWxlLGJyZWFrLGZ1bmN0aW9uLHlpZWxkLGltcG9ydCxleHBvcnQnLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciByZXNlcnZlZF93b3JkcyA9IHRoaXMubGluZV9zdGFydGVycy5jb25jYXQoWydkbycsICdpbicsICdlbHNlJywgJ2dldCcsICdzZXQnLCAnbmV3JywgJ2NhdGNoJywgJ2ZpbmFsbHknLCAndHlwZW9mJ10pO1xuXG4gICAgICAgIHZhciBuX25ld2xpbmVzLCB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbiwgaW5faHRtbF9jb21tZW50LCB0b2tlbnMsIHBhcnNlcl9wb3M7XG4gICAgICAgIHZhciBpbnB1dF9sZW5ndGg7XG5cbiAgICAgICAgdGhpcy50b2tlbml6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gY2FjaGUgdGhlIHNvdXJjZSdzIGxlbmd0aC5cbiAgICAgICAgICAgIGlucHV0X2xlbmd0aCA9IGlucHV0Lmxlbmd0aFxuICAgICAgICAgICAgcGFyc2VyX3BvcyA9IDA7XG4gICAgICAgICAgICBpbl9odG1sX2NvbW1lbnQgPSBmYWxzZVxuICAgICAgICAgICAgdG9rZW5zID0gW107XG5cbiAgICAgICAgICAgIHZhciBuZXh0LCBsYXN0O1xuICAgICAgICAgICAgdmFyIHRva2VuX3ZhbHVlcztcbiAgICAgICAgICAgIHZhciBvcGVuID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBvcGVuX3N0YWNrID0gW107XG4gICAgICAgICAgICB2YXIgY29tbWVudHMgPSBbXTtcblxuICAgICAgICAgICAgd2hpbGUgKCEobGFzdCAmJiBsYXN0LnR5cGUgPT09ICdUS19FT0YnKSkge1xuICAgICAgICAgICAgICAgIHRva2VuX3ZhbHVlcyA9IHRva2VuaXplX25leHQoKTtcbiAgICAgICAgICAgICAgICBuZXh0ID0gbmV3IFRva2VuKHRva2VuX3ZhbHVlc1sxXSwgdG9rZW5fdmFsdWVzWzBdLCBuX25ld2xpbmVzLCB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbik7XG4gICAgICAgICAgICAgICAgd2hpbGUobmV4dC50eXBlID09PSAnVEtfSU5MSU5FX0NPTU1FTlQnIHx8IG5leHQudHlwZSA9PT0gJ1RLX0NPTU1FTlQnIHx8XG4gICAgICAgICAgICAgICAgICAgIG5leHQudHlwZSA9PT0gJ1RLX0JMT0NLX0NPTU1FTlQnIHx8IG5leHQudHlwZSA9PT0gJ1RLX1VOS05PV04nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnRzLnB1c2gobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuX3ZhbHVlcyA9IHRva2VuaXplX25leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCA9IG5ldyBUb2tlbih0b2tlbl92YWx1ZXNbMV0sIHRva2VuX3ZhbHVlc1swXSwgbl9uZXdsaW5lcywgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb21tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dC5jb21tZW50c19iZWZvcmUgPSBjb21tZW50cztcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudHMgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobmV4dC50eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snIHx8IG5leHQudHlwZSA9PT0gJ1RLX1NUQVJUX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQucGFyZW50ID0gbGFzdDtcbiAgICAgICAgICAgICAgICAgICAgb3BlbiA9IG5leHQ7XG4gICAgICAgICAgICAgICAgICAgIG9wZW5fc3RhY2sucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgICB9ICBlbHNlIGlmICgobmV4dC50eXBlID09PSAnVEtfRU5EX0JMT0NLJyB8fCBuZXh0LnR5cGUgPT09ICdUS19FTkRfRVhQUicpICYmXG4gICAgICAgICAgICAgICAgICAgIChvcGVuICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0LnRleHQgPT09ICddJyAmJiBvcGVuLnRleHQgPT09ICdbJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0LnRleHQgPT09ICcpJyAmJiBvcGVuLnRleHQgPT09ICcoJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0LnRleHQgPT09ICd9JyAmJiBvcGVuLnRleHQgPT09ICd9JykpKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0LnBhcmVudCA9IG9wZW4ucGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBvcGVuID0gb3Blbl9zdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgICBsYXN0ID0gbmV4dDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRva2VucztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRva2VuaXplX25leHQoKSB7XG4gICAgICAgICAgICB2YXIgaSwgcmVzdWx0aW5nX3N0cmluZztcblxuICAgICAgICAgICAgbl9uZXdsaW5lcyA9IDA7XG4gICAgICAgICAgICB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbiA9IFtdO1xuXG4gICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA+PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsYXN0X3Rva2VuO1xuICAgICAgICAgICAgaWYgKHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsYXN0X3Rva2VuID0gdG9rZW5zW3Rva2Vucy5sZW5ndGgtMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgc2FrZSBvZiB0b2tlbml6aW5nIHdlIGNhbiBwcmV0ZW5kIHRoYXQgdGhlcmUgd2FzIG9uIG9wZW4gYnJhY2UgdG8gc3RhcnRcbiAgICAgICAgICAgICAgICBsYXN0X3Rva2VuID0gbmV3IFRva2VuKCdUS19TVEFSVF9CTE9DSycsICd7Jyk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG5cbiAgICAgICAgICAgIHdoaWxlIChpbl9hcnJheShjLCB3aGl0ZXNwYWNlKSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgIG5fbmV3bGluZXMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4gPSBbXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5fbmV3bGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IGluZGVudF9zdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuLnB1c2goaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyAhPT0gJ1xccicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuLnB1c2goJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkaWdpdC50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFsbG93X2RlY2ltYWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBhbGxvd19lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgbG9jYWxfZGlnaXQgPSBkaWdpdDtcblxuICAgICAgICAgICAgICAgIGlmIChjID09PSAnMCcgJiYgcGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiAvW1h4XS8udGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN3aXRjaCB0byBoZXggbnVtYmVyLCBubyBkZWNpbWFsIG9yIGUsIGp1c3QgaGV4IGRpZ2l0c1xuICAgICAgICAgICAgICAgICAgICBhbGxvd19kZWNpbWFsID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93X2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxfZGlnaXQgPSAvWzAxMjM0NTY3ODlhYmNkZWZBQkNERUZdL1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIGtub3cgdGhpcyBmaXJzdCBsb29wIHdpbGwgcnVuLiAgSXQga2VlcHMgdGhlIGxvZ2ljIHNpbXBsZXIuXG4gICAgICAgICAgICAgICAgICAgIGMgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyAtPSAxXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBkaWdpdHNcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBsb2NhbF9kaWdpdC50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dfZGVjaW1hbCAmJiBwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X2RlY2ltYWwgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd19lICYmIHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgL1tFZV0vLnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIC9bKy1dLy50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X2RlY2ltYWwgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1dPUkQnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFjb3JuLmlzSWRlbnRpZmllclN0YXJ0KGlucHV0LmNoYXJDb2RlQXQocGFyc2VyX3Bvcy0xKSkpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoYWNvcm4uaXNJZGVudGlmaWVyQ2hhcihpbnB1dC5jaGFyQ29kZUF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA9PT0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIShsYXN0X3Rva2VuLnR5cGUgPT09ICdUS19ET1QnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAobGFzdF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGxhc3RfdG9rZW4udGV4dCwgWydzZXQnLCAnZ2V0J10pKSlcbiAgICAgICAgICAgICAgICAgICAgJiYgaW5fYXJyYXkoYywgcmVzZXJ2ZWRfd29yZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnaW4nKSB7IC8vIGhhY2sgZm9yICdpbicgb3BlcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX09QRVJBVE9SJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfUkVTRVJWRUQnXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19XT1JEJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnKCcgfHwgYyA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfU1RBUlRfRVhQUiddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJyknIHx8IGMgPT09ICddJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0VORF9FWFBSJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAneycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19TVEFSVF9CTE9DSyddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfRU5EX0JMT0NLJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnOycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19TRU1JQ09MT04nXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcvJykge1xuICAgICAgICAgICAgICAgIHZhciBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgLy8gcGVlayBmb3IgY29tbWVudCAvKiAuLi4gKi9cbiAgICAgICAgICAgICAgICB2YXIgaW5saW5lX2NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiAhKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJyonICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zICsgMSkgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MgKyAxKSA9PT0gJy8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjID09PSBcIlxcblwiIHx8IGMgPT09IFwiXFxyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5saW5lX2NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5saW5lX2NvbW1lbnQgJiYgbl9uZXdsaW5lcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsnLyonICsgY29tbWVudCArICcqLycsICdUS19JTkxJTkVfQ09NTUVOVCddO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsnLyonICsgY29tbWVudCArICcqLycsICdUS19CTE9DS19DT01NRU5UJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcGVlayBmb3IgY29tbWVudCAvLyAuLi5cbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IGM7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09ICdcXHInICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSAhPT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPj0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjb21tZW50LCAnVEtfQ09NTUVOVCddO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ2AnIHx8IGMgPT09IFwiJ1wiIHx8IGMgPT09ICdcIicgfHwgLy8gc3RyaW5nXG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAoYyA9PT0gJy8nKSB8fCAvLyByZWdleHBcbiAgICAgICAgICAgICAgICAgICAgKG9wdHMuZTR4ICYmIGMgPT09IFwiPFwiICYmIGlucHV0LnNsaWNlKHBhcnNlcl9wb3MgLSAxKS5tYXRjaCgvXjwoWy1hLXpBLVo6MC05Xy5dK3x7W157fV0qfXwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdKVxccyooWy1hLXpBLVo6MC05Xy5dKz0oJ1teJ10qJ3xcIlteXCJdKlwifHtbXnt9XSp9KVxccyopKlxcLz9cXHMqPi8pKSAvLyB4bWxcbiAgICAgICAgICAgICAgICApICYmICggLy8gcmVnZXggYW5kIHhtbCBjYW4gb25seSBhcHBlYXIgaW4gc3BlY2lmaWMgbG9jYXRpb25zIGR1cmluZyBwYXJzaW5nXG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkobGFzdF90b2tlbi50ZXh0ICwgWydyZXR1cm4nLCAnY2FzZScsICd0aHJvdycsICdlbHNlJywgJ2RvJywgJ3R5cGVvZicsICd5aWVsZCddKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdG9rZW4udHlwZSA9PT0gJ1RLX0VORF9FWFBSJyAmJiBsYXN0X3Rva2VuLnRleHQgPT09ICcpJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF90b2tlbi5wYXJlbnQgJiYgbGFzdF90b2tlbi5wYXJlbnQudHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShsYXN0X3Rva2VuLnBhcmVudC50ZXh0LCBbJ2lmJywgJ3doaWxlJywgJ2ZvciddKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGluX2FycmF5KGxhc3RfdG9rZW4udHlwZSwgWydUS19DT01NRU5UJywgJ1RLX1NUQVJUX0VYUFInLCAnVEtfU1RBUlRfQkxPQ0snLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1RLX0VORF9CTE9DSycsICdUS19PUEVSQVRPUicsICdUS19FUVVBTFMnLCAnVEtfRU9GJywgJ1RLX1NFTUlDT0xPTicsICdUS19DT01NQSdcbiAgICAgICAgICAgICAgICAgICAgXSkpXG4gICAgICAgICAgICAgICAgKSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlcCA9IGMsXG4gICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBoYXNfY2hhcl9lc2NhcGVzID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nID0gYztcblxuICAgICAgICAgICAgICAgIGlmIChzZXAgPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgcmVnZXhwXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbl9jaGFyX2NsYXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKChlc2MgfHwgaW5fY2hhcl9jbGFzcyB8fCBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09IHNlcCkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAhYWNvcm4ubmV3bGluZS50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXNjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluX2NoYXJfY2xhc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5fY2hhcl9jbGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdHMuZTR4ICYmIHNlcCA9PT0gJzwnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBlNHggeG1sIGxpdGVyYWxzXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIHZhciB4bWxSZWdFeHAgPSAvPChcXC8/KShbLWEtekEtWjowLTlfLl0rfHtbXnt9XSp9fCFcXFtDREFUQVxcW1tcXHNcXFNdKj9cXF1cXF0pXFxzKihbLWEtekEtWjowLTlfLl0rPSgnW14nXSonfFwiW15cIl0qXCJ8e1tee31dKn0pXFxzKikqKFxcLz8pXFxzKj4vZztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHhtbFN0ciA9IGlucHV0LnNsaWNlKHBhcnNlcl9wb3MgLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoID0geG1sUmVnRXhwLmV4ZWMoeG1sU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoLmluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcm9vdFRhZyA9IG1hdGNoWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlcHRoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0VuZFRhZyA9ICEhIG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWdOYW1lID0gbWF0Y2hbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzU2luZ2xldG9uVGFnID0gKCAhISBtYXRjaFttYXRjaC5sZW5ndGggLSAxXSkgfHwgKHRhZ05hbWUuc2xpY2UoMCwgOCkgPT09IFwiIVtDREFUQVtcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhZ05hbWUgPT09IHJvb3RUYWcgJiYgIWlzU2luZ2xldG9uVGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0VuZFRhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS1kZXB0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsrZGVwdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0geG1sUmVnRXhwLmV4ZWMoeG1sU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4bWxMZW5ndGggPSBtYXRjaCA/IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoIDogeG1sU3RyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0geG1sTGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbeG1sU3RyLnNsaWNlKDAsIHhtbExlbmd0aCksIFwiVEtfU1RSSU5HXCJdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBUZW1wbGF0ZSBzdHJpbmdzIGNhbiB0cmF2ZXJzIGxpbmVzIHdpdGhvdXQgZXNjYXBlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgIC8vIE90aGVyIHN0cmluZ3MgY2Fubm90XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVzYyB8fCAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSBzZXAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc2VwID09PSAnYCcgfHwgIWFjb3JuLm5ld2xpbmUudGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlc2MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAneCcgfHwgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzX2NoYXJfZXNjYXBlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2MgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICdcXFxcJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGhhc19jaGFyX2VzY2FwZXMgJiYgb3B0cy51bmVzY2FwZV9zdHJpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgPSB1bmVzY2FwZV9zdHJpbmcocmVzdWx0aW5nX3N0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSBzZXApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyArPSBzZXA7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VwID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZ2V4cHMgbWF5IGhhdmUgbW9kaWZpZXJzIC9yZWdleHAvTU9EICwgc28gZmV0Y2ggdGhvc2UsIHRvb1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBbZ2ltXSBhcmUgdmFsaWQsIGJ1dCBpZiB0aGUgdXNlciBwdXRzIGluIGdhcmJhZ2UsIGRvIHdoYXQgd2UgY2FuIHRvIHRha2UgaXQuXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBhY29ybi5pc0lkZW50aWZpZXJTdGFydChpbnB1dC5jaGFyQ29kZUF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gW3Jlc3VsdGluZ19zdHJpbmcsICdUS19TVFJJTkcnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcjJykge1xuXG4gICAgICAgICAgICAgICAgaWYgKHRva2Vucy5sZW5ndGggPT09IDAgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnIScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2hlYmFuZ1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nID0gYztcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgYyAhPT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGM7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0cmltKHJlc3VsdGluZ19zdHJpbmcpICsgJ1xcbicsICdUS19VTktOT1dOJ107XG4gICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgIC8vIFNwaWRlcm1vbmtleS1zcGVjaWZpYyBzaGFycCB2YXJpYWJsZXMgZm9yIGNpcmN1bGFyIHJlZmVyZW5jZXNcbiAgICAgICAgICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9Fbi9TaGFycF92YXJpYWJsZXNfaW5fSmF2YVNjcmlwdFxuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly9teHIubW96aWxsYS5vcmcvbW96aWxsYS1jZW50cmFsL3NvdXJjZS9qcy9zcmMvanNzY2FuLmNwcCBhcm91bmQgbGluZSAxOTM1XG4gICAgICAgICAgICAgICAgdmFyIHNoYXJwID0gJyMnO1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGRpZ2l0LnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hhcnAgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBjICE9PSAnIycgJiYgYyAhPT0gJz0nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICcjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICdbJyAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcyArIDEpID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYXJwICs9ICdbXSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAneycgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MgKyAxKSA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFycCArPSAne30nO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbc2hhcnAsICdUS19XT1JEJ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJzwnICYmIGlucHV0LnN1YnN0cmluZyhwYXJzZXJfcG9zIC0gMSwgcGFyc2VyX3BvcyArIDMpID09PSAnPCEtLScpIHtcbiAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDM7XG4gICAgICAgICAgICAgICAgYyA9ICc8IS0tJztcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSAnXFxuJyAmJiBwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluX2h0bWxfY29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfQ09NTUVOVCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJy0nICYmIGluX2h0bWxfY29tbWVudCAmJiBpbnB1dC5zdWJzdHJpbmcocGFyc2VyX3BvcyAtIDEsIHBhcnNlcl9wb3MgKyAyKSA9PT0gJy0tPicpIHtcbiAgICAgICAgICAgICAgICBpbl9odG1sX2NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnLS0+JywgJ1RLX0NPTU1FTlQnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0RPVCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaW5fYXJyYXkoYywgcHVuY3QpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgaW5fYXJyYXkoYyArIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSwgcHVuY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJywnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0NPTU1BJ107XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfRVFVQUxTJ107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfT1BFUkFUT1InXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1VOS05PV04nXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gdW5lc2NhcGVfc3RyaW5nKHMpIHtcbiAgICAgICAgICAgIHZhciBlc2MgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBvdXQgPSAnJyxcbiAgICAgICAgICAgICAgICBwb3MgPSAwLFxuICAgICAgICAgICAgICAgIHNfaGV4ID0gJycsXG4gICAgICAgICAgICAgICAgZXNjYXBlZCA9IDAsXG4gICAgICAgICAgICAgICAgYztcblxuICAgICAgICAgICAgd2hpbGUgKGVzYyB8fCBwb3MgPCBzLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAgICAgYyA9IHMuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgcG9zKys7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXNjKSB7XG4gICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW1wbGUgaGV4LWVzY2FwZSBcXHgyNFxuICAgICAgICAgICAgICAgICAgICAgICAgc19oZXggPSBzLnN1YnN0cihwb3MsIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1bmljb2RlLWVzY2FwZSwgXFx1MjEzNFxuICAgICAgICAgICAgICAgICAgICAgICAgc19oZXggPSBzLnN1YnN0cihwb3MsIDQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zICs9IDQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzb21lIGNvbW1vbiBlc2NhcGUsIGUuZyBcXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnXFxcXCcgKyBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzX2hleC5tYXRjaCgvXlswMTIzNDU2Nzg5YWJjZGVmQUJDREVGXSskLykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvbWUgd2VpcmQgZXNjYXBpbmcsIGJhaWwgb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGVhdmluZyB3aG9sZSBzdHJpbmcgaW50YWN0XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGVzY2FwZWQgPSBwYXJzZUludChzX2hleCwgMTYpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlc2NhcGVkID49IDB4MDAgJiYgZXNjYXBlZCA8IDB4MjApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxlYXZlIDB4MDAuLi4weDFmIGVzY2FwZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAneCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFx4JyArIHNfaGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFx1JyArIHNfaGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXNjYXBlZCA9PT0gMHgyMiB8fCBlc2NhcGVkID09PSAweDI3IHx8IGVzY2FwZWQgPT09IDB4NWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZS1xdW90ZSwgYXBvc3Ryb3BoZSwgYmFja3NsYXNoIC0gZXNjYXBlIHRoZXNlXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFwnICsgU3RyaW5nLmZyb21DaGFyQ29kZShlc2NhcGVkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSAneCcgJiYgZXNjYXBlZCA+IDB4N2UgJiYgZXNjYXBlZCA8PSAweGZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBiYWlsIG91dCBvbiBcXHg3Zi4uXFx4ZmYsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZWF2aW5nIHdob2xlIHN0cmluZyBlc2NhcGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaXQncyBwcm9iYWJseSBjb21wbGV0ZWx5IGJpbmFyeVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShlc2NhcGVkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVzYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuXG4gICAgfVxuXG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4geyBqc19iZWF1dGlmeToganNfYmVhdXRpZnkgfTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQ29tbW9uSlMuIEp1c3QgcHV0IHRoaXMgZmlsZSBzb21ld2hlcmUgb24geW91ciByZXF1aXJlLnBhdGhzXG4gICAgICAgIC8vIGFuZCB5b3Ugd2lsbCBiZSBhYmxlIHRvIGB2YXIganNfYmVhdXRpZnkgPSByZXF1aXJlKFwiYmVhdXRpZnlcIikuanNfYmVhdXRpZnlgLlxuICAgICAgICBleHBvcnRzLmpzX2JlYXV0aWZ5ID0ganNfYmVhdXRpZnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHJ1bm5pbmcgYSB3ZWIgcGFnZSBhbmQgZG9uJ3QgaGF2ZSBlaXRoZXIgb2YgdGhlIGFib3ZlLCBhZGQgb3VyIG9uZSBnbG9iYWxcbiAgICAgICAgd2luZG93LmpzX2JlYXV0aWZ5ID0ganNfYmVhdXRpZnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlIGRvbid0IGV2ZW4gaGF2ZSB3aW5kb3csIHRyeSBnbG9iYWwuXG4gICAgICAgIGdsb2JhbC5qc19iZWF1dGlmeSA9IGpzX2JlYXV0aWZ5O1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyKSB7XG5cbiAgLy8kbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG5cbiAgLy8gRm9yIGFueSB1bm1hdGNoZWQgdXJsLCByZWRpcmVjdCB0byAvXG4gICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcblxuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnYXBwJywge1xuICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiAnQXBwQ3RybCcsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvYXBwL3ZpZXdzL2luZGV4Lmh0bWwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBmc1Byb21pc2U6IFsnJHEnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRxKSB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgZmlsZXN5c3RlbS5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVzeXN0ZW0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIGZzV2F0Y2hlclByb21pc2U6IFsnJHEnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRxKSB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgd2F0Y2hlci5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHdhdGNoZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmhvbWUnLCB7XG4gICAgICB1cmw6ICcnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2FwcC92aWV3cy9hcHAuaHRtbCdcbiAgICB9KTtcblxuICBmdW5jdGlvbiByZWdpc3RlckRiU3RhdGVzKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlclxuICAgICAgLnN0YXRlKCdkYicsIHtcbiAgICAgICAgdXJsOiAnL2RiJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0RiQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvZGIuaHRtbCdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnLzptb2RlbE5hbWUnLFxuICAgICAgICBjb250cm9sbGVyOiAnTW9kZWxDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9tb2RlbC5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIG1vZGVsUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvJyArICRzdGF0ZVBhcmFtcy5tb2RlbE5hbWUgKyAnLmpzb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsLmVkaXQnLCB7XG4gICAgICAgIHVybDogJycsIC8vIERlZmF1bHQuIFdpbGwgYmUgdXNlZCBpbiBwbGFjZSBvZiBhYnN0cmFjdCBwYXJlbnQgaW4gdGhlIGNhc2Ugb2YgaGl0dGluZyB0aGUgaW5kZXggKGRiLm1vZGVsLylcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9tb2RlbC1lZGl0b3IuaHRtbCdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsLnNjaGVtYScsIHtcbiAgICAgICAgdXJsOiAnLzpzY2hlbWFJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnU2NoZW1hQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL3NjaGVtYS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hLmtleScsIHtcbiAgICAgICAgdXJsOiAnLzprZXlJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnS2V5Q3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2tleS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuZGlhZ3JhbScsIHtcbiAgICAgICAgdXJsOiAnI2RpYWdyYW0nLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgICAgLy9jb250cm9sbGVyOiAnRGlhZ3JhbUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi1kaWFncmFtLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9XG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXJBcGlTdGF0ZXMoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAuc3RhdGUoJ2FwaScsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9hcGkvOmFwaU5hbWUnLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2FwaS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIGFwaVByb21pc2U6IFsnJGh0dHAnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5fYXBpOyAvLyRodHRwLmdldCgnLycgKyAkc3RhdGVQYXJhbXMubW9kZWxOYW1lICsgJy5qc29uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuaG9tZScsIHtcbiAgICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoYXBpLylcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYXBpLWhvbWUuaHRtbCdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5kaWFncmFtJywge1xuICAgICAgICB1cmw6ICcvZGlhZ3JhbScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlEaWFncmFtQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2RpYWdyYW0uaHRtbCdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL2NvbnRyb2xsZXInXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5ob21lJywge1xuICAgICAgICB1cmw6ICcnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvY29udHJvbGxlci1ob21lLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5pdGVtJywge1xuICAgICAgICB1cmw6ICcvOmNvbnRyb2xsZXJJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpQ29udHJvbGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvY29udHJvbGxlci5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXIuaXRlbS5oYW5kbGVyJywge1xuICAgICAgICB1cmw6ICcvOmhhbmRsZXJJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ3hAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUhhbmRsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2hhbmRsZXIuaHRtbCdcbiAgICAgICAgICB9LFxuICAgICAgICAgICdoYW5kbGVyQGFwaS5jb250cm9sbGVyLml0ZW0nOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0naGFuZGxlcicgaW4gcGFyZW50IHN0YXRlICdhcGkuY29udHJvbGxlci5pdGVtJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlIYW5kbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9oYW5kbGVyLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUnLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvcm91dGUnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaG9tZScsIHtcbiAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLWhvbWUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5pdGVtJywge1xuICAgICAgICB1cmw6ICcvOnJvdXRlSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaVJvdXRlQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9yb3V0ZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLml0ZW0uYWN0aW9uJywge1xuICAgICAgICB1cmw6ICcvOmFjdGlvbklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlBY3Rpb25DdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2FjdGlvbi5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgfVxuXG59O1xuIiwidmFyIEFwcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL2FwcCcpO1xudmFyIEZpbGVTeXN0ZW1PYmplY3QgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvZmlsZS1zeXN0ZW0tb2JqZWN0Jyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBwYXJzZUNvb2tpZSA9IHJlcXVpcmUoJ2Nvb2tpZScpLnBhcnNlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBmcywgd2F0Y2hlciwgZmlsZVNlcnZpY2UsIGRpYWxvZywgY29sb3JTZXJ2aWNlLCBzZXNzaW9uU2VydmljZSkge1xuXG4gIHZhciBtb2RlbCA9IG5ldyBBcHBNb2RlbCh7XG4gICAgZnM6IGZzLFxuICAgIHdhdGNoZXI6IHdhdGNoZXIsXG4gICAgc2Vzc2lvblNlcnZpY2U6IHNlc3Npb25TZXJ2aWNlLFxuICAgIHJlY2VudEZpbGVzOiBhbmd1bGFyLmZyb21Kc29uKHBhcnNlQ29va2llKGRvY3VtZW50LmNvb2tpZSkucmVjZW50RmlsZXMpXG4gIH0pO1xuXG4gICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuXG4gIC8vIExpc3RlbiBvdXQgZm9yIGNoYW5nZXMgdG8gdGhlIGZpbGUgc3lzdGVtXG4gIHdhdGNoZXIub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuICAgIGNvbnNvbGUubG9nKCdmcyBjaGFuZ2UnKTtcbiAgICAkc2NvcGUuJGFwcGx5KCk7XG4gIH0pO1xuXG4gIHZhciBwYWNrYWdlRmlsZSA9IG1vZGVsLnBhY2thZ2VGaWxlO1xuICBpZiAocGFja2FnZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShwYWNrYWdlRmlsZS5wYXRoKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgbW9kZWwucGFja2FnZSA9IHJlcztcbiAgICB9KTtcbiAgfVxuXG4gIHZhciByZWFkbWVGaWxlID0gbW9kZWwucmVhZG1lRmlsZTtcbiAgaWYgKHJlYWRtZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShyZWFkbWVGaWxlLnBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBtb2RlbC5yZWFkbWUgPSByZXM7XG4gICAgfSk7XG4gIH1cblxuICAkc2NvcGUub25TZWFyY2hGb3JtU3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgJHN0YXRlLmdvKCdhcHAuZnMuc2VhcmNoJywge1xuICAgICAgcTogc2VhcmNoRm9ybS5xLnZhbHVlXG4gICAgfSk7XG4gIH07XG4gIC8vXG4gIC8vICRzY29wZS5maWxlVXJsID0gZnVuY3Rpb24oZmlsZSkge1xuICAvLyAgIHJldHVybiAkc3RhdGUuaHJlZignYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAvLyAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZpbGUucGF0aCB8fCBmaWxlKVxuICAvLyAgIH0pO1xuICAvLyB9O1xuXG4gICRzY29wZS5nb3RvRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25UbygnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZpbGUucGF0aCB8fCBmaWxlKVxuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5maWxlUGFyYW1zID0gZnVuY3Rpb24oZmlsZSkge1xuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZmlsZS5wYXRoKVxuICAgIH07XG4gIH07XG5cblxuICAkc2NvcGUuZGlyVXJsID0gZnVuY3Rpb24oZGlyKSB7XG4gICAgcmV0dXJuICRzdGF0ZS5ocmVmKCdhcHAuZnMuZmluZGVyJywge1xuICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGRpci5wYXRoKVxuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbG9yIGZ1bmN0aW9uIHVzZWQgdG8gY3JlYXRlIGRldGVybWluaXN0aWMgY29sb3JzIGZyb20gYSBzdHJpbmdcbiAgJHNjb3BlLmNvbG9yID0gZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBzdHIgPSAoaXRlbSBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1PYmplY3QpID8gaXRlbS5leHQgOiBpdGVtO1xuICAgIHJldHVybiBzdHIgPyAnIycgKyBjb2xvclNlcnZpY2Uoc3RyKS5oZXgoKSA6ICcnO1xuICB9O1xuICAkc2NvcGUuY29sb3JUZXh0ID0gZnVuY3Rpb24oaXRlbSkge1xuICAgIHZhciBzdHIgPSAoaXRlbSBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1PYmplY3QpID8gaXRlbS5leHQgOiBpdGVtO1xuICAgIHJldHVybiBzdHIgPyAnIycgKyBjb2xvclNlcnZpY2Uoc3RyKS5yZWFkYWJsZSgpLmhleCgpIDogJyc7XG4gIH07XG5cbiAgZnVuY3Rpb24gc2F2ZVNlc3Npb24oc2Vzc2lvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgcGF0aCA9IHNlc3Npb24ucGF0aDtcbiAgICB2YXIgZWRpdFNlc3Npb24gPSBzZXNzaW9uLmRhdGE7XG4gICAgdmFyIGNvbnRlbnRzID0gZWRpdFNlc3Npb24uZ2V0VmFsdWUoKTtcblxuICAgIGNvbnNvbGUubG9nKCd3cml0ZUZpbGUnLCBwYXRoKTtcblxuICAgIGZzLndyaXRlRmlsZShwYXRoLCBjb250ZW50cywgZnVuY3Rpb24ocnNwKSB7XG5cbiAgICAgIGlmIChyc3AuZXJyKSB7XG5cbiAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIFdyaXRlIEVycm9yJyxcbiAgICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyc3AuZXJyKVxuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsYmFjayhyc3AuZXJyKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZSBGYWlsZWQnLCBwYXRoLCByc3AuZXJyKTtcblxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBjb25zb2xlLmxvZygnd3JpdGVGaWxlIFN1Y2NlZWRlZCcsIHBhdGgpO1xuXG4gICAgICAgIHNlc3Npb24ubWFya0NsZWFuKCk7XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgc2Vzc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gICRzY29wZS5zYXZlU2Vzc2lvbiA9IGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgICBzYXZlU2Vzc2lvbihzZXNzaW9uKTtcbiAgfTtcbiAgJHNjb3BlLnNhdmVBbGxTZXNzaW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZXNzaW9ucyA9IHNlc3Npb25TZXJ2aWNlLmRpcnR5O1xuXG4gICAgc2Vzc2lvbnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBzYXZlU2Vzc2lvbihpdGVtKTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUucmVtb3ZlUmVjZW50RmlsZSA9IGZ1bmN0aW9uKGVudHJ5KSB7XG5cbiAgICAvLyBmaW5kIHJlbGF0ZWQgc2Vzc2lvblxuICAgIHZhciBzZXNzaW9ucyA9IG1vZGVsLnNlc3Npb25zO1xuICAgIHZhciBzZXNzaW9uID0gc2Vzc2lvbnMuZmluZFNlc3Npb24oZW50cnkucGF0aCk7XG4gICAgaWYgKHNlc3Npb24pIHtcblxuICAgICAgaWYgKHNlc3Npb24uaXNEaXJ0eSkge1xuXG4gICAgICAgIGRpYWxvZy5jb25maXJtKHtcbiAgICAgICAgICB0aXRsZTogJ1NhdmUgRmlsZScsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgaGFzIGNoYW5nZWQuIFdvdWxkIHlvdSBsaWtlIHRvIFNhdmUgWycgKyBtb2RlbC5nZXRSZWxhdGl2ZVBhdGgoc2Vzc2lvbi5wYXRoKSArICddJyxcbiAgICAgICAgICBva0J1dHRvblRleHQ6ICdZZXMnLFxuICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6ICdObydcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICBzYXZlU2Vzc2lvbihzZXNzaW9uLCBmdW5jdGlvbihlcnIsIHNlc3Npb24pIHtcbiAgICAgICAgICAgIGlmICghZXJyKSB7XG4gICAgICAgICAgICAgIG1vZGVsLnJlbW92ZVJlY2VudEZpbGUoZW50cnkpO1xuICAgICAgICAgICAgICBzZXNzaW9ucy5yZW1vdmVTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncmVjZW50LXJlbW92ZWQnLCBlbnRyeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1JlbW92ZSByZWNlbnQgKHNhdmUpIG1vZGFsIGRpc21pc3NlZCcsIHZhbHVlKTtcbiAgICAgICAgICAvLyBDaGVjayBpZiBjbGlja2VkICdObycsIG90aGVyd2lzZSBkbyBub3RoaW5nXG4gICAgICAgICAgaWYgKHZhbHVlID09PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgbW9kZWwucmVtb3ZlUmVjZW50RmlsZShlbnRyeSk7XG4gICAgICAgICAgICBzZXNzaW9ucy5yZW1vdmVTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3JlY2VudC1yZW1vdmVkJywgZW50cnkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzZXNzaW9ucy5yZW1vdmVTZXNzaW9uKHNlc3Npb24pO1xuXG4gICAgfVxuXG4gICAgbW9kZWwucmVtb3ZlUmVjZW50RmlsZShlbnRyeSk7XG4gICAgJHNjb3BlLiRicm9hZGNhc3QoJ3JlY2VudC1yZW1vdmVkJywgZW50cnkpO1xuXG4gIH07XG5cblxuICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoc2Vzc2lvblNlcnZpY2UuZGlydHkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJ1lvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGxlYXZlLic7XG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5lbmNvZGVQYXRoID0gdXRpbHMuZW5jb2RlU3RyaW5nO1xuICAkc2NvcGUuZGVjb2RlUGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZztcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoJHRpbWVvdXQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgJHNjb3BlLiR3YXRjaChhdHRycy5uZ1Njcm9sbGVkSW50b1ZpZXcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdmFyIGVsID0gJGVsZW1lbnRbMF07XG4gICAgICAgIFxuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgYWN0aXZlID0gZWwucXVlcnlTZWxlY3RvcignLmFjdGl2ZScpO1xuICAgICAgICAgIHZhciBjZW50ZXJPZkFjdGl2ZUVsID0gYWN0aXZlLm9mZnNldExlZnQgKyAoYWN0aXZlLm9mZnNldFdpZHRoIC8gMik7XG4gICAgICAgICAgdmFyIGxlZnRCb3VuZGFyeSA9IGVsLnNjcm9sbExlZnQ7XG4gICAgICAgICAgdmFyIHJpZ2h0Qm91bmRhcnkgPSBsZWZ0Qm91bmRhcnkgKyBlbC5vZmZzZXRXaWR0aDtcblxuICAgICAgICAgIGlmIChjZW50ZXJPZkFjdGl2ZUVsIDwgbGVmdEJvdW5kYXJ5IHx8IGNlbnRlck9mQWN0aXZlRWwgPiByaWdodEJvdW5kYXJ5KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gYWN0aXZlLm9mZnNldExlZnQgLSAoZWwub2Zmc2V0V2lkdGggLyAyKSArIChhY3RpdmUub2Zmc2V0V2lkdGggLyAyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgIH0sIDEwMCk7XG4gICAgICAgIFxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHBhcnNlKSB7XG4gIHJldHVybiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCBhdHRycykge1xuICAgIHZhciBmbiA9ICRwYXJzZShhdHRycy5uZ1Njcm9sbGVkTGVmdCk7XG4gICAgdmFyIGVsID0gJGVsZW1lbnRbMF07XG5cbiAgICAkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgZWwuc2Nyb2xsTGVmdCA9IGVsLnNjcm9sbFdpZHRoO1xuICAgIH0pO1xuXG4gIH07XG59O1xuIiwiLy8gdmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi9maWxlLXN5c3RlbScpO1xuLy8gdmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG4vLyB2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxuLy8gTG9hZCBNb2R1bGUgRGVwZW5kZW5jaWVzXG5yZXF1aXJlKCcuLi9kaWFsb2cnKTtcbnJlcXVpcmUoJy4uL2ZzJyk7XG5cbnZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xubW9kLnZhbHVlKCckYW5jaG9yU2Nyb2xsJywgYW5ndWxhci5ub29wKTtcbm1vZC5zZXJ2aWNlKCdGaWxlU2VydmljZScsIFtcbiAgJyRxJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9maWxlJylcbl0pO1xuXG5tb2Quc2VydmljZSgnUmVzcG9uc2VIYW5kbGVyJywgW1xuICAnRGlhbG9nU2VydmljZScsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlcicpXG5dKTtcblxubW9kLnNlcnZpY2UoJ0NvbG9yU2VydmljZScsIFtcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9jb2xvcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0FwcEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgJ2ZzUHJvbWlzZScsXG4gICdmc1dhdGNoZXJQcm9taXNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnQ29sb3JTZXJ2aWNlJyxcbiAgJ1Nlc3Npb25TZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxuLy8gQUNFIEdsb2JhbCBEZWZhdWx0c1xubW9kLnJ1bihbJ3VpQWNlQ29uZmlnJyxcbiAgZnVuY3Rpb24odWlBY2VDb25maWcpIHtcbiAgICB1aUFjZUNvbmZpZy5hY2UgPSB7fTtcbiAgICBhbmd1bGFyLmV4dGVuZCh1aUFjZUNvbmZpZy5hY2UsIHtcbiAgICAgIHVzZVNvZnRUYWJzOiB0cnVlLFxuICAgICAgdGFiU2l6ZTogMixcbiAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICBzaG93R3V0dGVyOiB0cnVlLFxuICAgICAgLy8gc2V0QXV0b1Njcm9sbEVkaXRvckludG9WaWV3OiB0cnVlLFxuICAgICAgLy8gbWF4TGluZXM6IDYwMCxcbiAgICAgIC8vIG1pbkxpbmVzOiAxNSxcbiAgICAgIG1vZGU6ICdqYXZhc2NyaXB0JyxcbiAgICAgIHJlcXVpcmU6IFsnYWNlL2V4dC9sYW5ndWFnZV90b29scyddLFxuICAgICAgYWR2YW5jZWQ6IHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUJhc2ljQXV0b2NvbXBsZXRpb246IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5dKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gICckbG9jYXRpb25Qcm92aWRlcicsXG4gICckdXJsUm91dGVyUHJvdmlkZXInLFxuICByZXF1aXJlKCcuL2NvbmZpZycpXG5dKTtcblxubW9kLmNvbmZpZyggWyckY29tcGlsZVByb3ZpZGVyJywgZnVuY3Rpb24oJGNvbXBpbGVQcm92aWRlcil7XG4gICRjb21waWxlUHJvdmlkZXIuaW1nU3JjU2FuaXRpemF0aW9uV2hpdGVsaXN0KC9eXFxzKigoaHR0cHM/fGZ0cHxmaWxlfGJsb2IpOnxkYXRhOmltYWdlXFwvKS8pO1xufV0pO1xuXG5tb2QuZGlyZWN0aXZlKCduZ1Njcm9sbGVkJywgW1xuICAnJHBhcnNlJyxcbiAgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3Njcm9sbGVkJylcbl0pO1xuXG5tb2QuZGlyZWN0aXZlKCduZ1Njcm9sbGVkSW50b1ZpZXcnLCBbXG4gICckdGltZW91dCcsXG4gIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9zY3JvbGxlZC1pbnRvLXZpZXcnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBjb29raWUgPSByZXF1aXJlKCdjb29raWUnKTtcblxuZnVuY3Rpb24gQXBwTW9kZWwoZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5mcyA9IGRhdGEuZnM7XG4gIHRoaXMud2F0Y2hlciA9IGRhdGEud2F0Y2hlcjtcbiAgdGhpcy5zZXNzaW9ucyA9IGRhdGEuc2Vzc2lvblNlcnZpY2U7XG5cbiAgdGhpcy50aXRsZSA9ICdUaXRsZSc7XG4gIHRoaXMuc3ViVGl0bGUgPSAnU3VidGl0bGUnO1xuXG4gIHRoaXMuX3JlY2VudEZpbGVzID0gZGF0YS5yZWNlbnRGaWxlcyB8fCBbXTtcbn1cbkFwcE1vZGVsLnByb3RvdHlwZS5hZGRSZWNlbnRGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgcmVjZW50ID0gdGhpcy5fcmVjZW50RmlsZXM7XG4gIHZhciBpZHggPSByZWNlbnQuZmluZEluZGV4KGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBmaWxlLnBhdGg7XG4gIH0pO1xuICBpZiAoaWR4ICE9PSAtMSkge1xuICAgIHJlY2VudC5tb3ZlKGlkeCwgMCk7XG4gIH0gZWxzZSB7XG4gICAgcmVjZW50LnVuc2hpZnQoe1xuICAgICAgcGF0aDogZmlsZS5wYXRoLFxuICAgICAgdGltZTogRGF0ZS5ub3coKVxuICAgIH0pO1xuICAgIHJlY2VudC5sZW5ndGggPSBNYXRoLm1pbih0aGlzLl9yZWNlbnRGaWxlcy5sZW5ndGgsIDIwKTtcbiAgfVxuXG4gIHRoaXMuc3RvcmVSZWNlbnRGaWxlcygpO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5yZW1vdmVSZWNlbnRGaWxlID0gZnVuY3Rpb24oZW50cnkpIHtcbiAgdmFyIHJlY2VudCA9IHRoaXMuX3JlY2VudEZpbGVzO1xuICB2YXIgaWR4ID0gcmVjZW50LmluZGV4T2YoZW50cnkpO1xuXG4gIGlmIChpZHggIT09IC0xKSB7XG4gICAgcmVjZW50LnNwbGljZShpZHgsIDEpO1xuICAgIHRoaXMuc3RvcmVSZWNlbnRGaWxlcygpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5BcHBNb2RlbC5wcm90b3R5cGUuc3RvcmVSZWNlbnRGaWxlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY29va2llRXhwaXJlcyA9IG5ldyBEYXRlKCk7XG4gIGNvb2tpZUV4cGlyZXMuc2V0RnVsbFllYXIoY29va2llRXhwaXJlcy5nZXRGdWxsWWVhcigpICsgMSk7XG5cbiAgZG9jdW1lbnQuY29va2llID0gY29va2llLnNlcmlhbGl6ZSgncmVjZW50RmlsZXMnLCBhbmd1bGFyLnRvSnNvbih0aGlzLnJlY2VudEZpbGVzKSwge1xuICAgIGV4cGlyZXM6IGNvb2tpZUV4cGlyZXNcbiAgfSk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmNvdW50RmlsZXMgPSBmdW5jdGlvbihleHQpIHtcbiAgcmV0dXJuIHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAhaXRlbS5pc0RpcmVjdG9yeSAmJiBpdGVtLmV4dCA9PT0gZXh0O1xuICB9KS5sZW5ndGg7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmNsZWFyUmVjZW50RmlsZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fcmVjZW50RmlsZXMubGVuZ3RoID0gMDtcbiAgdGhpcy5zdG9yZVJlY2VudEZpbGVzKCk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmdldFJlbGF0aXZlUGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHAucmVsYXRpdmUodGhpcy50cmVlLmRpciwgcGF0aCk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLl9yZWFkRGVwZW5kZW5jaWVzID0gZnVuY3Rpb24oZGV2KSB7XG4gIHZhciBkZXBzID0gW107XG4gIHZhciBwYWNrYWdlSlNPTiA9IHRoaXMuX3BhY2thZ2VKU09OO1xuICBpZiAocGFja2FnZUpTT04pIHtcbiAgICB2YXIgZGVwS2V5ID0gcGFja2FnZUpTT05bZGV2ID8gJ2RldkRlcGVuZGVuY2llcycgOiAnZGVwZW5kZW5jaWVzJ107XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkZXBLZXkpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWUgPSBrZXlzW2ldO1xuICAgICAgdmFyIHZlcnNpb24gPSBkZXBLZXlbbmFtZV07XG4gICAgICBkZXBzLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlcHM7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQXBwTW9kZWwucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy53YXRjaGVyLm1hcDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5saXN0O1xuICAgIH1cbiAgfSxcbiAgdHJlZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy53YXRjaGVyLnRyZWVbMF0uY2hpbGRyZW5bMF07XG4gICAgfVxuICB9LFxuICByZWNlbnRGaWxlczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVjZW50ID0gdGhpcy5fcmVjZW50RmlsZXM7XG5cbiAgICAgIC8vIGNsZWFuIGFueSBmaWxlcyB0aGF0IG1heSBubyBsb25nZXIgZXhpc3RcbiAgICAgIHZhciBpID0gcmVjZW50Lmxlbmd0aDtcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgaWYgKCF0aGlzLm1hcFtyZWNlbnRbaV0ucGF0aF0pIHtcbiAgICAgICAgICByZWNlbnQuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVjZW50O1xuICAgIH1cbiAgfSxcbiAganNDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuanMnKTtcbiAgICB9XG4gIH0sXG4gIGNzc0NvdW50OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvdW50RmlsZXMoJy5jc3MnKTtcbiAgICB9XG4gIH0sXG4gIGh0bWxDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuaHRtbCcpO1xuICAgIH1cbiAgfSxcbiAgdG90YWxDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0Lmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIHBhY2thZ2U6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhY2thZ2U7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9wYWNrYWdlID0gdmFsdWU7XG4gICAgICB0aGlzLl9wYWNrYWdlSlNPTiA9IEpTT04ucGFyc2UodmFsdWUuY29udGVudHMpO1xuICAgICAgdGhpcy5fZGVwZW5kZW5jaWVzID0gdGhpcy5fcmVhZERlcGVuZGVuY2llcygpO1xuICAgICAgdGhpcy5fZGV2RGVwZW5kZW5jaWVzID0gdGhpcy5fcmVhZERlcGVuZGVuY2llcyh0cnVlKTtcbiAgICB9XG4gIH0sXG4gIHBhY2thZ2VGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRyZWUuY2hpbGRyZW4uZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3BhY2thZ2UuanNvbic7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIGhhc1BhY2thZ2VGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMucGFja2FnZUZpbGU7XG4gICAgfVxuICB9LFxuICBkZXBlbmRlbmNpZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RlcGVuZGVuY2llcztcbiAgICB9XG4gIH0sXG4gIGRldkRlcGVuZGVuY2llczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGV2RGVwZW5kZW5jaWVzO1xuICAgIH1cbiAgfSxcbiAgcmVhZG1lOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWFkbWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9yZWFkbWUgPSB2YWx1ZTtcbiAgICB9XG4gIH0sXG4gIHJlYWRtZUZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudHJlZS5jaGlsZHJlbi5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIC9ecmVhZG1lLihtZHxtYXJrZG93bikkLy50ZXN0KGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgaGFzUmVhZG1lRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLnJlYWRtZUZpbGU7XG4gICAgfVxuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBNb2RlbDtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcbiAgJ3VpLnJvdXRlcicsXG4gICd1aS5ib290c3RyYXAnLFxuICAndWkuYWNlJyxcbiAgJ2V2Z2VueW5ldS5tYXJrZG93bi1wcmV2aWV3JyxcbiAgJ21pY2hpS29ubycsXG4gICdkaWFsb2cnLFxuICAnZnMnXG5dKTtcbiIsIi8qKlxuICogY29sb3JUYWcgdiAwLjFcbiAqIGJ5IFJ5YW4gUXVpbm5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXpvbmRvL2NvbG9yVGFnXG4gKlxuICogY29sb3JUYWcgaXMgdXNlZCB0byBnZW5lcmF0ZSBhIHJhbmRvbSBjb2xvciBmcm9tIGEgZ2l2ZW4gc3RyaW5nXG4gKiBUaGUgZ29hbCBpcyB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYywgdXNhYmxlIGNvbG9ycyBmb3IgdGhlIHB1cnBvc2VcbiAqIG9mIGFkZGluZyBjb2xvciBjb2RpbmcgdG8gdGFnc1xuKi9cblxuZnVuY3Rpb24gY29sb3JUYWcodGFnU3RyaW5nKSB7XG5cdC8vIHdlcmUgd2UgZ2l2ZW4gYSBzdHJpbmcgdG8gd29yayB3aXRoPyAgSWYgbm90LCB0aGVuIGp1c3QgcmV0dXJuIGZhbHNlXG5cdGlmICghdGFnU3RyaW5nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJldHVybiBzdGhlIGx1bWlub3NpdHkgZGlmZmVyZW5jZSBiZXR3ZWVuIDIgcmdiIHZhbHVlc1xuXHQgKiBhbnl0aGluZyBncmVhdGVyIHRoYW4gNSBpcyBjb25zaWRlcmVkIHJlYWRhYmxlXG5cdCAqL1xuXHRmdW5jdGlvbiBsdW1pbm9zaXR5RGlmZihyZ2IxLCByZ2IyKSB7XG4gIFx0XHR2YXIgbDEgPSAwLjIxMjYgKyBNYXRoLnBvdyhyZ2IxLnIvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC43MTUyICogTWF0aC5wb3cocmdiMS5nLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuMDcyMiAqIE1hdGgucG93KHJnYjEuYi8yNTUsIDIuMiksXG4gIFx0XHRcdGwyID0gMC4yMTI2ICsgTWF0aC5wb3cocmdiMi5yLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuNzE1MiAqIE1hdGgucG93KHJnYjIuZy8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjA3MjIgKiBNYXRoLnBvdyhyZ2IyLmIvMjU1LCAyLjIpO1xuXG4gIFx0XHRpZiAobDEgPiBsMikge1xuICBcdFx0XHRyZXR1cm4gKGwxICsgMC4wNSkgLyAobDIgKyAwLjA1KTtcbiAgXHRcdH0gZWxzZSB7XG4gIFx0XHRcdHJldHVybiAobDIgKyAwLjA1KSAvIChsMSArIDAuMDUpO1xuICBcdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIFRoaXMgaXMgdGhlIGRlZmluaXRpb24gb2YgYSBjb2xvciBmb3Igb3VyIHB1cnBvc2VzLiAgV2UndmUgYWJzdHJhY3RlZCBpdCBvdXRcblx0ICogc28gdGhhdCB3ZSBjYW4gcmV0dXJuIG5ldyBjb2xvciBvYmplY3RzIHdoZW4gcmVxdWlyZWRcblx0Ki9cblx0ZnVuY3Rpb24gY29sb3IoaGV4Q29kZSkge1xuXHRcdC8vd2VyZSB3ZSBnaXZlbiBhIGhhc2h0YWc/ICByZW1vdmUgaXQuXG5cdFx0dmFyIGhleENvZGUgPSBoZXhDb2RlLnJlcGxhY2UoXCIjXCIsIFwiXCIpO1xuXHRcdHJldHVybiB7XG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgYSBzaW1wbGUgaGV4IHN0cmluZyBpbmNsdWRpbmcgaGFzaHRhZ1xuXHRcdFx0ICogb2YgdGhlIGNvbG9yXG5cdFx0XHQgKi9cblx0XHRcdGhleDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBoZXhDb2RlO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIGFuIFJHQiBicmVha2Rvd24gb2YgdGhlIGNvbG9yIHByb3ZpZGVkXG5cdFx0XHQgKi9cblx0XHRcdHJnYjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBiaWdpbnQgPSBwYXJzZUludChoZXhDb2RlLCAxNik7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0cjogKGJpZ2ludCA+PiAxNikgJiAyNTUsXG5cdFx0XHRcdFx0ZzogKGJpZ2ludCA+PiA4KSAmIDI1NSxcblx0XHRcdFx0XHRiOiBiaWdpbnQgJiAyNTVcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHaXZlbiBhIGxpc3Qgb2YgaGV4IGNvbG9yIGNvZGVzXG5cdFx0XHQgKiBEZXRlcm1pbmUgd2hpY2ggaXMgdGhlIG1vc3QgcmVhZGFibGVcblx0XHRcdCAqIFdlIHVzZSB0aGUgbHVtaW5vc2l0eSBlcXVhdGlvbiBwcmVzZW50ZWQgaGVyZTpcblx0XHRcdCAqIGh0dHA6Ly93d3cuc3BsaXRicmFpbi5vcmcvYmxvZy8yMDA4LTA5LzE4LWNhbGN1bGF0aW5nX2NvbG9yX2NvbnRyYXN0X3dpdGhfcGhwXG5cdFx0XHQgKi9cblx0XHRcdHJlYWRhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gdGhpcyBpcyBtZWFudCB0byBiZSBzaW1wbGlzdGljLCBpZiB5b3UgZG9uJ3QgZ2l2ZSBtZSBtb3JlIHRoYW5cblx0XHRcdFx0Ly8gb25lIGNvbG9yIHRvIHdvcmsgd2l0aCwgeW91J3JlIGdldHRpbmcgd2hpdGUgb3IgYmxhY2suXG5cdFx0XHRcdHZhciBjb21wYXJhdG9ycyA9IChhcmd1bWVudHMubGVuZ3RoID4gMSkgPyBhcmd1bWVudHMgOiBbXCIjRTFFMUUxXCIsIFwiIzQ2NDY0NlwiXSxcblx0XHRcdFx0XHRvcmlnaW5hbFJHQiA9IHRoaXMucmdiKCksXG5cdFx0XHRcdFx0YnJpZ2h0ZXN0ID0geyBkaWZmZXJlbmNlOiAwIH07XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXJhdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdC8vY2FsY3VsYXRlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIG9yaWdpbmFsIGNvbG9yIGFuZCB0aGUgb25lIHdlIHdlcmUgZ2l2ZW5cblx0XHRcdFx0XHR2YXIgYyA9IGNvbG9yKGNvbXBhcmF0b3JzW2ldKSxcblx0XHRcdFx0XHRcdGwgPSBsdW1pbm9zaXR5RGlmZihvcmlnaW5hbFJHQiwgYy5yZ2IoKSk7XG5cblx0XHRcdFx0XHQvLyBpZiBpdCdzIGJyaWdodGVyIHRoYW4gdGhlIGN1cnJlbnQgYnJpZ2h0ZXN0LCBzdG9yZSBpdCB0byBjb21wYXJlIGFnYWluc3QgbGF0ZXIgb25lc1xuXHRcdFx0XHRcdGlmIChsID4gYnJpZ2h0ZXN0LmRpZmZlcmVuY2UpIHtcblx0XHRcdFx0XHRcdGJyaWdodGVzdCA9IHtcblx0XHRcdFx0XHRcdFx0ZGlmZmVyZW5jZTogbCxcblx0XHRcdFx0XHRcdFx0Y29sb3I6IGNcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyByZXR1cm4gdGhlIGJyaWdoZXN0IGNvbG9yXG5cdFx0XHRcdHJldHVybiBicmlnaHRlc3QuY29sb3I7XG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cblxuXHQvLyBjcmVhdGUgdGhlIGhleCBmb3IgdGhlIHJhbmRvbSBzdHJpbmdcbiAgICB2YXIgaGFzaCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWdTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaGFzaCA9IHRhZ1N0cmluZy5jaGFyQ29kZUF0KGkpICsgKChoYXNoIDw8IDUpIC0gaGFzaCk7XG4gICAgfVxuICAgIGhleCA9IFwiXCJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSAoaGFzaCA+PiAoaSAqIDgpKSAmIDB4RkY7XG4gICAgICAgIGhleCArPSAoJzAwJyArIHZhbHVlLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC0yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3IoaGV4KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gY29sb3JUYWc7XG59O1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRxKSB7XG4gIHJldHVybiB7XG4gICAgcmVhZEZpbGU6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgIGZpbGVzeXN0ZW0ucmVhZEZpbGUoZmlsZSwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgIGlmIChyZXMuZXJyKSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJlcy5lcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfVxuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGlhbG9nKSB7XG4gIHJldHVybiB7XG4gICAgcmVzcG9uc2VIYW5kbGVyOiBmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHJzcCwgc2hvd0Vycm9yKSB7XG4gICAgICAgIHNob3dFcnJvciA9IHNob3dFcnJvciB8fCB0cnVlO1xuICAgICAgICBpZiAocnNwLmVycikge1xuICAgICAgICAgIGlmIChzaG93RXJyb3IpIHtcbiAgICAgICAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyc3AuZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZuKHJzcC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH07XG59O1xuIiwiQXJyYXkucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbihvbGRJbmRleCwgbmV3SW5kZXgpIHtcblxuICBpZiAoaXNOYU4obmV3SW5kZXgpIHx8IGlzTmFOKG9sZEluZGV4KSB8fCBvbGRJbmRleCA8IDAgfHwgb2xkSW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAobmV3SW5kZXggPCAwKSB7XG4gICAgbmV3SW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSBpZiAobmV3SW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICBuZXdJbmRleCA9IDA7XG4gIH1cblxuICB0aGlzLnNwbGljZShuZXdJbmRleCwgMCwgdGhpcy5zcGxpY2Uob2xkSW5kZXgsIDEpWzBdKTtcblxuICByZXR1cm4gbmV3SW5kZXg7XG59O1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gIEFycmF5LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgaWYgKHRoaXMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LnByb3RvdHlwZS5maW5kIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH07XG59XG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCkge1xuICBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4ID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwiZWRpdG9yXCI6IHtcbiAgICBcInRoZW1lXCI6IFwibW9ub2thaVwiLFxuICAgIFwidGFiU2l6ZVwiOiAyLFxuICAgIFwidXNlU29mdFRhYnNcIjogdHJ1ZSxcbiAgICBcImhpZ2hsaWdodEFjdGl2ZUxpbmVcIjogdHJ1ZSxcbiAgICBcInNob3dQcmludE1hcmdpblwiOiBmYWxzZSxcbiAgICBcInNob3dHdXR0ZXJcIjogdHJ1ZSxcbiAgICBcImZvbnRTaXplXCI6IFwiMTJweFwiLFxuICAgIFwidXNlV29ya2VyXCI6IHRydWUsXG4gICAgXCJzaG93SW52aXNpYmxlc1wiOiB0cnVlLFxuICAgIFwibW9kZXNcIjoge1xuICAgICAgXCIuanNcIjogXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIsXG4gICAgICBcIi5jc3NcIjogXCJhY2UvbW9kZS9jc3NcIixcbiAgICAgIFwiLmh0bWxcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gICAgICBcIi5odG1cIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gICAgICBcIi5lanNcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gICAgICBcIi5qc29uXCI6IFwiYWNlL21vZGUvanNvblwiLFxuICAgICAgXCIubWRcIjogXCJhY2UvbW9kZS9tYXJrZG93blwiLFxuICAgICAgXCIuY29mZmVlXCI6IFwiYWNlL21vZGUvY29mZmVlXCIsXG4gICAgICBcIi5qYWRlXCI6IFwiYWNlL21vZGUvamFkZVwiLFxuICAgICAgXCIucGhwXCI6IFwiYWNlL21vZGUvcGhwXCIsXG4gICAgICBcIi5weVwiOiBcImFjZS9tb2RlL3B5dGhvblwiLFxuICAgICAgXCIuc2Nzc1wiOiBcImFjZS9tb2RlL3Nhc3NcIixcbiAgICAgIFwiLnR4dFwiOiBcImFjZS9tb2RlL3RleHRcIixcbiAgICAgIFwiLnR5cGVzY3JpcHRcIjogXCJhY2UvbW9kZS90eXBlc2NyaXB0XCIsXG4gICAgICBcIi54bWxcIjogXCJhY2UvbW9kZS94bWxcIlxuICAgIH1cbiAgfSxcbiAgXCJiZWF1dGlmeVwiOiB7XG4gICAgXCJqc1wiOiB7XG4gICAgICBcImluZGVudF9zaXplXCI6IDIsXG4gICAgICBcImluZGVudF9jaGFyXCI6IFwiIFwiLFxuICAgICAgXCJpbmRlbnRfbGV2ZWxcIjogMCxcbiAgICAgIFwiaW5kZW50X3dpdGhfdGFic1wiOiBmYWxzZSxcbiAgICAgIFwicHJlc2VydmVfbmV3bGluZXNcIjogdHJ1ZSxcbiAgICAgIFwibWF4X3ByZXNlcnZlX25ld2xpbmVzXCI6IDMsXG4gICAgICBcImpzbGludF9oYXBweVwiOiBmYWxzZSxcbiAgICAgIFwiYnJhY2Vfc3R5bGVcIjogXCJjb2xsYXBzZVwiLFxuICAgICAgXCJrZWVwX2FycmF5X2luZGVudGF0aW9uXCI6IGZhbHNlLFxuICAgICAgXCJrZWVwX2Z1bmN0aW9uX2luZGVudGF0aW9uXCI6IGZhbHNlLFxuICAgICAgXCJzcGFjZV9iZWZvcmVfY29uZGl0aW9uYWxcIjogdHJ1ZSxcbiAgICAgIFwiYnJlYWtfY2hhaW5lZF9tZXRob2RzXCI6IGZhbHNlLFxuICAgICAgXCJldmFsX2NvZGVcIjogZmFsc2UsXG4gICAgICBcInVuZXNjYXBlX3N0cmluZ3NcIjogZmFsc2UsXG4gICAgICBcIndyYXBfbGluZV9sZW5ndGhcIjogMFxuICAgIH0sXG4gICAgXCJjc3NcIjoge1xuICAgICAgXCJpbmRlbnRfc2l6ZVwiOiAyLFxuICAgICAgXCJpbmRlbnRfY2hhclwiOiBcIiBcIlxuICAgIH0sXG4gICAgXCJodG1sXCI6IHtcbiAgICAgIFwiaW5kZW50X3NpemVcIjogMixcbiAgICAgIFwiaW5kZW50X2NoYXJcIjogXCIgXCIsXG4gICAgICBcImJyYWNlX3N0eWxlXCI6IFwiY29sbGFwc2VcIixcbiAgICAgIFwiaW5kZW50X3NjcmlwdHMgXCI6IFwibm9ybWFsXCJcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcbiAgJHNjb3BlLm9rQnV0dG9uVGV4dCA9IGRhdGEub2tCdXR0b25UZXh0IHx8ICdPSyc7XG4gICRzY29wZS5jYW5jZWxCdXR0b25UZXh0ID0gZGF0YS5jYW5jZWxCdXR0b25UZXh0IHx8ICdDYW5jZWwnO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBhbGVydDogcmVxdWlyZSgnLi9hbGVydCcpLFxuICBjb25maXJtOiByZXF1aXJlKCcuL2NvbmZpcm0nKSxcbiAgcHJvbXB0OiByZXF1aXJlKCcuL3Byb21wdCcpXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAkc2NvcGUucGxhY2Vob2xkZXIgPSBkYXRhLnBsYWNlaG9sZGVyO1xuICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gIH07XG5cbiAgJHNjb3BlLm9rID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgfTtcblxuICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gIH07XG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG52YXIgY29udHJvbGxlcnMgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJyk7XG5cbm1vZC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLmFsZXJ0XG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5jb25maXJtXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ1Byb21wdEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLnByb21wdFxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdEaWFsb2dTZXJ2aWNlJywgW1xuICAnJG1vZGFsJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZGlhbG9nJywgW1xuICAndWkuYm9vdHN0cmFwJ1xuXSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRtb2RhbCkge1xuXG4gIHZhciBzZXJ2aWNlID0ge307XG5cbiAgc2VydmljZS5hbGVydCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL2FsZXJ0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FsZXJ0Q3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLmNvbmZpcm0gPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9jb25maXJtLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpcm1DdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBkYXRhLm9rQnV0dG9uVGV4dCxcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IGRhdGEuY2FuY2VsQnV0dG9uVGV4dFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLnByb21wdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL3Byb21wdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdQcm9tcHRDdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHJldHVybiBzZXJ2aWNlO1xuXG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTtcblxuLypcbiAqIEZpbGVTeXN0ZW1XYXRjaGVyIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW1XYXRjaGVyKCkge1xuXG4gIHRoaXMuX3dhdGNoZWQgPSB7fTtcblxuICB0aGlzLl9saXN0ID0gbnVsbDtcbiAgdGhpcy5fdHJlZSA9IG51bGw7XG5cbiAgdmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mc3dhdGNoJyk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuXG4gICAgT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdGhpcy5fd2F0Y2hlZFtrZXldID0gbmV3IEZpbGVTeXN0ZW1PYmplY3Qoa2V5LCBkYXRhW2tleV0uaXNEaXJlY3RvcnkpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy91dGlscy5leHRlbmQodGhpcy5fd2F0Y2hlZCwgZGF0YSk7XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBjb25uZWN0aW9uJyk7XG5cbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCB0aGlzLl93YXRjaGVkKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGQnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdID0gZnNvO1xuXG4gICAgY29uc29sZS5sb2coJ1dhdGNoZXIgYWRkJywgZnNvKTtcblxuICAgIHRoaXMuZW1pdCgnYWRkJywgZnNvKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGREaXInLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgdHJ1ZSk7XG5cbiAgICB0aGlzLl93YXRjaGVkW2Zzby5wYXRoXSA9IGZzbztcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGFkZERpcicsIGZzbyk7XG5cbiAgICB0aGlzLmVtaXQoJ2FkZERpcicsIGZzbyk7XG4gICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY2hhbmdlJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICAvLyBjaGVjayB3ZSBnb3Qgc29tZXRoaW5nXG4gICAgaWYgKGZzbykge1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBjaGFuZ2UnLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ21vZGlmaWVkJywgZnNvKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGluaycsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgICAgY29uc29sZS5sb2coJ1dhdGNoZXIgdW5saW5rJywgZnNvKTtcblxuICAgICAgdGhpcy5lbWl0KCd1bmxpbmsnLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGlua0RpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgICAgY29uc29sZS5sb2coJ1dhdGNoZXIgdW5saW5rRGlyJywgZnNvKTtcblxuICAgICAgdGhpcy5lbWl0KCd1bmxpbmtEaXInLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2Vycm9yJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBlcnJvcicsIHJlcy5lcnIpO1xuXG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIHJlcy5lcnIpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG4gIHRoaXMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpc3QgPSBudWxsO1xuICAgIHRoaXMuX3RyZWUgPSBudWxsO1xuICB9KTtcblxufVxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLl9saXN0KSB7XG4gICAgICAgIHRoaXMuX2xpc3QgPSBbXTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl93YXRjaGVkKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5fbGlzdC5wdXNoKHRoaXMuX3dhdGNoZWRba2V5c1tpXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fbGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBmdW5jdGlvbiB0cmVlaWZ5KGxpc3QsIGlkQXR0ciwgcGFyZW50QXR0ciwgY2hpbGRyZW5BdHRyKSB7XG5cbiAgICAgICAgdmFyIHRyZWVMaXN0ID0gW107XG4gICAgICAgIHZhciBsb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIHBhdGgsIG9iajtcblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuXG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICBvYmoubGFiZWwgPSBvYmoubmFtZTtcbiAgICAgICAgICBsb29rdXBbb2JqW2lkQXR0cl1dID0gb2JqO1xuICAgICAgICAgIG9ialtjaGlsZHJlbkF0dHJdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuICAgICAgICAgIG9iaiA9IGxpc3RbcGF0aF07XG4gICAgICAgICAgdmFyIHBhcmVudCA9IGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dO1xuICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgIG9iai5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICBsb29rdXBbb2JqW3BhcmVudEF0dHJdXVtjaGlsZHJlbkF0dHJdLnB1c2gob2JqKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJlZUxpc3QucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmVlTGlzdDtcblxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3RyZWUpIHtcbiAgICAgICAgdGhpcy5fdHJlZSA9IHRyZWVpZnkodGhpcy5fd2F0Y2hlZCwgJ3BhdGgnLCAnZGlyJywgJ2NoaWxkcmVuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgIH1cbiAgfVxufSk7XG5lbWl0dGVyKEZpbGVTeXN0ZW1XYXRjaGVyLnByb3RvdHlwZSk7XG5cbnZhciBGaWxlU3lzdGVtV2F0Y2hlciA9IG5ldyBGaWxlU3lzdGVtV2F0Y2hlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTeXN0ZW1XYXRjaGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItY29tcG9uZW50Jyk7O1xuXG4vKlxuICogRmlsZVN5c3RlbSBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGaWxlU3lzdGVtKHNvY2tldCkge1xuXG4gIHNvY2tldC5vbignbWtkaXInLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtkaXInLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdta2ZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY29weScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdjb3B5JywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVuYW1lJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbmFtZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZW1vdmUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZWFkZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZWFkZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3dyaXRlZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCd3cml0ZWZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG59XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2RpciA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2RpcicsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2ZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnbWtmaWxlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbihzb3VyY2UsIGRlc3RpbmF0aW9uLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnY29weScsIHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVuYW1lJywgb2xkUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW1vdmUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVhZGZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUud3JpdGVGaWxlID0gZnVuY3Rpb24ocGF0aCwgY29udGVudHMsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCd3cml0ZWZpbGUnLCBwYXRoLCBjb250ZW50cywgY2FsbGJhY2spO1xufTtcblxuZW1pdHRlcihGaWxlU3lzdGVtLnByb3RvdHlwZSk7XG5cblxudmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mcycpO1xuXG52YXIgZmlsZVN5c3RlbSA9IG5ldyBGaWxlU3lzdGVtKHNvY2tldCk7XG5cbmZpbGVTeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdmcyBjb25uZWN0ZWQnLCBkYXRhKTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZmlsZVN5c3RlbTsiLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIEVkaXRTZXNzaW9uID0gYWNlLnJlcXVpcmUoJ2FjZS9lZGl0X3Nlc3Npb24nKS5FZGl0U2Vzc2lvbjtcbnZhciBVbmRvTWFuYWdlciA9IGFjZS5yZXF1aXJlKCdhY2UvdW5kb21hbmFnZXInKS5VbmRvTWFuYWdlcjtcblxudmFyIG1vZGVzID0ge1xuICBcIi5qc1wiOiBcImFjZS9tb2RlL2phdmFzY3JpcHRcIixcbiAgXCIuY3NzXCI6IFwiYWNlL21vZGUvY3NzXCIsXG4gIFwiLnNjc3NcIjogXCJhY2UvbW9kZS9zY3NzXCIsXG4gIFwiLmxlc3NcIjogXCJhY2UvbW9kZS9sZXNzXCIsXG4gIFwiLmh0bWxcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gIFwiLmh0bVwiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgXCIuZWpzXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICBcIi5qc29uXCI6IFwiYWNlL21vZGUvanNvblwiLFxuICBcIi5tZFwiOiBcImFjZS9tb2RlL21hcmtkb3duXCIsXG4gIFwiLmNvZmZlZVwiOiBcImFjZS9tb2RlL2NvZmZlZVwiLFxuICBcIi5qYWRlXCI6IFwiYWNlL21vZGUvamFkZVwiLFxuICBcIi5waHBcIjogXCJhY2UvbW9kZS9waHBcIixcbiAgXCIucHlcIjogXCJhY2UvbW9kZS9weXRob25cIixcbiAgXCIuc2Fzc1wiOiBcImFjZS9tb2RlL3Nhc3NcIixcbiAgXCIudHh0XCI6IFwiYWNlL21vZGUvdGV4dFwiLFxuICBcIi50eXBlc2NyaXB0XCI6IFwiYWNlL21vZGUvdHlwZXNjcmlwdFwiLFxuICBcIi54bWxcIjogXCJhY2UvbW9kZS94bWxcIlxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FwcC5mcycsIHtcbiAgICAgIGFic3RyYWN0OiB0cnVlXG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICB1cmw6ICcvZmluZGVyJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAYXBwJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcHAnXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRmluZGVyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbmRlci5odG1sJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgIHVybDogJy9maWxlLzpwYXRoJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdGc0ZpbGVDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9maWxlLmh0bWwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBzZXNzaW9uOiBbJyRxJywgJyRzdGF0ZVBhcmFtcycsICdGaWxlU2VydmljZScsICdTZXNzaW9uU2VydmljZScsICd1aUFjZUNvbmZpZycsXG4gICAgICAgICAgZnVuY3Rpb24oJHEsICRzdGF0ZVBhcmFtcywgZmlsZVNlcnZpY2UsIHNlc3Npb25TZXJ2aWNlLCBhY2VDb25maWcpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXF1ZXN0ZWQgZmlsZSAnICsgcGF0aCk7XG5cbiAgICAgICAgICAgIHZhciBzZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuZmluZFNlc3Npb24ocGF0aCk7XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uKSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VzaW5nIGZvdW5kIHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2Vzc2lvbik7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlYWRpbmcgZmlsZSBmb3IgbmV3IHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHBhdGgpLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzVXRmOCA9ICEoZmlsZS5jb250ZW50cyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uRGF0YTtcbiAgICAgICAgICAgICAgICBpZiAoaXNVdGY4KSB7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YSA9IG5ldyBFZGl0U2Vzc2lvbihmaWxlLmNvbnRlbnRzLCBtb2Rlc1tmaWxlLmV4dF0pO1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuc2V0VGFiU2l6ZShhY2VDb25maWcuYWNlLnRhYlNpemUpO1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuc2V0VXNlU29mdFRhYnMoYWNlQ29uZmlnLmFjZS51c2VTb2Z0VGFicyk7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5zZXRVbmRvTWFuYWdlcihuZXcgVW5kb01hbmFnZXIoKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhID0gZmlsZS5jb250ZW50cztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuYWRkU2Vzc2lvbihwYXRoLCBzZXNzaW9uRGF0YSwgaXNVdGY4KTtcblxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2Vzc2lvbik7XG5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLnNlYXJjaCcsIHtcbiAgICAgIHVybDogJy9zZWFyY2g/cScsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGFwcCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBwJyxcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNTZWFyY2hDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3Mvc2VhcmNoLmh0bWwnXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmRpcicsIHtcbiAgICAgIHVybDogJy9kaXIvOnBhdGgnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRGlyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2Rpci5odG1sJyxcbiAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsIGRpciwgZmlsZVNlcnZpY2UpIHtcbiAgJHNjb3BlLmRpciA9IGRpcjtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBzZXNzaW9uLCBmaWxlU2VydmljZSkge1xuICB2YXIgaXNVdGY4ID0gc2Vzc2lvbi5pc1V0Zjg7XG5cbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmaWxlID0gbW9kZWwubWFwW3Nlc3Npb24ucGF0aF07XG5cbiAgLy8gZW5zdXJlIHRoZSBmaW5kZXIgaXMgc2V0IHRoZSB0aGUgcmlnaHQgZnNvXG4gICRzY29wZS5maW5kZXIuYWN0aXZlID0gZmlsZTtcblxuICAvLyBIYW5kbGUgdGhlIGNhc2Ugb2YgdGhlIGZpbGUgYmVpbmcgcmVtb3ZlZCBmcm9tIHJlY2VudEZpbGVzLlxuICAkc2NvcGUuJG9uKCdyZWNlbnQtcmVtb3ZlZCcsIGZ1bmN0aW9uKGUsIGRhdGEpIHtcbiAgICBpZiAoZGF0YS5wYXRoID09PSBmaWxlLnBhdGgpIHsgLy8gdGhpcyBzaG91bGQgYWx3YXlzIGJlIHRoZSBjYXNlXG4gICAgICBpZiAobW9kZWwucmVjZW50RmlsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtb3N0UmVjZW50RW50cnkgPSBtb2RlbC5yZWNlbnRGaWxlc1swXTtcbiAgICAgICAgdmFyIG1vc3RSZWNlbnRGaWxlID0gbW9kZWwubWFwW21vc3RSZWNlbnRFbnRyeS5wYXRoXTtcbiAgICAgICAgJHNjb3BlLmdvdG9GaWxlKG1vc3RSZWNlbnRGaWxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS4kcGFyZW50LnNob3dFZGl0b3IgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmZpbmRlci5hY3RpdmUgPSBtb2RlbC5tYXBbZmlsZS5kaXJdO1xuICAgICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXInKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIG1vZGVsLmFkZFJlY2VudEZpbGUoZmlsZSk7XG5cbiAgZnVuY3Rpb24gaW1nQmxvYlVybCgpIHtcbiAgICAvLyBPYnRhaW4gYSBibG9iOiBVUkwgZm9yIHRoZSBpbWFnZSBkYXRhLlxuICAgIHZhciBhcnJheUJ1ZmZlclZpZXcgPSBuZXcgVWludDhBcnJheShzZXNzaW9uLmRhdGEpO1xuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2FycmF5QnVmZmVyVmlld10sIHtcbiAgICAgIHR5cGU6ICdpbWFnZS8nICsgZmlsZS5leHQuc3Vic3RyKDEpXG4gICAgfSk7XG4gICAgdmFyIHVybENyZWF0b3IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgdmFyIHVybCA9IHVybENyZWF0b3IuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBpZiAoaXNVdGY4KSB7XG5cbiAgICAkc2NvcGUudmlld2VyID0gJ2FjZSc7XG4gICAgJHNjb3BlLiRwYXJlbnQuc2hvd0VkaXRvciA9IHRydWU7XG4gICAgJHNjb3BlLiRwYXJlbnQuZWRpdG9yU2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcblxuICAgIC8vIGlmIHRoZSBlZGl0b3IgZXhpc3RzLCBsb2FkIHRoZSBlZGl0U2Vzc2lvbiB3ZSBqdXN0IGFzc2lnbmVkXG4gICAgaWYgKCRzY29wZS4kcGFyZW50LmVkaXRvcikge1xuICAgICAgJHNjb3BlLiRwYXJlbnQubG9hZFNlc3Npb24oKTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcblxuICAgICRzY29wZS52aWV3ZXIgPSAnJztcbiAgICAkc2NvcGUuJHBhcmVudC5zaG93RWRpdG9yID0gZmFsc2U7XG5cbiAgICBzd2l0Y2ggKGZpbGUuZXh0KSB7XG4gICAgICBjYXNlICcucG5nJzpcbiAgICAgIGNhc2UgJy5qcGcnOlxuICAgICAgY2FzZSAnLmpwZWcnOlxuICAgICAgY2FzZSAnLmdpZic6XG4gICAgICBjYXNlICcuaWNvJzpcbiAgICAgICAgJHNjb3BlLnZpZXdlciA9ICdpbWcnO1xuICAgICAgICAkc2NvcGUuaW1nVXJsID0gaW1nQmxvYlVybCgpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuXG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaW5kZXJNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9maW5kZXInKTtcblxudmFyIGJlYXV0aWZ5Q29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnJykuYmVhdXRpZnk7XG52YXIgYmVhdXRpZnlfanMgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpO1xudmFyIGJlYXV0aWZ5X2NzcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuY3NzO1xudmFyIGJlYXV0aWZ5X2h0bWwgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmh0bWw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2csICRxLCBkaWFsb2csIGZpbGVTZXJ2aWNlLCByZXNwb25zZUhhbmRsZXIpIHtcblxuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuICAkc2NvcGUuc2hvd0VkaXRvciA9IGZhbHNlO1xuXG4gICRzY29wZS5hY2VMb2FkZWQgPSBmdW5jdGlvbihlZGl0b3IpIHtcblxuICAgICRzY29wZS5lZGl0b3IgPSBlZGl0b3I7XG5cbiAgICBlZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZHMoW3tcbiAgICAgIG5hbWU6ICdzYXZlJyxcbiAgICAgIGJpbmRLZXk6IHtcbiAgICAgICAgd2luOiAnQ3RybC1TJyxcbiAgICAgICAgbWFjOiAnQ29tbWFuZC1TJ1xuICAgICAgfSxcbiAgICAgIGV4ZWM6IGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgICB2YXIgZWRpdG9yU2Vzc2lvbiA9IGVkaXRvci5nZXRTZXNzaW9uKCk7XG4gICAgICAgIHZhciBzZXNzaW9uID0gbW9kZWwuc2Vzc2lvbnMuZGlydHkuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZW0uZGF0YSA9PT0gZWRpdG9yU2Vzc2lvbjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzZXNzaW9uKSB7XG4gICAgICAgICAgJHNjb3BlLnNhdmVTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmVhZE9ubHk6IGZhbHNlIC8vIHRoaXMgY29tbWFuZCBzaG91bGQgbm90IGFwcGx5IGluIHJlYWRPbmx5IG1vZGVcbiAgICB9LCB7XG4gICAgICBuYW1lOiAnc2F2ZWFsbCcsXG4gICAgICBiaW5kS2V5OiB7XG4gICAgICAgIHdpbjogJ0N0cmwtU2hpZnQtUycsXG4gICAgICAgIG1hYzogJ0NvbW1hbmQtT3B0aW9uLVMnXG4gICAgICB9LFxuICAgICAgZXhlYzogJHNjb3BlLnNhdmVBbGxTZXNzaW9ucyxcbiAgICAgIHJlYWRPbmx5OiBmYWxzZSAvLyB0aGlzIGNvbW1hbmQgc2hvdWxkIG5vdCBhcHBseSBpbiByZWFkT25seSBtb2RlXG4gICAgfSwge1xuICAgICAgbmFtZTogJ2hlbHAnLFxuICAgICAgYmluZEtleToge1xuICAgICAgICB3aW46ICdDdHJsLUgnLFxuICAgICAgICBtYWM6ICdDb21tYW5kLUgnXG4gICAgICB9LFxuICAgICAgLy9leGVjOiB0aGlzLl9vbkhlbHAuYmluZCh0aGlzKSxcbiAgICAgIHJlYWRPbmx5OiB0cnVlIC8vIHRoaXMgY29tbWFuZCBzaG91bGQgYXBwbHkgaW4gcmVhZE9ubHkgbW9kZVxuICAgIH1dKTtcblxuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kcyhbe1xuICAgICAgbmFtZTogJ2JlYXV0aWZ5JyxcbiAgICAgIGJpbmRLZXk6IHtcbiAgICAgICAgd2luOiAnQ3RybC1CJyxcbiAgICAgICAgbWFjOiAnQ29tbWFuZC1CJ1xuICAgICAgfSxcbiAgICAgIGV4ZWM6IGZ1bmN0aW9uKGVkaXRvciwgbGluZSkge1xuICAgICAgICB2YXIgY2ZnLCBmbjtcbiAgICAgICAgdmFyIGZzbyA9IGZpbmRlci5hY3RpdmU7XG5cbiAgICAgICAgc3dpdGNoIChmc28uZXh0KSB7XG4gICAgICAgICAgY2FzZSAnLmNzcyc6XG4gICAgICAgICAgY2FzZSAnLmxlc3MnOlxuICAgICAgICAgIGNhc2UgJy5zYXNzJzpcbiAgICAgICAgICBjYXNlICcuc2Nzcyc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZuID0gYmVhdXRpZnlfY3NzO1xuICAgICAgICAgICAgICBjZmcgPSBiZWF1dGlmeUNvbmZpZyA/IGJlYXV0aWZ5Q29uZmlnLmNzcyA6IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICcuaHRtbCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZuID0gYmVhdXRpZnlfaHRtbDtcbiAgICAgICAgICAgICAgY2ZnID0gYmVhdXRpZnlDb25maWcgPyBiZWF1dGlmeUNvbmZpZy5odG1sIDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJy5qcyc6XG4gICAgICAgICAgY2FzZSAnLmpzb24nOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmbiA9IGJlYXV0aWZ5X2pzO1xuICAgICAgICAgICAgICBjZmcgPSBiZWF1dGlmeUNvbmZpZyA/IGJlYXV0aWZ5Q29uZmlnLmpzIDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgZWRpdG9yLnNldFZhbHVlKGZuKGVkaXRvci5nZXRWYWx1ZSgpLCBjZmcpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHJlYWRPbmx5OiBmYWxzZSAvLyB0aGlzIGNvbW1hbmQgc2hvdWxkIG5vdCBhcHBseSBpbiByZWFkT25seSBtb2RlXG4gICAgfV0pO1xuXG4gICAgLy8gbG9hZCB0aGUgZWRpdG9yU2Vzc2lvbiBpZiBvbmUgaGFzIGFscmVhZHkgYmVlbiBkZWZpbmVkIChsaWtlIGluIGNoaWxkIGNvbnRyb2xsZXIgRmlsZUN0cmwpXG4gICAgaWYgKCRzY29wZS5lZGl0b3JTZXNzaW9uKSB7XG4gICAgICAkc2NvcGUubG9hZFNlc3Npb24oKTtcbiAgICB9XG5cbiAgfTtcblxuICAkc2NvcGUubG9hZFNlc3Npb24gPSBmdW5jdGlvbigpIHtcbiAgICAkc2NvcGUuZWRpdG9yLnNldFNlc3Npb24oJHNjb3BlLmVkaXRvclNlc3Npb24pO1xuICB9O1xuXG4gICRzY29wZS5hY2VDaGFuZ2VkID0gZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgLy8gRG9uJ3QgcmVtb3ZlIHRoaXMuIFNpbXBseSBoYW5kbGluZyB0aGlzIGNhdXNlcyB0aGUgJGRpZ2VzdCB3ZSB3YW50IHRvIHVwZGF0ZSB0aGUgVUlcbiAgICBjb25zb2xlLmxvZygnRmluZGVyIGVkaXRvciBjaGFuZ2VkJyk7XG4gIH07XG5cbiAgdmFyIHBhdGggPSAkc3RhdGUucGFyYW1zLnBhdGggPyB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlLnBhcmFtcy5wYXRoKSA6IG51bGw7XG4gIHZhciBtb2RlbCA9ICRzY29wZS5tb2RlbDtcblxuICB2YXIgZmluZGVyID0gbmV3IEZpbmRlck1vZGVsKHBhdGggPyBtb2RlbC5saXN0LmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLnBhdGggPT09IHBhdGg7XG4gIH0pIDogbW9kZWwudHJlZSk7XG5cbiAgJHNjb3BlLmZpbmRlciA9IGZpbmRlcjtcblxuICBmdW5jdGlvbiBmaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZmluZGVyLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmIChmc28uaXNGaWxlKSB7XG4gICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZzby5wYXRoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihmc28pIHtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnUmVuYW1lIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZmlsZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZmlsZScsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZpbGUgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtmaWxlKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBmaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihmc28pIHtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBmaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuICAgIHZhciBwYXN0ZVBhdGggPSBmc28uaXNEaXJlY3RvcnkgPyBmc28ucGF0aCA6IGZzby5kaXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjb3B5Jykge1xuICAgICAgZmlsZXN5c3RlbS5jb3B5KHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUocGFzdGVQYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2N1dCcpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUocGFzdGVQYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB9O1xuXG4gICRzY29wZS5zaG93UGFzdGUgPSBmdW5jdGlvbihhY3RpdmUpIHtcbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG4gICAgXG4gICAgaWYgKHBhc3RlQnVmZmVyKSB7XG4gICAgICB2YXIgc291cmNlUGF0aCA9IHBhc3RlQnVmZmVyLmZzby5wYXRoLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgc291cmNlRGlyID0gcGFzdGVCdWZmZXIuZnNvLmRpci50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIGRlc3RpbmF0aW9uRGlyID0gKGFjdGl2ZS5pc0RpcmVjdG9yeSA/IGFjdGl2ZS5wYXRoIDogYWN0aXZlLmRpcikudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBpc0RpcmVjdG9yeSA9IHBhc3RlQnVmZmVyLmZzby5pc0RpcmVjdG9yeTtcbiAgICAgIFxuICAgICAgaWYgKCFpc0RpcmVjdG9yeSkge1xuICAgICAgICAvLyBBbHdheXMgYWxsb3cgcGFzdGVpbmcgb2YgYSBmaWxlIHVubGVzcyBpdCdzIGEgbW92ZSBvcGVyYXRpb24gKGN1dCkgYW5kIHRoZSBkZXN0aW5hdGlvbiBkaXIgaXMgdGhlIHNhbWVcbiAgICAgICAgcmV0dXJuIHBhc3RlQnVmZmVyLm9wICE9PSAnY3V0JyB8fCBkZXN0aW5hdGlvbkRpciAhPT0gc291cmNlRGlyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQWxsb3cgcGFzdGVpbmcgZGlyZWN0b3JpZXMgaWYgbm90IGludG8gc2VsZiBhIGRlY2VuZGVudFxuICAgICAgICBpZiAoZGVzdGluYXRpb25EaXIuaW5kZXhPZihzb3VyY2VQYXRoKSAhPT0gMCkge1xuICAgICAgICAgIC8vIGFuZCAgb3IgaWYgdGhlIG9wZXJhdGlvbiBpcyBtb3ZlIChjdXQpIHRoZSBwYXJlbnQgZGlyIHRvb1xuICAgICAgICAgIHJldHVybiBwYXN0ZUJ1ZmZlci5vcCAhPT0gJ2N1dCcgfHwgZGVzdGluYXRpb25EaXIgIT09IHNvdXJjZURpcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLnNldFBhc3RlQnVmZmVyID0gZnVuY3Rpb24oZnNvLCBvcCkge1xuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0ge1xuICAgICAgZnNvOiBmc28sXG4gICAgICBvcDogb3BcbiAgICB9O1xuXG4gIH07XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlKSB7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlKSB7XG4gICRzY29wZS5tb2RlbC5xID0gJHN0YXRlLnBhcmFtcy5xO1xufTtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJG1vZGFsLCAkbG9nLCBkaWFsb2csIHJlc3BvbnNlSGFuZGxlcikge1xuXG4gIHZhciBleHBhbmRlZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgJHNjb3BlLnRyZWVEYXRhID0ge1xuICAgIHNob3dNZW51OiBmYWxzZVxuICB9O1xuICAkc2NvcGUuYWN0aXZlID0gbnVsbDtcbiAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICBmdW5jdGlvbiBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKHJlc3BvbnNlKSB7XG4gICAgLy8gbm90aWZ5IG9mIGFueSBlcnJvcnMsIG90aGVyd2lzZSBzaWxlbnQuXG4gICAgLy8gVGhlIEZpbGUgU3lzdGVtIFdhdGNoZXIgd2lsbCBoYW5kbGUgdGhlIHN0YXRlIGNoYW5nZXMgaW4gdGhlIGZpbGUgc3lzdGVtXG4gICAgaWYgKHJlc3BvbnNlLmVycikge1xuICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgdGl0bGU6ICdGaWxlIFN5c3RlbSBFcnJvcicsXG4gICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLmVycilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gICRzY29wZS5nZXRDbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgICB2YXIgY2xhc3NlcyA9IFsnZnNvJ107XG4gICAgY2xhc3Nlcy5wdXNoKGZzby5pc0RpcmVjdG9yeSA/ICdkaXInIDogJ2ZpbGUnKTtcblxuICAgIGlmIChmc28gPT09ICRzY29wZS5hY3RpdmUpIHtcbiAgICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICB9O1xuXG4gICRzY29wZS5nZXRJY29uQ2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2ZhJ107XG5cbiAgICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICBjbGFzc2VzLnB1c2goJHNjb3BlLmlzRXhwYW5kZWQoZnNvKSA/ICdmYS1mb2xkZXItb3BlbicgOiAnZmEtZm9sZGVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNsYXNzZXMucHVzaCgnZmEtZmlsZS1vJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICB9O1xuXG4gICRzY29wZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuICEhZXhwYW5kZWRbZnNvLnBhdGhdO1xuICB9O1xuXG4gICRzY29wZS5yaWdodENsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGNvbnNvbGUubG9nKCdSQ2xpY2tlZCAnICsgZnNvLm5hbWUpO1xuICAgICRzY29wZS5tZW51WCA9IGUucGFnZVg7XG4gICAgJHNjb3BlLm1lbnVZID0gZS5wYWdlWTtcbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuICAgICRzY29wZS50cmVlRGF0YS5zaG93TWVudSA9IHRydWU7XG4gIH07XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgIHZhciBpc0V4cGFuZGVkID0gJHNjb3BlLmlzRXhwYW5kZWQoZnNvKTtcbiAgICAgIGlmIChpc0V4cGFuZGVkKSB7XG4gICAgICAgIGRlbGV0ZSBleHBhbmRlZFtmc28ucGF0aF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHBhbmRlZFtmc28ucGF0aF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAkc2NvcGUub3Blbihmc28pO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cuY29uZmlybSh7XG4gICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdEZWxldGUgWycgKyBmc28ubmFtZSArICddLiBBcmUgeW91IHN1cmU/J1xuICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbW92ZShmc28ucGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ1JlbmFtZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2ZpbGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZpbGUnLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGaWxlIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZmlsZShwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZmlsZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2RpciA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRm9sZGVyIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZvbGRlciBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtkaXIocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY29weScpIHtcbiAgICAgIGZpbGVzeXN0ZW0uY29weShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjdXQnKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH1cblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgfTtcblxuICAkc2NvcGUuc2hvd1Bhc3RlID0gZnVuY3Rpb24oZSwgYWN0aXZlKSB7XG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyICYmIGFjdGl2ZS5pc0RpcmVjdG9yeSkge1xuICAgICAgaWYgKCFwYXN0ZUJ1ZmZlci5mc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZS5wYXRoLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXN0ZUJ1ZmZlci5mc28ucGF0aC50b0xvd2VyQ2FzZSgpKSAhPT0gMCkgeyAvLyBkaXNhbGxvdyBwYXN0aW5nIGludG8gc2VsZiBvciBhIGRlY2VuZGVudFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5zZXRQYXN0ZUJ1ZmZlciA9IGZ1bmN0aW9uKGUsIGZzbywgb3ApIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IHtcbiAgICAgIGZzbzogZnNvLFxuICAgICAgb3A6IG9wXG4gICAgfTtcblxuICB9O1xuXG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5cbm1vZC5jb25maWcoW1xuICAnJHN0YXRlUHJvdmlkZXInLFxuICByZXF1aXJlKCcuL2NvbmZpZycpXG5dKTtcblxubW9kLnNlcnZpY2UoJ1Nlc3Npb25TZXJ2aWNlJywgW1xuICByZXF1aXJlKCcuL3NlcnZpY2VzL3Nlc3Npb24nKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0N0cmwnLCBbXG4gICckc2NvcGUnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaW5kZXJDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICckbG9nJyxcbiAgJyRxJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnRmlsZVNlcnZpY2UnLFxuICAnUmVzcG9uc2VIYW5kbGVyJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9maW5kZXInKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0ZpbGVDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICdzZXNzaW9uJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9maWxlJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNTZWFyY2hDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvc2VhcmNoJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNEaXJDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJ2RpcicsXG4gICdGaWxlU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNUcmVlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckbW9kYWwnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvdHJlZScpXG5dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJmdW5jdGlvbiBGaW5kZXJNb2RlbChhY3RpdmUpIHtcbiAgLy8gdGhpcy50cmVlID0gdHJlZTtcbiAgdGhpcy5hY3RpdmUgPSBhY3RpdmU7XG59XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuX3JlYWRDb2xzID0gZnVuY3Rpb24odHJlZSkge1xuXG4gIC8vdmFyIHRyZWUgPSB0aGlzLl90cmVlO1xuICB2YXIgYWN0aXZlID0gdGhpcy5fYWN0aXZlO1xuICAvL3ZhciBhY3RpdmVJc0RpciA9IGFjdGl2ZS5pc0RpcmVjdG9yeTtcblxuICB2YXIgY29scyA9IFtdO1xuXG4gIGlmIChhY3RpdmUpIHtcblxuICAgIHZhciBjdXJyID0gYWN0aXZlLmlzRGlyZWN0b3J5ID8gYWN0aXZlIDogYWN0aXZlLnBhcmVudDtcbiAgICBkbyB7XG4gICAgICBjb2xzLnVuc2hpZnQoY3Vyci5jaGlsZHJlbik7XG4gICAgICBjdXJyID0gY3Vyci5wYXJlbnQ7XG4gICAgfSB3aGlsZSAoY3Vycik7XG5cbiAgICBjb2xzLnNoaWZ0KCk7XG5cbiAgfSBlbHNlIHtcbiAgICBjb2xzLnB1c2godHJlZS5jaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gY29scztcblxufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5nZXRDbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGNsYXNzZXMgPSBbJ2ZzbyddO1xuICBjbGFzc2VzLnB1c2goZnNvLmlzRGlyZWN0b3J5ID8gJ2RpcicgOiAnZmlsZScpO1xuXG4gIGlmIChmc28gPT09IHRoaXMuYWN0aXZlKSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdhY3RpdmUnKTtcbiAgfVxuXG4gIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuZ2V0SWNvbkNsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgY2xhc3NlcyA9IFsnZmEnXTtcblxuICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgY2xhc3Nlcy5wdXNoKHRoaXMuaXNFeHBhbmRlZChmc28pID8gJ2ZhLWZvbGRlci1vcGVuLW8nIDogJ2ZhLWZvbGRlci1vJyk7XG4gIH0gZWxzZSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdmYS1maWxlJyk7XG4gIH1cblxuICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmlzSGlnaGxpZ2h0ZWQgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGFjdGl2ZSA9IHRoaXMuX2FjdGl2ZTtcbiAgdmFyIGlzSGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblxuICBpZiAoZnNvID09PSBhY3RpdmUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChhY3RpdmUgJiYgZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgLy8gY2hlY2sgaWYgaXQgaXMgYW4gYW5jZXN0b3JcbiAgICB2YXIgciA9IGFjdGl2ZTtcbiAgICB3aGlsZSAoci5wYXJlbnQpIHtcbiAgICAgIGlmIChyID09PSBmc28pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByID0gci5wYXJlbnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZGlyKSB7XG4gIHJldHVybiB0aGlzLmlzSGlnaGxpZ2h0ZWQoZGlyKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuY29scyA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgcmV0dXJuIHRoaXMuX3JlYWRDb2xzKHRyZWUpO1xufTtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhGaW5kZXJNb2RlbC5wcm90b3R5cGUsIHtcbiAgYWN0aXZlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9hY3RpdmUgPSB2YWx1ZTtcbiAgICAgIGlmICh0aGlzLl9hY3RpdmUuaXNGaWxlKSB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZUZpbGUgPSB0aGlzLl9hY3RpdmU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBhY3RpdmVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVGaWxlO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJNb2RlbDtcbiIsImZ1bmN0aW9uIFNlc3Npb24oZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5wYXRoID0gZGF0YS5wYXRoO1xuICB0aGlzLnRpbWUgPSBkYXRhLnRpbWU7XG4gIHRoaXMuZGF0YSA9IGRhdGEuZGF0YSB8fCB7fTtcbiAgdGhpcy5pc1V0ZjggPSBkYXRhLmlzVXRmODtcbn1cblNlc3Npb24ucHJvdG90eXBlLm1hcmtDbGVhbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKSB7XG4gICAgdGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKCkubWFya0NsZWFuKCk7XG4gIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZXNzaW9uLnByb3RvdHlwZSwge1xuICBpc0RpcnR5OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIoKS5pc0NsZWFuKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbm1vZHVsZS5leHBvcnRzID0gU2Vzc2lvbjtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2ZzJywgW10pO1xuIiwidmFyIFNlc3Npb24gPSByZXF1aXJlKCcuLi9tb2RlbHMvc2Vzc2lvbicpO1xudmFyIGZzdyA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcblxudmFyIFNlc3Npb25zID0gZnVuY3Rpb24obWFwKSB7XG4gIHRoaXMuX3Nlc3Npb25zID0gW107XG4gIHRoaXMuX21hcCA9IG1hcDtcbn07XG5TZXNzaW9ucy5wcm90b3R5cGUuZmluZFNlc3Npb24gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZXNzaW9ucyA9IHRoaXMuX3Nlc3Npb25zO1xuXG4gIHJldHVybiBzZXNzaW9ucy5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBwYXRoO1xuICB9KTtcblxufTtcblNlc3Npb25zLnByb3RvdHlwZS5hZGRTZXNzaW9uID0gZnVuY3Rpb24ocGF0aCwgZGF0YSwgaXNVdGY4KSB7XG5cbiAgaWYgKHRoaXMuZmluZFNlc3Npb24ocGF0aCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZm9yIHBhdGggZXhpc3RzIGFscmVhZHkuJyk7XG4gIH1cblxuICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcbiAgdmFyIHNlc3Npb24gPSBuZXcgU2Vzc2lvbih7XG4gICAgcGF0aDogcGF0aCxcbiAgICB0aW1lOiBEYXRlLm5vdygpLFxuICAgIGRhdGE6IGRhdGEsXG4gICAgaXNVdGY4OiBpc1V0ZjhcbiAgfSk7XG4gIHNlc3Npb25zLnVuc2hpZnQoc2Vzc2lvbik7XG5cbiAgcmV0dXJuIHNlc3Npb247XG59O1xuU2Vzc2lvbnMucHJvdG90eXBlLnJlbW92ZVNlc3Npb24gPSBmdW5jdGlvbihzZXNzaW9uKSB7XG5cbiAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG5cbiAgdmFyIGlkeCA9IHNlc3Npb25zLmluZGV4T2Yoc2Vzc2lvbik7XG4gIGlmIChpZHggIT09IC0xKSB7XG4gICAgc2Vzc2lvbnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZXNzaW9ucy5wcm90b3R5cGUsIHtcbiAgc2Vzc2lvbnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gICAgICByZXR1cm4gc2Vzc2lvbnM7XG4gICAgICAvLyB2YXIgbWFwID0gdGhpcy5fbWFwO1xuICAgICAgLy9cbiAgICAgIC8vIC8vIGNsZWFuIGFueSBmaWxlcyB0aGF0IG1heSBubyBsb25nZXIgZXhpc3RcbiAgICAgIC8vIC8vIHZhciBpID0gc2Vzc2lvbnMubGVuZ3RoO1xuICAgICAgLy8gLy8gd2hpbGUgKGktLSkge1xuICAgICAgLy8gLy8gICBpZiAoIW1hcFtzZXNzaW9uc1tpXS5wYXRoXSkge1xuICAgICAgLy8gLy8gICAgIHNlc3Npb25zLnNwbGljZShpLCAxKTtcbiAgICAgIC8vIC8vICAgfVxuICAgICAgLy8gLy8gfVxuICAgICAgLy9cbiAgICAgIC8vIHJldHVybiBzZXNzaW9ucy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgLy8gICByZXR1cm4gbWFwW2l0ZW0ucGF0aF07XG4gICAgICAvLyB9LCB0aGlzKTtcblxuICAgIH1cbiAgfSxcbiAgZGlydHk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gICAgICByZXR1cm4gdGhpcy5zZXNzaW9ucy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5pc0RpcnR5O1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcblxuXG4vKlxuICogbW9kdWxlIGV4cG9ydHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgc2Vzc2lvbnMgPSBuZXcgU2Vzc2lvbnMoZnN3Lm1hcCk7XG4gIHJldHVybiBzZXNzaW9ucztcblxufTtcbiIsIlxuXG53aW5kb3cuYXBwID0gcmVxdWlyZSgnLi9hcHAnKTtcblxuXG4vL3dpbmRvdy5mcyA9IHJlcXVpcmUoJy4vZnMnKTtcblxuLy8gLy8gKioqKioqKioqKi8vKlxuLy8gLy8gU2hpbXNcbi8vIC8vICoqKioqKioqKioqXG5yZXF1aXJlKCcuL2FycmF5Jyk7XG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIERpcmVjdGl2ZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL25lZ2F0ZScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9mb2N1cycpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9kYi1kaWFncmFtJyk7XG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL3JpZ2h0LWNsaWNrJyk7XG4vLyAvLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL2JlaGF2ZScpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gQ29udHJvbGxlcnNcbi8vIC8vICoqKioqKioqKioqXG4vL1xuLy8gLy8gZGlhbG9nIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2NvbmZpcm0nKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYWxlcnQnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvcHJvbXB0Jyk7XG4vL1xuLy8gLy8gaG9tZSBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2hvbWUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy90cmVlJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvZmlsZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbmRlcicpO1xuLy9cbi8vIC8vIGRiIG1vZGVsIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2tleScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9hcnJheS1kZWYnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvc2NoZW1hJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL21vZGVsJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RiJyk7XG4vL1xuLy9cbi8vIC8vIGFwaSBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYXBpJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9jb250cm9sbGVyJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9oYW5kbGVyJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9yb3V0ZScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWN0aW9uJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9kaWFncmFtJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9hZGQtcmVzb3VyY2UnKTtcbi8vXG4vL1xuLy8gLy8gbWFpbiBhcHAgY29udHJvbGxlclxuLy8gcmVxdWlyZSgnLi9hcHAvY29udHJvbGxlcnMvYXBwJyk7XG4vL1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBTZXJ2aWNlc1xuLy8gLy8gKioqKioqKioqKipcbi8vIHJlcXVpcmUoJy4vc2VydmljZXMvZGlhbG9nJyk7XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxudmFyIEZpbGVTeXN0ZW1PYmplY3QgPSBmdW5jdGlvbihwYXRoLCBzdGF0KSB7XG4gIHRoaXMubmFtZSA9IHAuYmFzZW5hbWUocGF0aCkgfHwgcGF0aDtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5kaXIgPSBwLmRpcm5hbWUocGF0aCk7XG4gIHRoaXMuaXNEaXJlY3RvcnkgPSB0eXBlb2Ygc3RhdCA9PT0gJ2Jvb2xlYW4nID8gc3RhdCA6IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgdGhpcy5leHQgPSBwLmV4dG5hbWUocGF0aCk7XG4gIHRoaXMuc3RhdCA9IHN0YXQ7XG59O1xuRmlsZVN5c3RlbU9iamVjdC5wcm90b3R5cGUgPSB7XG4gIGdldCBpc0ZpbGUoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzRGlyZWN0b3J5O1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlU3lzdGVtT2JqZWN0O1xuIiwiLyogZ2xvYmFsIGRpYWxvZyAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcm5kc3RyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKCtuZXcgRGF0ZSgpKS50b1N0cmluZygzNik7XG4gIH0sXG4gIGdldHVpZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucmFuZG9tKCkgKiAxZTcpKS50b1N0cmluZygpO1xuICB9LFxuICBnZXR1aWRzdHI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbiAgfSxcbiAgdXJsUm9vdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0O1xuICB9LFxuICBlbmNvZGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBidG9hKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKTtcbiAgfSxcbiAgZGVjb2RlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGF0b2Ioc3RyKSk7XG4gIH0sXG4gIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKG9yaWdpbiwgYWRkKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICAgIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gb3JpZ2luO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdpbjtcbiAgfSxcbiAgdWk6IHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfVxufTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJxKzY0ZndcIikpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iXX0=
