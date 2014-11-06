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
        //el.scrollIntoView(false);
        $timeout(function() {
          var active  = el.querySelector('.active');
          var centerOfActiveEl = active.offsetLeft + (active.offsetWidth / 2);
          var leftBoundary = el.scrollLeft;
          var rightBoundary = leftBoundary + el.offsetWidth;

          if (centerOfActiveEl < leftBoundary) {
            el.scrollLeft = active.offsetLeft - (el.offsetWidth / 2) + (active.offsetWidth / 2);// - el.offsetWidth
          } else if (centerOfActiveEl > rightBoundary) {
            el.scrollLeft = active.offsetLeft - (el.offsetWidth / 2) + (active.offsetWidth / 2);// + el.offsetWidth
          }
          
        }, 100);
        //el.scrollTop = scrollTo.offset().top - container.offset().top + container.scrollTop()
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2Nvb2tpZS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZW1pdHRlci1jb21wb25lbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2pzLWJlYXV0aWZ5L2pzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9saWIvYmVhdXRpZnktY3NzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9saWIvYmVhdXRpZnktaHRtbC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvanMtYmVhdXRpZnkvanMvbGliL2JlYXV0aWZ5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9kaXJlY3RpdmVzL3Njcm9sbGVkLWludG8tdmlldy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvZGlyZWN0aXZlcy9zY3JvbGxlZC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL21vZGVscy9hcHAuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL21vZHVsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvY29sb3IuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL3NlcnZpY2VzL2ZpbGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL3NlcnZpY2VzL3Jlc3BvbnNlLWhhbmRsZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXJyYXkuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvY29uZmlnLmpzb24iLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2FsZXJ0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9jb25maXJtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvcHJvbXB0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9zZXJ2aWNlcy9kaWFsb2cuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZmlsZS1zeXN0ZW0td2F0Y2hlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZGlyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL2ZpbGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmluZGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3NlYXJjaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy90cmVlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL21vZGVscy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL3Nlc3Npb24uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL3NlcnZpY2VzL3Nlc3Npb24uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC91dGlscy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2wzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2NERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8vIFNlcmlhbGl6ZSB0aGUgYSBuYW1lIHZhbHVlIHBhaXIgaW50byBhIGNvb2tpZSBzdHJpbmcgc3VpdGFibGUgZm9yXG4vLy8gaHR0cCBoZWFkZXJzLiBBbiBvcHRpb25hbCBvcHRpb25zIG9iamVjdCBzcGVjaWZpZWQgY29va2llIHBhcmFtZXRlcnNcbi8vL1xuLy8vIHNlcmlhbGl6ZSgnZm9vJywgJ2JhcicsIHsgaHR0cE9ubHk6IHRydWUgfSlcbi8vLyAgID0+IFwiZm9vPWJhcjsgaHR0cE9ubHlcIlxuLy8vXG4vLy8gQHBhcmFtIHtTdHJpbmd9IG5hbWVcbi8vLyBAcGFyYW0ge1N0cmluZ30gdmFsXG4vLy8gQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbi8vLyBAcmV0dXJuIHtTdHJpbmd9XG52YXIgc2VyaWFsaXplID0gZnVuY3Rpb24obmFtZSwgdmFsLCBvcHQpe1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB2YXIgZW5jID0gb3B0LmVuY29kZSB8fCBlbmNvZGU7XG4gICAgdmFyIHBhaXJzID0gW25hbWUgKyAnPScgKyBlbmModmFsKV07XG5cbiAgICBpZiAobnVsbCAhPSBvcHQubWF4QWdlKSB7XG4gICAgICAgIHZhciBtYXhBZ2UgPSBvcHQubWF4QWdlIC0gMDtcbiAgICAgICAgaWYgKGlzTmFOKG1heEFnZSkpIHRocm93IG5ldyBFcnJvcignbWF4QWdlIHNob3VsZCBiZSBhIE51bWJlcicpO1xuICAgICAgICBwYWlycy5wdXNoKCdNYXgtQWdlPScgKyBtYXhBZ2UpO1xuICAgIH1cblxuICAgIGlmIChvcHQuZG9tYWluKSBwYWlycy5wdXNoKCdEb21haW49JyArIG9wdC5kb21haW4pO1xuICAgIGlmIChvcHQucGF0aCkgcGFpcnMucHVzaCgnUGF0aD0nICsgb3B0LnBhdGgpO1xuICAgIGlmIChvcHQuZXhwaXJlcykgcGFpcnMucHVzaCgnRXhwaXJlcz0nICsgb3B0LmV4cGlyZXMudG9VVENTdHJpbmcoKSk7XG4gICAgaWYgKG9wdC5odHRwT25seSkgcGFpcnMucHVzaCgnSHR0cE9ubHknKTtcbiAgICBpZiAob3B0LnNlY3VyZSkgcGFpcnMucHVzaCgnU2VjdXJlJyk7XG5cbiAgICByZXR1cm4gcGFpcnMuam9pbignOyAnKTtcbn07XG5cbi8vLyBQYXJzZSB0aGUgZ2l2ZW4gY29va2llIGhlYWRlciBzdHJpbmcgaW50byBhbiBvYmplY3Rcbi8vLyBUaGUgb2JqZWN0IGhhcyB0aGUgdmFyaW91cyBjb29raWVzIGFzIGtleXMobmFtZXMpID0+IHZhbHVlc1xuLy8vIEBwYXJhbSB7U3RyaW5nfSBzdHJcbi8vLyBAcmV0dXJuIHtPYmplY3R9XG52YXIgcGFyc2UgPSBmdW5jdGlvbihzdHIsIG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB2YXIgb2JqID0ge31cbiAgICB2YXIgcGFpcnMgPSBzdHIuc3BsaXQoLzsgKi8pO1xuICAgIHZhciBkZWMgPSBvcHQuZGVjb2RlIHx8IGRlY29kZTtcblxuICAgIHBhaXJzLmZvckVhY2goZnVuY3Rpb24ocGFpcikge1xuICAgICAgICB2YXIgZXFfaWR4ID0gcGFpci5pbmRleE9mKCc9JylcblxuICAgICAgICAvLyBza2lwIHRoaW5ncyB0aGF0IGRvbid0IGxvb2sgbGlrZSBrZXk9dmFsdWVcbiAgICAgICAgaWYgKGVxX2lkeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXkgPSBwYWlyLnN1YnN0cigwLCBlcV9pZHgpLnRyaW0oKVxuICAgICAgICB2YXIgdmFsID0gcGFpci5zdWJzdHIoKytlcV9pZHgsIHBhaXIubGVuZ3RoKS50cmltKCk7XG5cbiAgICAgICAgLy8gcXVvdGVkIHZhbHVlc1xuICAgICAgICBpZiAoJ1wiJyA9PSB2YWxbMF0pIHtcbiAgICAgICAgICAgIHZhbCA9IHZhbC5zbGljZSgxLCAtMSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvbmx5IGFzc2lnbiBvbmNlXG4gICAgICAgIGlmICh1bmRlZmluZWQgPT0gb2JqW2tleV0pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSBkZWModmFsKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBvYmpba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQ7XG52YXIgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50O1xuXG5tb2R1bGUuZXhwb3J0cy5zZXJpYWxpemUgPSBzZXJpYWxpemU7XG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlO1xuIiwiXG4vKipcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcbiAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XG59O1xuXG4vKipcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub24gPVxuRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgKHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdKVxuICAgIC5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgZnVuY3Rpb24gb24oKSB7XG4gICAgc2VsZi5vZmYoZXZlbnQsIG9uKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgb24uZm4gPSBmbjtcbiAgdGhpcy5vbihldmVudCwgb24pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcblxuICAvLyBhbGxcbiAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcblxuICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXG4gIHZhciBjYjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBjYiA9IGNhbGxiYWNrc1tpXTtcbiAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xuICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge01peGVkfSAuLi5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICwgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwiLyoqXG5UaGUgZm9sbG93aW5nIGJhdGNoZXMgYXJlIGVxdWl2YWxlbnQ6XG5cbnZhciBiZWF1dGlmeV9qcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5Jyk7XG52YXIgYmVhdXRpZnlfanMgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmpzO1xudmFyIGJlYXV0aWZ5X2pzID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5qc19iZWF1dGlmeTtcblxudmFyIGJlYXV0aWZ5X2NzcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuY3NzO1xudmFyIGJlYXV0aWZ5X2NzcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuY3NzX2JlYXV0aWZ5O1xuXG52YXIgYmVhdXRpZnlfaHRtbCA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuaHRtbDtcbnZhciBiZWF1dGlmeV9odG1sID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5odG1sX2JlYXV0aWZ5O1xuXG5BbGwgbWV0aG9kcyByZXR1cm5lZCBhY2NlcHQgdHdvIGFyZ3VtZW50cywgdGhlIHNvdXJjZSBzdHJpbmcgYW5kIGFuIG9wdGlvbnMgb2JqZWN0LlxuKiovXG5cbmZ1bmN0aW9uIGdldF9iZWF1dGlmeShqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KSB7XG4gICAgLy8gdGhlIGRlZmF1bHQgaXMganNcbiAgICB2YXIgYmVhdXRpZnkgPSBmdW5jdGlvbiAoc3JjLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIGpzX2JlYXV0aWZ5LmpzX2JlYXV0aWZ5KHNyYywgY29uZmlnKTtcbiAgICB9O1xuXG4gICAgLy8gc2hvcnQgYWxpYXNlc1xuICAgIGJlYXV0aWZ5LmpzICAgPSBqc19iZWF1dGlmeS5qc19iZWF1dGlmeTtcbiAgICBiZWF1dGlmeS5jc3MgID0gY3NzX2JlYXV0aWZ5LmNzc19iZWF1dGlmeTtcbiAgICBiZWF1dGlmeS5odG1sID0gaHRtbF9iZWF1dGlmeS5odG1sX2JlYXV0aWZ5O1xuXG4gICAgLy8gbGVnYWN5IGFsaWFzZXNcbiAgICBiZWF1dGlmeS5qc19iZWF1dGlmeSAgID0ganNfYmVhdXRpZnkuanNfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuY3NzX2JlYXV0aWZ5ICA9IGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuaHRtbF9iZWF1dGlmeSA9IGh0bWxfYmVhdXRpZnkuaHRtbF9iZWF1dGlmeTtcblxuICAgIHJldHVybiBiZWF1dGlmeTtcbn1cblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgZGVmaW5lKFtcbiAgICAgICAgXCIuL2xpYi9iZWF1dGlmeVwiLFxuICAgICAgICBcIi4vbGliL2JlYXV0aWZ5LWNzc1wiLFxuICAgICAgICBcIi4vbGliL2JlYXV0aWZ5LWh0bWxcIlxuICAgIF0sIGZ1bmN0aW9uKGpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnksIGh0bWxfYmVhdXRpZnkpIHtcbiAgICAgICAgcmV0dXJuIGdldF9iZWF1dGlmeShqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KTtcbiAgICB9KTtcbn0gZWxzZSB7XG4gICAgKGZ1bmN0aW9uKG1vZCkge1xuICAgICAgICB2YXIganNfYmVhdXRpZnkgPSByZXF1aXJlKCcuL2xpYi9iZWF1dGlmeScpO1xuICAgICAgICB2YXIgY3NzX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9saWIvYmVhdXRpZnktY3NzJyk7XG4gICAgICAgIHZhciBodG1sX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9saWIvYmVhdXRpZnktaHRtbCcpO1xuXG4gICAgICAgIG1vZC5leHBvcnRzID0gZ2V0X2JlYXV0aWZ5KGpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnksIGh0bWxfYmVhdXRpZnkpO1xuXG4gICAgfSkobW9kdWxlKTtcbn1cblxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2hpbnQgY3VybHk6dHJ1ZSwgZXFlcWVxOnRydWUsIGxheGJyZWFrOnRydWUsIG5vZW1wdHk6ZmFsc2UgKi9cbi8qXG5cbiAgVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiAgQ29weXJpZ2h0IChjKSAyMDA3LTIwMTMgRWluYXIgTGllbG1hbmlzIGFuZCBjb250cmlidXRvcnMuXG5cbiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAgb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXNcbiAgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuICBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0ZcbiAgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkRcbiAgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSU1xuICBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbiAgQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU5cbiAgQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICBTT0ZUV0FSRS5cblxuXG4gQ1NTIEJlYXV0aWZpZXJcbi0tLS0tLS0tLS0tLS0tLVxuXG4gICAgV3JpdHRlbiBieSBIYXJ1dHl1biBBbWlyamFueWFuLCAoYW1pcmphbnlhbkBnbWFpbC5jb20pXG5cbiAgICBCYXNlZCBvbiBjb2RlIGluaXRpYWxseSBkZXZlbG9wZWQgYnk6IEVpbmFyIExpZWxtYW5pcywgPGVpbmFyQGpzYmVhdXRpZmllci5vcmc+XG4gICAgICAgIGh0dHA6Ly9qc2JlYXV0aWZpZXIub3JnL1xuXG4gICAgVXNhZ2U6XG4gICAgICAgIGNzc19iZWF1dGlmeShzb3VyY2VfdGV4dCk7XG4gICAgICAgIGNzc19iZWF1dGlmeShzb3VyY2VfdGV4dCwgb3B0aW9ucyk7XG5cbiAgICBUaGUgb3B0aW9ucyBhcmUgKGRlZmF1bHQgaW4gYnJhY2tldHMpOlxuICAgICAgICBpbmRlbnRfc2l6ZSAoNCkgICAgICAgICAgICAgICAgICAg4oCUIGluZGVudGF0aW9uIHNpemUsXG4gICAgICAgIGluZGVudF9jaGFyIChzcGFjZSkgICAgICAgICAgICAgICDigJQgY2hhcmFjdGVyIHRvIGluZGVudCB3aXRoLFxuICAgICAgICBzZWxlY3Rvcl9zZXBhcmF0b3JfbmV3bGluZSAodHJ1ZSkgLSBzZXBhcmF0ZSBzZWxlY3RvcnMgd2l0aCBuZXdsaW5lIG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdCAoZS5nLiBcImEsXFxuYnJcIiBvciBcImEsIGJyXCIpXG4gICAgICAgIGVuZF93aXRoX25ld2xpbmUgKGZhbHNlKSAgICAgICAgICAtIGVuZCB3aXRoIGEgbmV3bGluZVxuXG4gICAgZS5nXG5cbiAgICBjc3NfYmVhdXRpZnkoY3NzX3NvdXJjZV90ZXh0LCB7XG4gICAgICAnaW5kZW50X3NpemUnOiAxLFxuICAgICAgJ2luZGVudF9jaGFyJzogJ1xcdCcsXG4gICAgICAnc2VsZWN0b3Jfc2VwYXJhdG9yJzogJyAnLFxuICAgICAgJ2VuZF93aXRoX25ld2xpbmUnOiBmYWxzZSxcbiAgICB9KTtcbiovXG5cbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL0NTUzIxL3N5bmRhdGEuaHRtbCN0b2tlbml6YXRpb25cbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtc3ludGF4L1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gY3NzX2JlYXV0aWZ5KHNvdXJjZV90ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB2YXIgaW5kZW50U2l6ZSA9IG9wdGlvbnMuaW5kZW50X3NpemUgfHwgNDtcbiAgICAgICAgdmFyIGluZGVudENoYXJhY3RlciA9IG9wdGlvbnMuaW5kZW50X2NoYXIgfHwgJyAnO1xuICAgICAgICB2YXIgc2VsZWN0b3JTZXBhcmF0b3JOZXdsaW5lID0gKG9wdGlvbnMuc2VsZWN0b3Jfc2VwYXJhdG9yX25ld2xpbmUgPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5zZWxlY3Rvcl9zZXBhcmF0b3JfbmV3bGluZTtcbiAgICAgICAgdmFyIGVuZF93aXRoX25ld2xpbmUgPSAob3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmVuZF93aXRoX25ld2xpbmU7XG5cbiAgICAgICAgLy8gY29tcGF0aWJpbGl0eVxuICAgICAgICBpZiAodHlwZW9mIGluZGVudFNpemUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGluZGVudFNpemUgPSBwYXJzZUludChpbmRlbnRTaXplLCAxMCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHRva2VuaXplclxuICAgICAgICB2YXIgd2hpdGVSZSA9IC9eXFxzKyQvO1xuICAgICAgICB2YXIgd29yZFJlID0gL1tcXHckXFwtX10vO1xuXG4gICAgICAgIHZhciBwb3MgPSAtMSxcbiAgICAgICAgICAgIGNoO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZV90ZXh0LmNoYXJBdCgrK3Bvcyk7XG4gICAgICAgICAgICByZXR1cm4gY2ggfHwgJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwZWVrKHNraXBXaGl0ZXNwYWNlKSB7XG4gICAgICAgICAgICB2YXIgcHJldl9wb3MgPSBwb3M7XG4gICAgICAgICAgICBpZiAoc2tpcFdoaXRlc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQgPSBzb3VyY2VfdGV4dC5jaGFyQXQocG9zICsgMSkgfHwgJyc7XG4gICAgICAgICAgICBwb3MgPSBwcmV2X3BvcyAtIDE7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZWF0U3RyaW5nKGVuZENoYXJzKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBwb3M7XG4gICAgICAgICAgICB3aGlsZSAobmV4dCgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmRDaGFycy5pbmRleE9mKGNoKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc291cmNlX3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBwb3MgKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHBlZWtTdHJpbmcoZW5kQ2hhcikge1xuICAgICAgICAgICAgdmFyIHByZXZfcG9zID0gcG9zO1xuICAgICAgICAgICAgdmFyIHN0ciA9IGVhdFN0cmluZyhlbmRDaGFyKTtcbiAgICAgICAgICAgIHBvcyA9IHByZXZfcG9zIC0gMTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlYXRXaGl0ZXNwYWNlKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgICAgICAgd2hpbGUgKHdoaXRlUmUudGVzdChwZWVrKCkpKSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNraXBXaGl0ZXNwYWNlKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgICAgICAgaWYgKGNoICYmIHdoaXRlUmUudGVzdChjaCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICh3aGl0ZVJlLnRlc3QobmV4dCgpKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBjaFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVhdENvbW1lbnQoc2luZ2xlTGluZSkge1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gcG9zO1xuICAgICAgICAgICAgdmFyIHNpbmdsZUxpbmUgPSBwZWVrKCkgPT09IFwiL1wiO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgd2hpbGUgKG5leHQoKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2luZ2xlTGluZSAmJiBjaCA9PT0gXCIqXCIgJiYgcGVlaygpID09PSBcIi9cIikge1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2luZ2xlTGluZSAmJiBjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc291cmNlX3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBwb3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZV90ZXh0LnN1YnN0cmluZyhzdGFydCwgcG9zKSArIGNoO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBsb29rQmFjayhzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2VfdGV4dC5zdWJzdHJpbmcocG9zIC0gc3RyLmxlbmd0aCwgcG9zKS50b0xvd2VyQ2FzZSgpID09PVxuICAgICAgICAgICAgICAgIHN0cjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5lc3RlZCBwc2V1ZG8tY2xhc3MgaWYgd2UgYXJlIGluc2lkZVJ1bGVcbiAgICAgICAgLy8gYW5kIHRoZSBuZXh0IHNwZWNpYWwgY2hhcmFjdGVyIGZvdW5kIG9wZW5zXG4gICAgICAgIC8vIGEgbmV3IGJsb2NrXG4gICAgICAgIGZ1bmN0aW9uIGZvdW5kTmVzdGVkUHNldWRvQ2xhc3MoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gcG9zICsgMTsgaSA8IHNvdXJjZV90ZXh0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgY2ggPSBzb3VyY2VfdGV4dC5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSBcIntcIil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiO1wiIHx8IGNoID09PSBcIn1cIiB8fCBjaCA9PT0gXCIpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByaW50ZXJcbiAgICAgICAgdmFyIGJhc2ViYXNlSW5kZW50U3RyaW5nID0gc291cmNlX3RleHQubWF0Y2goL15bXFx0IF0qLylbMF07XG4gICAgICAgIHZhciBzaW5nbGVJbmRlbnQgPSBuZXcgQXJyYXkoaW5kZW50U2l6ZSArIDEpLmpvaW4oaW5kZW50Q2hhcmFjdGVyKTtcbiAgICAgICAgdmFyIGluZGVudExldmVsID0gMDtcbiAgICAgICAgdmFyIG5lc3RlZExldmVsID0gMDtcblxuICAgICAgICBmdW5jdGlvbiBpbmRlbnQoKSB7XG4gICAgICAgICAgICBpbmRlbnRMZXZlbCsrO1xuICAgICAgICAgICAgYmFzZWJhc2VJbmRlbnRTdHJpbmcgKz0gc2luZ2xlSW5kZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb3V0ZGVudCgpIHtcbiAgICAgICAgICAgIGluZGVudExldmVsLS07XG4gICAgICAgICAgICBiYXNlYmFzZUluZGVudFN0cmluZyA9IGJhc2ViYXNlSW5kZW50U3RyaW5nLnNsaWNlKDAsIC1pbmRlbnRTaXplKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcmludCA9IHt9O1xuICAgICAgICBwcmludFtcIntcIl0gPSBmdW5jdGlvbihjaCkge1xuICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJpbnRbXCJ9XCJdID0gZnVuY3Rpb24oY2gpIHtcbiAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmludC5fbGFzdENoYXJXaGl0ZXNwYWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gd2hpdGVSZS50ZXN0KG91dHB1dFtvdXRwdXQubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHByaW50Lm5ld0xpbmUgPSBmdW5jdGlvbihrZWVwV2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgaWYgKCFrZWVwV2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgICAgIHByaW50LnRyaW0oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG91dHB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCgnXFxuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYmFzZWJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChiYXNlYmFzZUluZGVudFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHByaW50LnNpbmdsZVNwYWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCAmJiAhcHJpbnQuX2xhc3RDaGFyV2hpdGVzcGFjZSgpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goJyAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcmludC50cmltID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3aGlsZSAocHJpbnQuX2xhc3RDaGFyV2hpdGVzcGFjZSgpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIFxuICAgICAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgICAgIGlmIChiYXNlYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgb3V0cHV0LnB1c2goYmFzZWJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIC8qX19fX19fX19fX19fX19fX19fX19fLS0tLS0tLS0tLS0tLS0tLS0tLS1fX19fX19fX19fX19fX19fX19fX18qL1xuXG4gICAgICAgIHZhciBpbnNpZGVSdWxlID0gZmFsc2U7XG4gICAgICAgIHZhciBlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgdmFyIHRvcF9jaCA9ICcnO1xuICAgICAgICB2YXIgbGFzdF90b3BfY2ggPSAnJztcblxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIHdoaXRlc3BhY2UgPSBza2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgdmFyIGlzQWZ0ZXJTcGFjZSA9IHdoaXRlc3BhY2UgIT09ICcnO1xuICAgICAgICAgICAgdmFyIGlzQWZ0ZXJOZXdsaW5lID0gd2hpdGVzcGFjZS5pbmRleE9mKCdcXG4nKSAhPT0gLTE7XG4gICAgICAgICAgICB2YXIgbGFzdF90b3BfY2ggPSB0b3BfY2g7XG4gICAgICAgICAgICB2YXIgdG9wX2NoID0gY2g7XG5cbiAgICAgICAgICAgIGlmICghY2gpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJyAmJiBwZWVrKCkgPT09ICcqJykgeyAvKiBjc3MgY29tbWVudCAqL1xuICAgICAgICAgICAgICAgIHZhciBoZWFkZXIgPSBsb29rQmFjayhcIlwiKTtcbiAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0Q29tbWVudCgpKTtcbiAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJyAmJiBwZWVrKCkgPT09ICcvJykgeyAvLyBzaW5nbGUgbGluZSBjb21tZW50XG4gICAgICAgICAgICAgICAgaWYgKCFpc0FmdGVyTmV3bGluZSAmJiBsYXN0X3RvcF9jaCAhPT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnRyaW0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChlYXRDb21tZW50KCkpO1xuICAgICAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdAJykge1xuICAgICAgICAgICAgICAgIC8vIHBhc3MgYWxvbmcgdGhlIHNwYWNlIHdlIGZvdW5kIGFzIGEgc2VwYXJhdGUgaXRlbVxuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RyaXAgdHJhaWxpbmcgc3BhY2UsIGlmIHByZXNlbnQsIGZvciBoYXNoIHByb3BlcnR5IGNoZWNrc1xuICAgICAgICAgICAgICAgIHZhciB2YXJpYWJsZU9yUnVsZSA9IHBlZWtTdHJpbmcoXCI6ICw7e30oKVtdLz0nXFxcIlwiKS5yZXBsYWNlKC9cXHMkLywgJycpO1xuXG4gICAgICAgICAgICAgICAgLy8gbWlnaHQgYmUgYSBuZXN0aW5nIGF0LXJ1bGVcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGVPclJ1bGUgaW4gY3NzX2JlYXV0aWZ5Lk5FU1RFRF9BVF9SVUxFKSB7XG4gICAgICAgICAgICAgICAgICAgIG5lc3RlZExldmVsICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZU9yUnVsZSBpbiBjc3NfYmVhdXRpZnkuQ09ORElUSU9OQUxfR1JPVVBfUlVMRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJzogJy5pbmRleE9mKHZhcmlhYmxlT3JSdWxlW3ZhcmlhYmxlT3JSdWxlLmxlbmd0aCAtMV0pID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBoYXZlIGEgdmFyaWFibGUsIGFkZCBpdCBhbmQgaW5zZXJ0IG9uZSBzcGFjZSBiZWZvcmUgY29udGludWluZ1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlT3JSdWxlID0gZWF0U3RyaW5nKFwiOiBcIikucmVwbGFjZSgvXFxzJC8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2godmFyaWFibGVPclJ1bGUpO1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICd7Jykge1xuICAgICAgICAgICAgICAgIGlmIChwZWVrKHRydWUpID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKFwie31cIik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50W1wie1wiXShjaCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gZW50ZXJpbmcgY29uZGl0aW9uYWwgZ3JvdXBzLCBvbmx5IHJ1bGVzZXRzIGFyZSBhbGxvd2VkXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyaW5nQ29uZGl0aW9uYWxHcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zaWRlUnVsZSA9IChpbmRlbnRMZXZlbCA+IG5lc3RlZExldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgZGVjbGFyYXRpb25zIGFyZSBhbHNvIGFsbG93ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2lkZVJ1bGUgPSAoaW5kZW50TGV2ZWwgPj0gbmVzdGVkTGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgb3V0ZGVudCgpO1xuICAgICAgICAgICAgICAgIHByaW50W1wifVwiXShjaCk7XG4gICAgICAgICAgICAgICAgaW5zaWRlUnVsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChuZXN0ZWRMZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXN0ZWRMZXZlbC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiOlwiKSB7XG4gICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgIGlmICgoaW5zaWRlUnVsZSB8fCBlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXApICYmIFxuICAgICAgICAgICAgICAgICAgICAgICAgIShsb29rQmFjayhcIiZcIikgfHwgZm91bmROZXN0ZWRQc2V1ZG9DbGFzcygpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAncHJvcGVydHk6IHZhbHVlJyBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggY291bGQgYmUgaW4gYSBjb25kaXRpb25hbCBncm91cCBxdWVyeVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCgnOicpO1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNhc3MvbGVzcyBwYXJlbnQgcmVmZXJlbmNlIGRvbid0IHVzZSBhIHNwYWNlXG4gICAgICAgICAgICAgICAgICAgIC8vIHNhc3MgbmVzdGVkIHBzZXVkby1jbGFzcyBkb24ndCB1c2UgYSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICBpZiAocGVlaygpID09PSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHNldWRvLWVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKFwiOjpcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwc2V1ZG8tY2xhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKCc6Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXCInIHx8IGNoID09PSAnXFwnJykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0U3RyaW5nKGNoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnOycpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJygnKSB7IC8vIG1heSBiZSBhIHVybFxuICAgICAgICAgICAgICAgIGlmIChsb29rQmFjayhcInVybFwiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoICE9PSAnKScgJiYgY2ggIT09ICdcIicgJiYgY2ggIT09ICdcXCcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0U3RyaW5nKCcpJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3MtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJywnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWluc2lkZVJ1bGUgJiYgc2VsZWN0b3JTZXBhcmF0b3JOZXdsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICddJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdbJykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJz0nKSB7IC8vIG5vIHdoaXRlc3BhY2UgYmVmb3JlIG9yIGFmdGVyXG4gICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQWZ0ZXJTcGFjZSkge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIHN3ZWV0Q29kZSA9IG91dHB1dC5qb2luKCcnKS5yZXBsYWNlKC9bXFxyXFxuXFx0IF0rJC8sICcnKTtcblxuICAgICAgICAvLyBlc3RhYmxpc2ggZW5kX3dpdGhfbmV3bGluZVxuICAgICAgICBpZiAoZW5kX3dpdGhfbmV3bGluZSkge1xuICAgICAgICAgICAgc3dlZXRDb2RlICs9IFwiXFxuXCI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3dlZXRDb2RlO1xuICAgIH1cblxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0NTUy9BdC1ydWxlXG4gICAgY3NzX2JlYXV0aWZ5Lk5FU1RFRF9BVF9SVUxFID0ge1xuICAgICAgICBcIkBwYWdlXCI6IHRydWUsXG4gICAgICAgIFwiQGZvbnQtZmFjZVwiOiB0cnVlLFxuICAgICAgICBcIkBrZXlmcmFtZXNcIjogdHJ1ZSxcbiAgICAgICAgLy8gYWxzbyBpbiBDT05ESVRJT05BTF9HUk9VUF9SVUxFIGJlbG93XG4gICAgICAgIFwiQG1lZGlhXCI6IHRydWUsXG4gICAgICAgIFwiQHN1cHBvcnRzXCI6IHRydWUsXG4gICAgICAgIFwiQGRvY3VtZW50XCI6IHRydWVcbiAgICB9O1xuICAgIGNzc19iZWF1dGlmeS5DT05ESVRJT05BTF9HUk9VUF9SVUxFID0ge1xuICAgICAgICBcIkBtZWRpYVwiOiB0cnVlLFxuICAgICAgICBcIkBzdXBwb3J0c1wiOiB0cnVlLFxuICAgICAgICBcIkBkb2N1bWVudFwiOiB0cnVlXG4gICAgfTtcblxuICAgIC8qZ2xvYmFsIGRlZmluZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQU1EICggaHR0cHM6Ly9naXRodWIuY29tL2FtZGpzL2FtZGpzLWFwaS93aWtpL0FNRCNkZWZpbmVhbWQtcHJvcGVydHktIClcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY3NzX2JlYXV0aWZ5OiBjc3NfYmVhdXRpZnlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIENvbW1vbkpTLiBKdXN0IHB1dCB0aGlzIGZpbGUgc29tZXdoZXJlIG9uIHlvdXIgcmVxdWlyZS5wYXRoc1xuICAgICAgICAvLyBhbmQgeW91IHdpbGwgYmUgYWJsZSB0byBgdmFyIGh0bWxfYmVhdXRpZnkgPSByZXF1aXJlKFwiYmVhdXRpZnlcIikuaHRtbF9iZWF1dGlmeWAuXG4gICAgICAgIGV4cG9ydHMuY3NzX2JlYXV0aWZ5ID0gY3NzX2JlYXV0aWZ5O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSdyZSBydW5uaW5nIGEgd2ViIHBhZ2UgYW5kIGRvbid0IGhhdmUgZWl0aGVyIG9mIHRoZSBhYm92ZSwgYWRkIG91ciBvbmUgZ2xvYmFsXG4gICAgICAgIHdpbmRvdy5jc3NfYmVhdXRpZnkgPSBjc3NfYmVhdXRpZnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlIGRvbid0IGV2ZW4gaGF2ZSB3aW5kb3csIHRyeSBnbG9iYWwuXG4gICAgICAgIGdsb2JhbC5jc3NfYmVhdXRpZnkgPSBjc3NfYmVhdXRpZnk7XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNoaW50IGN1cmx5OnRydWUsIGVxZXFlcTp0cnVlLCBsYXhicmVhazp0cnVlLCBub2VtcHR5OmZhbHNlICovXG4vKlxuXG4gIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gIENvcHlyaWdodCAoYykgMjAwNy0yMDEzIEVpbmFyIExpZWxtYW5pcyBhbmQgY29udHJpYnV0b3JzLlxuXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzXG4gICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlNcbiAgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4gIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAgU09GVFdBUkUuXG5cblxuIFN0eWxlIEhUTUxcbi0tLS0tLS0tLS0tLS0tLVxuXG4gIFdyaXR0ZW4gYnkgTm9jaHVtIFNvc3NvbmtvLCAobnNvc3NvbmtvQGhvdG1haWwuY29tKVxuXG4gIEJhc2VkIG9uIGNvZGUgaW5pdGlhbGx5IGRldmVsb3BlZCBieTogRWluYXIgTGllbG1hbmlzLCA8ZWluYXJAanNiZWF1dGlmaWVyLm9yZz5cbiAgICBodHRwOi8vanNiZWF1dGlmaWVyLm9yZy9cblxuICBVc2FnZTpcbiAgICBzdHlsZV9odG1sKGh0bWxfc291cmNlKTtcblxuICAgIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMpO1xuXG4gIFRoZSBvcHRpb25zIGFyZTpcbiAgICBpbmRlbnRfaW5uZXJfaHRtbCAoZGVmYXVsdCBmYWxzZSkgIOKAlCBpbmRlbnQgPGhlYWQ+IGFuZCA8Ym9keT4gc2VjdGlvbnMsXG4gICAgaW5kZW50X3NpemUgKGRlZmF1bHQgNCkgICAgICAgICAg4oCUIGluZGVudGF0aW9uIHNpemUsXG4gICAgaW5kZW50X2NoYXIgKGRlZmF1bHQgc3BhY2UpICAgICAg4oCUIGNoYXJhY3RlciB0byBpbmRlbnQgd2l0aCxcbiAgICB3cmFwX2xpbmVfbGVuZ3RoIChkZWZhdWx0IDI1MCkgICAgICAgICAgICAtICBtYXhpbXVtIGFtb3VudCBvZiBjaGFyYWN0ZXJzIHBlciBsaW5lICgwID0gZGlzYWJsZSlcbiAgICBicmFjZV9zdHlsZSAoZGVmYXVsdCBcImNvbGxhcHNlXCIpIC0gXCJjb2xsYXBzZVwiIHwgXCJleHBhbmRcIiB8IFwiZW5kLWV4cGFuZFwiXG4gICAgICAgICAgICBwdXQgYnJhY2VzIG9uIHRoZSBzYW1lIGxpbmUgYXMgY29udHJvbCBzdGF0ZW1lbnRzIChkZWZhdWx0KSwgb3IgcHV0IGJyYWNlcyBvbiBvd24gbGluZSAoQWxsbWFuIC8gQU5TSSBzdHlsZSksIG9yIGp1c3QgcHV0IGVuZCBicmFjZXMgb24gb3duIGxpbmUuXG4gICAgdW5mb3JtYXR0ZWQgKGRlZmF1bHRzIHRvIGlubGluZSB0YWdzKSAtIGxpc3Qgb2YgdGFncywgdGhhdCBzaG91bGRuJ3QgYmUgcmVmb3JtYXR0ZWRcbiAgICBpbmRlbnRfc2NyaXB0cyAoZGVmYXVsdCBub3JtYWwpICAtIFwia2VlcFwifFwic2VwYXJhdGVcInxcIm5vcm1hbFwiXG4gICAgcHJlc2VydmVfbmV3bGluZXMgKGRlZmF1bHQgdHJ1ZSkgLSB3aGV0aGVyIGV4aXN0aW5nIGxpbmUgYnJlYWtzIGJlZm9yZSBlbGVtZW50cyBzaG91bGQgYmUgcHJlc2VydmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT25seSB3b3JrcyBiZWZvcmUgZWxlbWVudHMsIG5vdCBpbnNpZGUgdGFncyBvciBmb3IgdGV4dC5cbiAgICBtYXhfcHJlc2VydmVfbmV3bGluZXMgKGRlZmF1bHQgdW5saW1pdGVkKSAtIG1heGltdW0gbnVtYmVyIG9mIGxpbmUgYnJlYWtzIHRvIGJlIHByZXNlcnZlZCBpbiBvbmUgY2h1bmtcbiAgICBpbmRlbnRfaGFuZGxlYmFycyAoZGVmYXVsdCBmYWxzZSkgLSBmb3JtYXQgYW5kIGluZGVudCB7eyNmb299fSBhbmQge3svZm9vfX1cbiAgICBlbmRfd2l0aF9uZXdsaW5lIChmYWxzZSkgICAgICAgICAgLSBlbmQgd2l0aCBhIG5ld2xpbmVcblxuXG4gICAgZS5nLlxuXG4gICAgc3R5bGVfaHRtbChodG1sX3NvdXJjZSwge1xuICAgICAgJ2luZGVudF9pbm5lcl9odG1sJzogZmFsc2UsXG4gICAgICAnaW5kZW50X3NpemUnOiAyLFxuICAgICAgJ2luZGVudF9jaGFyJzogJyAnLFxuICAgICAgJ3dyYXBfbGluZV9sZW5ndGgnOiA3OCxcbiAgICAgICdicmFjZV9zdHlsZSc6ICdleHBhbmQnLFxuICAgICAgJ3VuZm9ybWF0dGVkJzogWydhJywgJ3N1YicsICdzdXAnLCAnYicsICdpJywgJ3UnXSxcbiAgICAgICdwcmVzZXJ2ZV9uZXdsaW5lcyc6IHRydWUsXG4gICAgICAnbWF4X3ByZXNlcnZlX25ld2xpbmVzJzogNSxcbiAgICAgICdpbmRlbnRfaGFuZGxlYmFycyc6IGZhbHNlXG4gICAgfSk7XG4qL1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICBmdW5jdGlvbiB0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGx0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXlxccysvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFxzKyQvZywnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywganNfYmVhdXRpZnksIGNzc19iZWF1dGlmeSkge1xuICAgICAgICAvL1dyYXBwZXIgZnVuY3Rpb24gdG8gaW52b2tlIGFsbCB0aGUgbmVjZXNzYXJ5IGNvbnN0cnVjdG9ycyBhbmQgZGVhbCB3aXRoIHRoZSBvdXRwdXQuXG5cbiAgICAgICAgdmFyIG11bHRpX3BhcnNlcixcbiAgICAgICAgICAgIGluZGVudF9pbm5lcl9odG1sLFxuICAgICAgICAgICAgaW5kZW50X3NpemUsXG4gICAgICAgICAgICBpbmRlbnRfY2hhcmFjdGVyLFxuICAgICAgICAgICAgd3JhcF9saW5lX2xlbmd0aCxcbiAgICAgICAgICAgIGJyYWNlX3N0eWxlLFxuICAgICAgICAgICAgdW5mb3JtYXR0ZWQsXG4gICAgICAgICAgICBwcmVzZXJ2ZV9uZXdsaW5lcyxcbiAgICAgICAgICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyxcbiAgICAgICAgICAgIGluZGVudF9oYW5kbGViYXJzLFxuICAgICAgICAgICAgZW5kX3dpdGhfbmV3bGluZTtcblxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB0byAxLjMuNFxuICAgICAgICBpZiAoKG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IHBhcnNlSW50KG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCwgMTApID09PSAwKSAmJlxuICAgICAgICAgICAgICAgIChvcHRpb25zLm1heF9jaGFyICE9PSB1bmRlZmluZWQgJiYgcGFyc2VJbnQob3B0aW9ucy5tYXhfY2hhciwgMTApICE9PSAwKSkge1xuICAgICAgICAgICAgb3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoID0gb3B0aW9ucy5tYXhfY2hhcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGVudF9pbm5lcl9odG1sID0gKG9wdGlvbnMuaW5kZW50X2lubmVyX2h0bWwgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuaW5kZW50X2lubmVyX2h0bWw7XG4gICAgICAgIGluZGVudF9zaXplID0gKG9wdGlvbnMuaW5kZW50X3NpemUgPT09IHVuZGVmaW5lZCkgPyA0IDogcGFyc2VJbnQob3B0aW9ucy5pbmRlbnRfc2l6ZSwgMTApO1xuICAgICAgICBpbmRlbnRfY2hhcmFjdGVyID0gKG9wdGlvbnMuaW5kZW50X2NoYXIgPT09IHVuZGVmaW5lZCkgPyAnICcgOiBvcHRpb25zLmluZGVudF9jaGFyO1xuICAgICAgICBicmFjZV9zdHlsZSA9IChvcHRpb25zLmJyYWNlX3N0eWxlID09PSB1bmRlZmluZWQpID8gJ2NvbGxhcHNlJyA6IG9wdGlvbnMuYnJhY2Vfc3R5bGU7XG4gICAgICAgIHdyYXBfbGluZV9sZW5ndGggPSAgcGFyc2VJbnQob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoLCAxMCkgPT09IDAgPyAzMjc4NiA6IHBhcnNlSW50KG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCB8fCAyNTAsIDEwKTtcbiAgICAgICAgdW5mb3JtYXR0ZWQgPSBvcHRpb25zLnVuZm9ybWF0dGVkIHx8IFsnYScsICdzcGFuJywgJ2ltZycsICdiZG8nLCAnZW0nLCAnc3Ryb25nJywgJ2RmbicsICdjb2RlJywgJ3NhbXAnLCAna2JkJywgJ3ZhcicsICdjaXRlJywgJ2FiYnInLCAnYWNyb255bScsICdxJywgJ3N1YicsICdzdXAnLCAndHQnLCAnaScsICdiJywgJ2JpZycsICdzbWFsbCcsICd1JywgJ3MnLCAnc3RyaWtlJywgJ2ZvbnQnLCAnaW5zJywgJ2RlbCcsICdwcmUnLCAnYWRkcmVzcycsICdkdCcsICdoMScsICdoMicsICdoMycsICdoNCcsICdoNScsICdoNiddO1xuICAgICAgICBwcmVzZXJ2ZV9uZXdsaW5lcyA9IChvcHRpb25zLnByZXNlcnZlX25ld2xpbmVzID09PSB1bmRlZmluZWQpID8gdHJ1ZSA6IG9wdGlvbnMucHJlc2VydmVfbmV3bGluZXM7XG4gICAgICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyA9IHByZXNlcnZlX25ld2xpbmVzID9cbiAgICAgICAgICAgIChpc05hTihwYXJzZUludChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcywgMTApKSA/IDMyNzg2IDogcGFyc2VJbnQob3B0aW9ucy5tYXhfcHJlc2VydmVfbmV3bGluZXMsIDEwKSlcbiAgICAgICAgICAgIDogMDtcbiAgICAgICAgaW5kZW50X2hhbmRsZWJhcnMgPSAob3B0aW9ucy5pbmRlbnRfaGFuZGxlYmFycyA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5pbmRlbnRfaGFuZGxlYmFycztcbiAgICAgICAgZW5kX3dpdGhfbmV3bGluZSA9IChvcHRpb25zLmVuZF93aXRoX25ld2xpbmUgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZTtcblxuICAgICAgICBmdW5jdGlvbiBQYXJzZXIoKSB7XG5cbiAgICAgICAgICAgIHRoaXMucG9zID0gMDsgLy9QYXJzZXIgcG9zaXRpb25cbiAgICAgICAgICAgIHRoaXMudG9rZW4gPSAnJztcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnOyAvL3JlZmxlY3RzIHRoZSBjdXJyZW50IFBhcnNlciBtb2RlOiBUQUcvQ09OVEVOVFxuICAgICAgICAgICAgdGhpcy50YWdzID0geyAvL0FuIG9iamVjdCB0byBob2xkIHRhZ3MsIHRoZWlyIHBvc2l0aW9uLCBhbmQgdGhlaXIgcGFyZW50LXRhZ3MsIGluaXRpYXRlZCB3aXRoIGRlZmF1bHQgdmFsdWVzXG4gICAgICAgICAgICAgICAgcGFyZW50OiAncGFyZW50MScsXG4gICAgICAgICAgICAgICAgcGFyZW50Y291bnQ6IDEsXG4gICAgICAgICAgICAgICAgcGFyZW50MTogJydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnRva2VuX3RleHQgPSB0aGlzLmxhc3RfdG9rZW4gPSB0aGlzLmxhc3RfdGV4dCA9IHRoaXMudG9rZW5fdHlwZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5uZXdsaW5lcyA9IDA7XG4gICAgICAgICAgICB0aGlzLmluZGVudF9jb250ZW50ID0gaW5kZW50X2lubmVyX2h0bWw7XG5cbiAgICAgICAgICAgIHRoaXMuVXRpbHMgPSB7IC8vVWlsaXRpZXMgbWFkZSBhdmFpbGFibGUgdG8gdGhlIHZhcmlvdXMgZnVuY3Rpb25zXG4gICAgICAgICAgICAgICAgd2hpdGVzcGFjZTogXCJcXG5cXHJcXHQgXCIuc3BsaXQoJycpLFxuICAgICAgICAgICAgICAgIHNpbmdsZV90b2tlbjogJ2JyLGlucHV0LGxpbmssbWV0YSwhZG9jdHlwZSxiYXNlZm9udCxiYXNlLGFyZWEsaHIsd2JyLHBhcmFtLGltZyxpc2luZGV4LD94bWwsZW1iZWQsP3BocCw/LD89Jy5zcGxpdCgnLCcpLCAvL2FsbCB0aGUgc2luZ2xlIHRhZ3MgZm9yIEhUTUxcbiAgICAgICAgICAgICAgICBleHRyYV9saW5lcnM6ICdoZWFkLGJvZHksL2h0bWwnLnNwbGl0KCcsJyksIC8vZm9yIHRhZ3MgdGhhdCBuZWVkIGEgbGluZSBvZiB3aGl0ZXNwYWNlIGJlZm9yZSB0aGVtXG4gICAgICAgICAgICAgICAgaW5fYXJyYXk6IGZ1bmN0aW9uKHdoYXQsIGFycikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdoYXQgPT09IGFycltpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gdHJ1ZSBpZmYgdGhlIGdpdmVuIHRleHQgaXMgY29tcG9zZWQgZW50aXJlbHkgb2ZcbiAgICAgICAgICAgIC8vIHdoaXRlc3BhY2UuXG4gICAgICAgICAgICB0aGlzLmlzX3doaXRlc3BhY2UgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCB0ZXh0Lmxlbmd0aDsgdGV4dCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5VdGlscy5pbl9hcnJheSh0ZXh0LmNoYXJBdChuKSwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnRyYXZlcnNlX3doaXRlc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnO1xuXG4gICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5VdGlscy5pbl9hcnJheShpbnB1dF9jaGFyLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV3bGluZXMgPSAwO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5VdGlscy5pbl9hcnJheShpbnB1dF9jaGFyLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlc2VydmVfbmV3bGluZXMgJiYgaW5wdXRfY2hhciA9PT0gJ1xcbicgJiYgdGhpcy5uZXdsaW5lcyA8PSBtYXhfcHJlc2VydmVfbmV3bGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5ld2xpbmVzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBBcHBlbmQgYSBzcGFjZSB0byB0aGUgZ2l2ZW4gY29udGVudCAoc3RyaW5nIGFycmF5KSBvciwgaWYgd2UgYXJlXG4gICAgICAgICAgICAvLyBhdCB0aGUgd3JhcF9saW5lX2xlbmd0aCwgYXBwZW5kIGEgbmV3bGluZS9pbmRlbnRhdGlvbi5cbiAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saW5lX2NoYXJfY291bnQgPj0gdGhpcy53cmFwX2xpbmVfbGVuZ3RoKSB7IC8vaW5zZXJ0IGEgbGluZSB3aGVuIHRoZSB3cmFwX2xpbmVfbGVuZ3RoIGlzIHJlYWNoZWRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKGZhbHNlLCBjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9pbmRlbnRhdGlvbihjb250ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goJyAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9jb250ZW50ID0gZnVuY3Rpb24oKSB7IC8vZnVuY3Rpb24gdG8gY2FwdHVyZSByZWd1bGFyIGNvbnRlbnQgYmV0d2VlbiB0YWdzXG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X2NoYXIgPSAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlOyAvL2lmIGEgc3BhY2UgaXMgbmVlZGVkXG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpICE9PSAnPCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5sZW5ndGggPyBjb250ZW50LmpvaW4oJycpIDogWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGViYXJzIHBhcnNpbmcgaXMgY29tcGxpY2F0ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB7eyNmb299fSBhbmQge3svZm9vfX0gYXJlIGZvcm1hdHRlZCB0YWdzLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ge3tzb21ldGhpbmd9fSBzaG91bGQgZ2V0IHRyZWF0ZWQgYXMgY29udGVudCwgZXhjZXB0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ge3tlbHNlfX0gc3BlY2lmaWNhbGx5IGJlaGF2ZXMgbGlrZSB7eyNpZn19IGFuZCB7ey9pZn19XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGVlazMgPSB0aGlzLmlucHV0LnN1YnN0cih0aGlzLnBvcywgMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVlazMgPT09ICd7eyMnIHx8IHBlZWszID09PSAne3svJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXNlIGFyZSB0YWdzIGFuZCBub3QgY29udGVudC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnB1dC5zdWJzdHIodGhpcy5wb3MsIDIpID09PSAne3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0X3RhZyh0cnVlKSA9PT0gJ3t7ZWxzZX19Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goaW5wdXRfY2hhcik7IC8vbGV0dGVyIGF0LWEtdGltZSAob3Igc3RyaW5nKSBpbnNlcnRlZCB0byBhbiBhcnJheVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5sZW5ndGggPyBjb250ZW50LmpvaW4oJycpIDogJyc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9jb250ZW50c190byA9IGZ1bmN0aW9uKG5hbWUpIHsgLy9nZXQgdGhlIGZ1bGwgY29udGVudCBvZiBhIHNjcmlwdCBvciBzdHlsZSB0byBwYXNzIHRvIGpzX2JlYXV0aWZ5XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID09PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJyc7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICB2YXIgcmVnX21hdGNoID0gbmV3IFJlZ0V4cCgnPC8nICsgbmFtZSArICdcXFxccyo+JywgJ2lnbScpO1xuICAgICAgICAgICAgICAgIHJlZ19tYXRjaC5sYXN0SW5kZXggPSB0aGlzLnBvcztcbiAgICAgICAgICAgICAgICB2YXIgcmVnX2FycmF5ID0gcmVnX21hdGNoLmV4ZWModGhpcy5pbnB1dCk7XG4gICAgICAgICAgICAgICAgdmFyIGVuZF9zY3JpcHQgPSByZWdfYXJyYXkgPyByZWdfYXJyYXkuaW5kZXggOiB0aGlzLmlucHV0Lmxlbmd0aDsgLy9hYnNvbHV0ZSBlbmQgb2Ygc2NyaXB0XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zIDwgZW5kX3NjcmlwdCkgeyAvL2dldCBldmVyeXRoaW5nIGluIGJldHdlZW4gdGhlIHNjcmlwdCB0YWdzXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLmlucHV0LnN1YnN0cmluZyh0aGlzLnBvcywgZW5kX3NjcmlwdCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zID0gZW5kX3NjcmlwdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnJlY29yZF90YWcgPSBmdW5jdGlvbih0YWcpIHsgLy9mdW5jdGlvbiB0byByZWNvcmQgYSB0YWcgYW5kIGl0cyBwYXJlbnQgaW4gdGhpcy50YWdzIE9iamVjdFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10pIHsgLy9jaGVjayBmb3IgdGhlIGV4aXN0ZW5jZSBvZiB0aGlzIHRhZyB0eXBlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSsrO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXSA9IHRoaXMuaW5kZW50X2xldmVsOyAvL2FuZCByZWNvcmQgdGhlIHByZXNlbnQgaW5kZW50IGxldmVsXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9vdGhlcndpc2UgaW5pdGlhbGl6ZSB0aGlzIHRhZyB0eXBlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dID0gdGhpcy5pbmRlbnRfbGV2ZWw7IC8vYW5kIHJlY29yZCB0aGUgcHJlc2VudCBpbmRlbnQgbGV2ZWxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSArICdwYXJlbnQnXSA9IHRoaXMudGFncy5wYXJlbnQ7IC8vc2V0IHRoZSBwYXJlbnQgKGkuZS4gaW4gdGhlIGNhc2Ugb2YgYSBkaXYgdGhpcy50YWdzLmRpdjFwYXJlbnQpXG4gICAgICAgICAgICAgICAgdGhpcy50YWdzLnBhcmVudCA9IHRhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXTsgLy9hbmQgbWFrZSB0aGlzIHRoZSBjdXJyZW50IHBhcmVudCAoaS5lLiBpbiB0aGUgY2FzZSBvZiBhIGRpdiAnZGl2MScpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnJldHJpZXZlX3RhZyA9IGZ1bmN0aW9uKHRhZykgeyAvL2Z1bmN0aW9uIHRvIHJldHJpZXZlIHRoZSBvcGVuaW5nIHRhZyB0byB0aGUgY29ycmVzcG9uZGluZyBjbG9zZXJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50YWdzW3RhZyArICdjb3VudCddKSB7IC8vaWYgdGhlIG9wZW5lbmVyIGlzIG5vdCBpbiB0aGUgT2JqZWN0IHdlIGlnbm9yZSBpdFxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcF9wYXJlbnQgPSB0aGlzLnRhZ3MucGFyZW50OyAvL2NoZWNrIHRvIHNlZSBpZiBpdCdzIGEgY2xvc2FibGUgdGFnLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGVtcF9wYXJlbnQpIHsgLy90aWxsIHdlIHJlYWNoICcnICh0aGUgaW5pdGlhbCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddID09PSB0ZW1wX3BhcmVudCkgeyAvL2lmIHRoaXMgaXMgaXQgdXNlIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wX3BhcmVudCA9IHRoaXMudGFnc1t0ZW1wX3BhcmVudCArICdwYXJlbnQnXTsgLy9vdGhlcndpc2Uga2VlcCBvbiBjbGltYmluZyB1cCB0aGUgRE9NIFRyZWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGVtcF9wYXJlbnQpIHsgLy9pZiB3ZSBjYXVnaHQgc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbCA9IHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dOyAvL3NldCB0aGUgaW5kZW50X2xldmVsIGFjY29yZGluZ2x5XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3MucGFyZW50ID0gdGhpcy50YWdzW3RlbXBfcGFyZW50ICsgJ3BhcmVudCddOyAvL2FuZCBzZXQgdGhlIGN1cnJlbnQgcGFyZW50XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gKyAncGFyZW50J107IC8vZGVsZXRlIHRoZSBjbG9zZWQgdGFncyBwYXJlbnQgcmVmZXJlbmNlLi4uXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXTsgLy8uLi5hbmQgdGhlIHRhZyBpdHNlbGZcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXS0tO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5pbmRlbnRfdG9fdGFnID0gZnVuY3Rpb24odGFnKSB7XG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggdGhlIGluZGVudGF0aW9uIGxldmVsIHRvIHRoZSBsYXN0IHVzZSBvZiB0aGlzIHRhZywgYnV0IGRvbid0IHJlbW92ZSBpdC5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFnc1t0YWcgKyAnY291bnQnXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB0ZW1wX3BhcmVudCA9IHRoaXMudGFncy5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRlbXBfcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gPT09IHRlbXBfcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0ZW1wX3BhcmVudCA9IHRoaXMudGFnc1t0ZW1wX3BhcmVudCArICdwYXJlbnQnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRlbXBfcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsID0gdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfdGFnID0gZnVuY3Rpb24ocGVlaykgeyAvL2Z1bmN0aW9uIHRvIGdldCBhIGZ1bGwgdGFnIGFuZCBwYXJzZSBpdHMgdHlwZVxuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9ICcnLFxuICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnQsIHRhZ19lbmQsXG4gICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydF9jaGFyLFxuICAgICAgICAgICAgICAgICAgICBvcmlnX3BvcyA9IHRoaXMucG9zLFxuICAgICAgICAgICAgICAgICAgICBvcmlnX2xpbmVfY2hhcl9jb3VudCA9IHRoaXMubGluZV9jaGFyX2NvdW50O1xuXG4gICAgICAgICAgICAgICAgcGVlayA9IHBlZWsgIT09IHVuZGVmaW5lZCA/IHBlZWsgOiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9zID0gb3JpZ19wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgPSBvcmlnX2xpbmVfY2hhcl9jb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50Lmxlbmd0aCA/IGNvbnRlbnQuam9pbignJykgOiBbJycsICdUS19FT0YnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuVXRpbHMuaW5fYXJyYXkoaW5wdXRfY2hhciwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkgeyAvL2Rvbid0IHdhbnQgdG8gaW5zZXJ0IHVubmVjZXNzYXJ5IHNwYWNlXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSBcIidcIiB8fCBpbnB1dF9jaGFyID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyICs9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKGlucHV0X2NoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gJz0nKSB7IC8vbm8gc3BhY2UgYmVmb3JlID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudC5sZW5ndGggJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdICE9PSAnPScgJiYgaW5wdXRfY2hhciAhPT0gJz4nICYmIHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL25vIHNwYWNlIGFmdGVyID0gb3IgYmVmb3JlID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgdGFnX3N0YXJ0X2NoYXIgPT09ICc8Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBpbnNpZGUgYW4gYW5nbGUtYnJhY2tldCB0YWcsIHB1dCBzcGFjZXMgYXJvdW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGViYXJzIG5vdCBpbnNpZGUgb2Ygc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoaW5wdXRfY2hhciArIHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKSkgPT09ICd7eycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyICs9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKCd9fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gIT09ICcgJyAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gIT09ICc8Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gJyAnICsgaW5wdXRfY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0X2NoYXIgPT09ICc8JyAmJiAhdGFnX3N0YXJ0X2NoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydCA9IHRoaXMucG9zIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydF9jaGFyID0gJzwnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzICYmICF0YWdfc3RhcnRfY2hhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoID49IDIgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdID09PSAneycgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDJdID09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSAnIycgfHwgaW5wdXRfY2hhciA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydCA9IHRoaXMucG9zIC0gMztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnQgPSB0aGlzLnBvcyAtIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydF9jaGFyID0gJ3snO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5wdXNoKGlucHV0X2NoYXIpOyAvL2luc2VydHMgY2hhcmFjdGVyIGF0LWEtdGltZSAob3Igc3RyaW5nKVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50WzFdICYmIGNvbnRlbnRbMV0gPT09ICchJykgeyAvL2lmIHdlJ3JlIGluIGEgY29tbWVudCwgZG8gc29tZXRoaW5nIHNwZWNpYWxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIHRyZWF0IGFsbCBjb21tZW50cyBhcyBsaXRlcmFscywgZXZlbiBtb3JlIHRoYW4gcHJlZm9ybWF0dGVkIHRhZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGp1c3QgbG9vayBmb3IgdGhlIGFwcHJvcHJpYXRlIGNsb3NlIHRhZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFt0aGlzLmdldF9jb21tZW50KHRhZ19zdGFydCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgdGFnX3N0YXJ0X2NoYXIgPT09ICd7JyAmJiBjb250ZW50Lmxlbmd0aCA+IDIgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDJdID09PSAnfScgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaW5wdXRfY2hhciAhPT0gJz4nKTtcblxuICAgICAgICAgICAgICAgIHZhciB0YWdfY29tcGxldGUgPSBjb250ZW50LmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIHZhciB0YWdfaW5kZXg7XG4gICAgICAgICAgICAgICAgdmFyIHRhZ19vZmZzZXQ7XG5cbiAgICAgICAgICAgICAgICBpZiAodGFnX2NvbXBsZXRlLmluZGV4T2YoJyAnKSAhPT0gLTEpIHsgLy9pZiB0aGVyZSdzIHdoaXRlc3BhY2UsIHRoYXRzIHdoZXJlIHRoZSB0YWcgbmFtZSBlbmRzXG4gICAgICAgICAgICAgICAgICAgIHRhZ19pbmRleCA9IHRhZ19jb21wbGV0ZS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YWdfY29tcGxldGVbMF0gPT09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICB0YWdfaW5kZXggPSB0YWdfY29tcGxldGUuaW5kZXhPZignfScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vb3RoZXJ3aXNlIGdvIHdpdGggdGhlIHRhZyBlbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgdGFnX2luZGV4ID0gdGFnX2NvbXBsZXRlLmluZGV4T2YoJz4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRhZ19jb21wbGV0ZVswXSA9PT0gJzwnIHx8ICFpbmRlbnRfaGFuZGxlYmFycykge1xuICAgICAgICAgICAgICAgICAgICB0YWdfb2Zmc2V0ID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YWdfb2Zmc2V0ID0gdGFnX2NvbXBsZXRlWzJdID09PSAnIycgPyAzIDogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRhZ19jaGVjayA9IHRhZ19jb21wbGV0ZS5zdWJzdHJpbmcodGFnX29mZnNldCwgdGFnX2luZGV4KS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmICh0YWdfY29tcGxldGUuY2hhckF0KHRhZ19jb21wbGV0ZS5sZW5ndGggLSAyKSA9PT0gJy8nIHx8XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrLCB0aGlzLlV0aWxzLnNpbmdsZV90b2tlbikpIHsgLy9pZiB0aGlzIHRhZyBuYW1lIGlzIGEgc2luZ2xlIHRhZyB0eXBlIChlaXRoZXIgaW4gdGhlIGxpc3Qgb3IgaGFzIGEgY2xvc2luZyAvKVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0lOR0xFJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgdGFnX2NvbXBsZXRlWzBdID09PSAneycgJiYgdGFnX2NoZWNrID09PSAnZWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF90b190YWcoJ2lmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ0hBTkRMRUJBUlNfRUxTRSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9jb250ZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzX3VuZm9ybWF0dGVkKHRhZ19jaGVjaywgdW5mb3JtYXR0ZWQpKSB7IC8vIGRvIG5vdCByZWZvcm1hdCB0aGUgXCJ1bmZvcm1hdHRlZFwiIHRhZ3NcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKCc8LycgKyB0YWdfY2hlY2sgKyAnPicsIHRhZ19jb21wbGV0ZSk7IC8vLi4uZGVsZWdhdGUgdG8gZ2V0X3VuZm9ybWF0dGVkIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQucHVzaChjb21tZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGFnX2VuZCA9IHRoaXMucG9zIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTSU5HTEUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFnX2NoZWNrID09PSAnc2NyaXB0JyAmJlxuICAgICAgICAgICAgICAgICAgICAodGFnX2NvbXBsZXRlLnNlYXJjaCgndHlwZScpID09PSAtMSB8fFxuICAgICAgICAgICAgICAgICAgICAodGFnX2NvbXBsZXRlLnNlYXJjaCgndHlwZScpID4gLTEgJiZcbiAgICAgICAgICAgICAgICAgICAgdGFnX2NvbXBsZXRlLnNlYXJjaCgvXFxiKHRleHR8YXBwbGljYXRpb24pXFwvKHgtKT8oamF2YXNjcmlwdHxlY21hc2NyaXB0fGpzY3JpcHR8bGl2ZXNjcmlwdCkvKSA+IC0xKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlY29yZF90YWcodGFnX2NoZWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0NSSVBUJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFnX2NoZWNrID09PSAnc3R5bGUnICYmXG4gICAgICAgICAgICAgICAgICAgICh0YWdfY29tcGxldGUuc2VhcmNoKCd0eXBlJykgPT09IC0xIHx8XG4gICAgICAgICAgICAgICAgICAgICh0YWdfY29tcGxldGUuc2VhcmNoKCd0eXBlJykgPiAtMSAmJiB0YWdfY29tcGxldGUuc2VhcmNoKCd0ZXh0L2NzcycpID4gLTEpKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkX3RhZyh0YWdfY2hlY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTVFlMRSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhZ19jaGVjay5jaGFyQXQoMCkgPT09ICchJykgeyAvL3BlZWsgZm9yIDwhIGNvbW1lbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yIGNvbW1lbnRzIGNvbnRlbnQgaXMgYWxyZWFkeSBjb3JyZWN0LlxuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0lOR0xFJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFnX2NoZWNrLmNoYXJBdCgwKSA9PT0gJy8nKSB7IC8vdGhpcyB0YWcgaXMgYSBkb3VibGUgdGFnIHNvIGNoZWNrIGZvciB0YWctZW5kaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJldHJpZXZlX3RhZyh0YWdfY2hlY2suc3Vic3RyaW5nKDEpKTsgLy9yZW1vdmUgaXQgYW5kIGFsbCBhbmNlc3RvcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnRU5EJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9vdGhlcndpc2UgaXQncyBhIHN0YXJ0LXRhZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRfdGFnKHRhZ19jaGVjayk7IC8vcHVzaCBpdCBvbiB0aGUgdGFnIHN0YWNrXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFnX2NoZWNrLnRvTG93ZXJDYXNlKCkgIT09ICdodG1sJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2NvbnRlbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTVEFSVCc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBwcmVzZXJ2aW5nIG9mIG5ld2xpbmVzIGFmdGVyIGEgc3RhcnQgb3IgZW5kIHRhZ1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLlV0aWxzLmluX2FycmF5KHRhZ19jaGVjaywgdGhpcy5VdGlscy5leHRyYV9saW5lcnMpKSB7IC8vY2hlY2sgaWYgdGhpcyBkb3VibGUgbmVlZHMgYW4gZXh0cmEgbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKGZhbHNlLCB0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdXRwdXQubGVuZ3RoICYmIHRoaXMub3V0cHV0W3RoaXMub3V0cHV0Lmxlbmd0aCAtIDJdICE9PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZSh0cnVlLCB0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGVlaykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IG9yaWdfcG9zO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IG9yaWdfbGluZV9jaGFyX2NvdW50O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50LmpvaW4oJycpOyAvL3JldHVybnMgZnVsbHkgZm9ybWF0dGVkIHRhZ1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfY29tbWVudCA9IGZ1bmN0aW9uKHN0YXJ0X3BvcykgeyAvL2Z1bmN0aW9uIHRvIHJldHVybiBjb21tZW50IGNvbnRlbnQgaW4gaXRzIGVudGlyZXR5XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyB3aWxsIGhhdmUgdmVyeSBwb29yIHBlcmYsIGJ1dCB3aWxsIHdvcmsgZm9yIG5vdy5cbiAgICAgICAgICAgICAgICB2YXIgY29tbWVudCA9ICcnLFxuICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnPicsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIHRoaXMucG9zID0gc3RhcnRfcG9zO1xuICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcblxuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLnBvcyA8PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGlucHV0X2NoYXI7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIGNoZWNrIGZvciB0aGUgZGVsaW1pdGVyIGlmIHRoZSBsYXN0IGNoYXJzIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21tZW50W2NvbW1lbnQubGVuZ3RoIC0gMV0gPT09IGRlbGltaXRlcltkZWxpbWl0ZXIubGVuZ3RoIC0gMV0gJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQuaW5kZXhPZihkZWxpbWl0ZXIpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gc2VhcmNoIGZvciBjdXN0b20gZGVsaW1pdGVyIGZvciB0aGUgZmlyc3QgZmV3IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaGVkICYmIGNvbW1lbnQubGVuZ3RoIDwgMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21tZW50LmluZGV4T2YoJzwhW2lmJykgPT09IDApIHsgLy9wZWVrIGZvciA8IVtpZiBjb25kaXRpb25hbCBjb21tZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gJzwhW2VuZGlmXT4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tZW50LmluZGV4T2YoJzwhW2NkYXRhWycpID09PSAwKSB7IC8vaWYgaXQncyBhIDxbY2RhdGFbIGNvbW1lbnQuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnXV0+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tbWVudC5pbmRleE9mKCc8IVsnKSA9PT0gMCkgeyAvLyBzb21lIG90aGVyICFbIGNvbW1lbnQ/IC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9ICddPic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1lbnQuaW5kZXhPZignPCEtLScpID09PSAwKSB7IC8vIDwhLS0gY29tbWVudCAuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnLS0+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbW1lbnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF91bmZvcm1hdHRlZCA9IGZ1bmN0aW9uKGRlbGltaXRlciwgb3JpZ190YWcpIHsgLy9mdW5jdGlvbiB0byByZXR1cm4gdW5mb3JtYXR0ZWQgY29udGVudCBpbiBpdHMgZW50aXJldHlcblxuICAgICAgICAgICAgICAgIGlmIChvcmlnX3RhZyAmJiBvcmlnX3RhZy50b0xvd2VyQ2FzZSgpLmluZGV4T2YoZGVsaW1pdGVyKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnO1xuICAgICAgICAgICAgICAgIHZhciBjb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgdmFyIG1pbl9pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgdmFyIHNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkbyB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuVXRpbHMuaW5fYXJyYXkoaW5wdXRfY2hhciwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzcGFjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50LS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gJ1xcbicgfHwgaW5wdXRfY2hhciA9PT0gJ1xccicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qICBEb24ndCBjaGFuZ2UgdGFiIGluZGVudGlvbiBmb3IgdW5mb3JtYXR0ZWQgYmxvY2tzLiAgSWYgdXNpbmcgY29kZSBmb3IgaHRtbCBlZGl0aW5nLCB0aGlzIHdpbGwgZ3JlYXRseSBhZmZlY3QgPHByZT4gdGFncyBpZiB0aGV5IGFyZSBzcGVjaWZpZWQgaW4gdGhlICd1bmZvcm1hdHRlZCBhcnJheSdcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8dGhpcy5pbmRlbnRfbGV2ZWw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgY29udGVudCArPSB0aGlzLmluZGVudF9zdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7IC8vLi4uYW5kIG1ha2Ugc3VyZSBvdGhlciBpbmRlbnRhdGlvbiBpcyBlcmFzZWRcbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGlucHV0X2NoYXI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIHNwYWNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgaW5wdXRfY2hhciA9PT0gJ3snICYmIGNvbnRlbnQubGVuZ3RoICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAyXSA9PT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGViYXJzIGV4cHJlc3Npb25zIGluIHN0cmluZ3Mgc2hvdWxkIGFsc28gYmUgdW5mb3JtYXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKCd9fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlc2UgZXhwcmVzc2lvbnMgYXJlIG9wYXF1ZS4gIElnbm9yZSBkZWxpbWl0ZXJzIGZvdW5kIGluIHRoZW0uXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5faW5kZXggPSBjb250ZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmRleE9mKGRlbGltaXRlciwgbWluX2luZGV4KSA9PT0gLTEpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfdG9rZW4gPSBmdW5jdGlvbigpIHsgLy9pbml0aWFsIGhhbmRsZXIgZm9yIHRva2VuLXJldHJpZXZhbFxuICAgICAgICAgICAgICAgIHZhciB0b2tlbjtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhc3RfdG9rZW4gPT09ICdUS19UQUdfU0NSSVBUJyB8fCB0aGlzLmxhc3RfdG9rZW4gPT09ICdUS19UQUdfU1RZTEUnKSB7IC8vY2hlY2sgaWYgd2UgbmVlZCB0byBmb3JtYXQgamF2YXNjcmlwdFxuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IHRoaXMubGFzdF90b2tlbi5zdWJzdHIoNyk7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuID0gdGhpcy5nZXRfY29udGVudHNfdG8odHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0b2tlbiwgJ1RLXycgKyB0eXBlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9tb2RlID09PSAnQ09OVEVOVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLmdldF9jb250ZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3Rva2VuLCAnVEtfQ09OVEVOVCddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9tb2RlID09PSAnVEFHJykge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRoaXMuZ2V0X3RhZygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ19uYW1lX3R5cGUgPSAnVEtfVEFHXycgKyB0aGlzLnRhZ190eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0b2tlbiwgdGFnX25hbWVfdHlwZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9mdWxsX2luZGVudCA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gICAgICAgICAgICAgICAgbGV2ZWwgPSB0aGlzLmluZGVudF9sZXZlbCArIGxldmVsIHx8IDA7XG4gICAgICAgICAgICAgICAgaWYgKGxldmVsIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIEFycmF5KGxldmVsICsgMSkuam9pbih0aGlzLmluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5pc191bmZvcm1hdHRlZCA9IGZ1bmN0aW9uKHRhZ19jaGVjaywgdW5mb3JtYXR0ZWQpIHtcbiAgICAgICAgICAgICAgICAvL2lzIHRoaXMgYW4gSFRNTDUgYmxvY2stbGV2ZWwgbGluaz9cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrLCB1bmZvcm1hdHRlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0YWdfY2hlY2sudG9Mb3dlckNhc2UoKSAhPT0gJ2EnIHx8ICF0aGlzLlV0aWxzLmluX2FycmF5KCdhJywgdW5mb3JtYXR0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vYXQgdGhpcyBwb2ludCB3ZSBoYXZlIGFuICB0YWc7IGlzIGl0cyBmaXJzdCBjaGlsZCBzb21ldGhpbmcgd2Ugd2FudCB0byByZW1haW5cbiAgICAgICAgICAgICAgICAvL3VuZm9ybWF0dGVkP1xuICAgICAgICAgICAgICAgIHZhciBuZXh0X3RhZyA9IHRoaXMuZ2V0X3RhZyh0cnVlIC8qIHBlZWsuICovICk7XG5cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IG5leHRfdGFnIHRvIHNlZSBpZiBpdCBpcyBqdXN0IGh0bWwgdGFnIChubyBleHRlcm5hbCBjb250ZW50KVxuICAgICAgICAgICAgICAgIHZhciB0YWcgPSAobmV4dF90YWcgfHwgXCJcIikubWF0Y2goL15cXHMqPFxccypcXC8/KFthLXpdKilcXHMqW14+XSo+XFxzKiQvKTtcblxuICAgICAgICAgICAgICAgIC8vIGlmIG5leHRfdGFnIGNvbWVzIGJhY2sgYnV0IGlzIG5vdCBhbiBpc29sYXRlZCB0YWcsIHRoZW5cbiAgICAgICAgICAgICAgICAvLyBsZXQncyB0cmVhdCB0aGUgJ2EnIHRhZyBhcyBoYXZpbmcgY29udGVudFxuICAgICAgICAgICAgICAgIC8vIGFuZCByZXNwZWN0IHRoZSB1bmZvcm1hdHRlZCBvcHRpb25cbiAgICAgICAgICAgICAgICBpZiAoIXRhZyB8fCB0aGlzLlV0aWxzLmluX2FycmF5KHRhZywgdW5mb3JtYXR0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnByaW50ZXIgPSBmdW5jdGlvbihqc19zb3VyY2UsIGluZGVudF9jaGFyYWN0ZXIsIGluZGVudF9zaXplLCB3cmFwX2xpbmVfbGVuZ3RoLCBicmFjZV9zdHlsZSkgeyAvL2hhbmRsZXMgaW5wdXQvb3V0cHV0IGFuZCBzb21lIG90aGVyIHByaW50aW5nIGZ1bmN0aW9uc1xuXG4gICAgICAgICAgICAgICAgdGhpcy5pbnB1dCA9IGpzX3NvdXJjZSB8fCAnJzsgLy9nZXRzIHRoZSBpbnB1dCBmb3IgdGhlIFBhcnNlclxuICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0ID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfY2hhcmFjdGVyID0gaW5kZW50X2NoYXJhY3RlcjtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9zdHJpbmcgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9zaXplID0gaW5kZW50X3NpemU7XG4gICAgICAgICAgICAgICAgdGhpcy5icmFjZV9zdHlsZSA9IGJyYWNlX3N0eWxlO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBfbGluZV9sZW5ndGggPSB3cmFwX2xpbmVfbGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gMDsgLy9jb3VudCB0byBzZWUgaWYgd3JhcF9saW5lX2xlbmd0aCB3YXMgZXhjZWVkZWRcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5pbmRlbnRfc2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X3N0cmluZyArPSB0aGlzLmluZGVudF9jaGFyYWN0ZXI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lID0gZnVuY3Rpb24oZm9yY2UsIGFycikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJyIHx8ICFhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGZvcmNlIHx8IChhcnJbYXJyLmxlbmd0aCAtIDFdICE9PSAnXFxuJykpIHsgLy93ZSBtaWdodCB3YW50IHRoZSBleHRyYSBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGFyclthcnIubGVuZ3RoIC0gMV0gIT09ICdcXG4nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclthcnIubGVuZ3RoIC0gMV0gPSBydHJpbShhcnJbYXJyLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGFyci5wdXNoKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLnByaW50X2luZGVudGF0aW9uID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5pbmRlbnRfbGV2ZWw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJyLnB1c2godGhpcy5pbmRlbnRfc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ICs9IHRoaXMuaW5kZW50X3N0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludF90b2tlbiA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgcHJpbnRpbmcgaW5pdGlhbCB3aGl0ZXNwYWNlLlxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc193aGl0ZXNwYWNlKHRleHQpICYmICF0aGlzLm91dHB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dCB8fCB0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3V0cHV0Lmxlbmd0aCAmJiB0aGlzLm91dHB1dFt0aGlzLm91dHB1dC5sZW5ndGggLSAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X2luZGVudGF0aW9uKHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gbHRyaW0odGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF90b2tlbl9yYXcodGV4dCk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfdG9rZW5fcmF3ID0gZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgZ29pbmcgdG8gcHJpbnQgbmV3bGluZXMsIHRydW5jYXRlIHRyYWlsaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoaXRlc3BhY2UsIGFzIHRoZSBuZXdsaW5lcyB3aWxsIHJlcHJlc2VudCB0aGUgc3BhY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5ld2xpbmVzID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCA9IHJ0cmltKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQgJiYgdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA+IDEgJiYgdGV4dFt0ZXh0Lmxlbmd0aCAtIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVuZm9ybWF0dGVkIHRhZ3MgY2FuIGdyYWIgbmV3bGluZXMgYXMgdGhlaXIgbGFzdCBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5wdXNoKHRleHQuc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUoZmFsc2UsIHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vdXRwdXQucHVzaCh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgdGhpcy5uZXdsaW5lczsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUobiA+IDAsIHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5ld2xpbmVzID0gMDtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfbGV2ZWwrKztcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy51bmluZGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRlbnRfbGV2ZWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbC0tO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qX19fX19fX19fX19fX19fX19fX19fLS0tLS0tLS0tLS0tLS0tLS0tLS1fX19fX19fX19fX19fX19fX19fX18qL1xuXG4gICAgICAgIG11bHRpX3BhcnNlciA9IG5ldyBQYXJzZXIoKTsgLy93cmFwcGluZyBmdW5jdGlvbnMgUGFyc2VyXG4gICAgICAgIG11bHRpX3BhcnNlci5wcmludGVyKGh0bWxfc291cmNlLCBpbmRlbnRfY2hhcmFjdGVyLCBpbmRlbnRfc2l6ZSwgd3JhcF9saW5lX2xlbmd0aCwgYnJhY2Vfc3R5bGUpOyAvL2luaXRpYWxpemUgc3RhcnRpbmcgdmFsdWVzXG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciB0ID0gbXVsdGlfcGFyc2VyLmdldF90b2tlbigpO1xuICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnRva2VuX3RleHQgPSB0WzBdO1xuICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPSB0WzFdO1xuXG4gICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPT09ICdUS19FT0YnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfU1RBUlQnOlxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIuaW5kZW50X2NvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5pbmRlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5pbmRlbnRfY29udGVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19TVFlMRSc6XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX1NDUklQVCc6XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX0VORCc6XG4gICAgICAgICAgICAgICAgICAgIC8vUHJpbnQgbmV3IGxpbmUgb25seSBpZiB0aGUgdGFnIGhhcyBubyBjb250ZW50IGFuZCBoYXMgY2hpbGRcbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci5sYXN0X3Rva2VuID09PSAnVEtfQ09OVEVOVCcgJiYgbXVsdGlfcGFyc2VyLmxhc3RfdGV4dCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWdfbmFtZSA9IG11bHRpX3BhcnNlci50b2tlbl90ZXh0Lm1hdGNoKC9cXHcrLylbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFnX2V4dHJhY3RlZF9mcm9tX2xhc3Rfb3V0cHV0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIub3V0cHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dCA9IG11bHRpX3BhcnNlci5vdXRwdXRbbXVsdGlfcGFyc2VyLm91dHB1dC5sZW5ndGggLSAxXS5tYXRjaCgvKD86PHx7eyMpXFxzKihcXHcrKS8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dCA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dFsxXSAhPT0gdGFnX25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX1NJTkdMRSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIERvbid0IGFkZCBhIG5ld2xpbmUgYmVmb3JlIGVsZW1lbnRzIHRoYXQgc2hvdWxkIHJlbWFpbiB1bmZvcm1hdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ19jaGVjayA9IG11bHRpX3BhcnNlci50b2tlbl90ZXh0Lm1hdGNoKC9eXFxzKjwoW2Etei1dKykvaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFnX2NoZWNrIHx8ICFtdWx0aV9wYXJzZXIuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrWzFdLCB1bmZvcm1hdHRlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfSEFORExFQkFSU19FTFNFJzpcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci5pbmRlbnRfY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmluZGVudF9jb250ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfQ09OVEVOVCc6XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnVEFHJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfU1RZTEUnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1NDUklQVCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gbXVsdGlfcGFyc2VyLnRva2VuX3RleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2JlYXV0aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0X2luZGVudF9sZXZlbCA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPT09ICdUS19TQ1JJUFQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2JlYXV0aWZpZXIgPSB0eXBlb2YganNfYmVhdXRpZnkgPT09ICdmdW5jdGlvbicgJiYganNfYmVhdXRpZnk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG11bHRpX3BhcnNlci50b2tlbl90eXBlID09PSAnVEtfU1RZTEUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2JlYXV0aWZpZXIgPSB0eXBlb2YgY3NzX2JlYXV0aWZ5ID09PSAnZnVuY3Rpb24nICYmIGNzc19iZWF1dGlmeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW5kZW50X3NjcmlwdHMgPT09IFwia2VlcFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0X2luZGVudF9sZXZlbCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaW5kZW50X3NjcmlwdHMgPT09IFwic2VwYXJhdGVcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdF9pbmRlbnRfbGV2ZWwgPSAtbXVsdGlfcGFyc2VyLmluZGVudF9sZXZlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZGVudGF0aW9uID0gbXVsdGlfcGFyc2VyLmdldF9mdWxsX2luZGVudChzY3JpcHRfaW5kZW50X2xldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfYmVhdXRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbGwgdGhlIEJlYXV0aWZpZXIgaWYgYXZhbGlhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCA9IF9iZWF1dGlmaWVyKHRleHQucmVwbGFjZSgvXlxccyovLCBpbmRlbnRhdGlvbiksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW1wbHkgaW5kZW50IHRoZSBzdHJpbmcgb3RoZXJ3aXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdoaXRlID0gdGV4dC5tYXRjaCgvXlxccyovKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2xldmVsID0gd2hpdGUubWF0Y2goL1teXFxuXFxyXSokLylbMF0uc3BsaXQobXVsdGlfcGFyc2VyLmluZGVudF9zdHJpbmcpLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlaW5kZW50ID0gbXVsdGlfcGFyc2VyLmdldF9mdWxsX2luZGVudChzY3JpcHRfaW5kZW50X2xldmVsIC0gX2xldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxzKi8sIGluZGVudGF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxyXFxufFxccnxcXG4vZywgJ1xcbicgKyByZWluZGVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xccyskLywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW5fcmF3KHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKHRydWUsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnVEFHJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgLy8gV2Ugc2hvdWxkIG5vdCBiZSBnZXR0aW5nIGhlcmUgYnV0IHdlIGRvbid0IHdhbnQgdG8gZHJvcCBpbnB1dCBvbiB0aGUgZmxvb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gSnVzdCBvdXRwdXQgdGhlIHRleHQgYW5kIG1vdmUgb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci50b2tlbl90ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG11bHRpX3BhcnNlci5sYXN0X3Rva2VuID0gbXVsdGlfcGFyc2VyLnRva2VuX3R5cGU7XG4gICAgICAgICAgICBtdWx0aV9wYXJzZXIubGFzdF90ZXh0ID0gbXVsdGlfcGFyc2VyLnRva2VuX3RleHQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN3ZWV0X2NvZGUgPSBtdWx0aV9wYXJzZXIub3V0cHV0LmpvaW4oJycpLnJlcGxhY2UoL1tcXHJcXG5cXHQgXSskLywgJycpO1xuICAgICAgICBpZiAoZW5kX3dpdGhfbmV3bGluZSkge1xuICAgICAgICAgICAgc3dlZXRfY29kZSArPSAnXFxuJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3dlZXRfY29kZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiLi9iZWF1dGlmeVwiLCBcIi4vYmVhdXRpZnktY3NzXCJdLCBmdW5jdGlvbihyZXF1aXJlYW1kKSB7XG4gICAgICAgICAgICB2YXIganNfYmVhdXRpZnkgPSAgcmVxdWlyZWFtZChcIi4vYmVhdXRpZnlcIik7XG4gICAgICAgICAgICB2YXIgY3NzX2JlYXV0aWZ5ID0gIHJlcXVpcmVhbWQoXCIuL2JlYXV0aWZ5LWNzc1wiKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaHRtbF9iZWF1dGlmeTogZnVuY3Rpb24oaHRtbF9zb3VyY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywganNfYmVhdXRpZnkuanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBDb21tb25KUy4gSnVzdCBwdXQgdGhpcyBmaWxlIHNvbWV3aGVyZSBvbiB5b3VyIHJlcXVpcmUucGF0aHNcbiAgICAgICAgLy8gYW5kIHlvdSB3aWxsIGJlIGFibGUgdG8gYHZhciBodG1sX2JlYXV0aWZ5ID0gcmVxdWlyZShcImJlYXV0aWZ5XCIpLmh0bWxfYmVhdXRpZnlgLlxuICAgICAgICB2YXIganNfYmVhdXRpZnkgPSByZXF1aXJlKCcuL2JlYXV0aWZ5LmpzJyk7XG4gICAgICAgIHZhciBjc3NfYmVhdXRpZnkgPSByZXF1aXJlKCcuL2JlYXV0aWZ5LWNzcy5qcycpO1xuXG4gICAgICAgIGV4cG9ydHMuaHRtbF9iZWF1dGlmeSA9IGZ1bmN0aW9uKGh0bWxfc291cmNlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywganNfYmVhdXRpZnkuanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnkpO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSdyZSBydW5uaW5nIGEgd2ViIHBhZ2UgYW5kIGRvbid0IGhhdmUgZWl0aGVyIG9mIHRoZSBhYm92ZSwgYWRkIG91ciBvbmUgZ2xvYmFsXG4gICAgICAgIHdpbmRvdy5odG1sX2JlYXV0aWZ5ID0gZnVuY3Rpb24oaHRtbF9zb3VyY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zLCB3aW5kb3cuanNfYmVhdXRpZnksIHdpbmRvdy5jc3NfYmVhdXRpZnkpO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSBkb24ndCBldmVuIGhhdmUgd2luZG93LCB0cnkgZ2xvYmFsLlxuICAgICAgICBnbG9iYWwuaHRtbF9iZWF1dGlmeSA9IGZ1bmN0aW9uKGh0bWxfc291cmNlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywgZ2xvYmFsLmpzX2JlYXV0aWZ5LCBnbG9iYWwuY3NzX2JlYXV0aWZ5KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2hpbnQgY3VybHk6dHJ1ZSwgZXFlcWVxOnRydWUsIGxheGJyZWFrOnRydWUsIG5vZW1wdHk6ZmFsc2UgKi9cbi8qXG5cbiAgVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiAgQ29weXJpZ2h0IChjKSAyMDA3LTIwMTMgRWluYXIgTGllbG1hbmlzIGFuZCBjb250cmlidXRvcnMuXG5cbiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAgb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXNcbiAgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuICBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0ZcbiAgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkRcbiAgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSU1xuICBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbiAgQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU5cbiAgQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICBTT0ZUV0FSRS5cblxuIEpTIEJlYXV0aWZpZXJcbi0tLS0tLS0tLS0tLS0tLVxuXG5cbiAgV3JpdHRlbiBieSBFaW5hciBMaWVsbWFuaXMsIDxlaW5hckBqc2JlYXV0aWZpZXIub3JnPlxuICAgICAgaHR0cDovL2pzYmVhdXRpZmllci5vcmcvXG5cbiAgT3JpZ2luYWxseSBjb252ZXJ0ZWQgdG8gamF2YXNjcmlwdCBieSBWaXRhbCwgPHZpdGFsNzZAZ21haWwuY29tPlxuICBcIkVuZCBicmFjZXMgb24gb3duIGxpbmVcIiBhZGRlZCBieSBDaHJpcyBKLiBTaHVsbCwgPGNocmlzanNodWxsQGdtYWlsLmNvbT5cbiAgUGFyc2luZyBpbXByb3ZlbWVudHMgZm9yIGJyYWNlLWxlc3Mgc3RhdGVtZW50cyBieSBMaWFtIE5ld21hbiA8Yml0d2lzZW1hbkBnbWFpbC5jb20+XG5cblxuICBVc2FnZTpcbiAgICBqc19iZWF1dGlmeShqc19zb3VyY2VfdGV4dCk7XG4gICAganNfYmVhdXRpZnkoanNfc291cmNlX3RleHQsIG9wdGlvbnMpO1xuXG4gIFRoZSBvcHRpb25zIGFyZTpcbiAgICBpbmRlbnRfc2l6ZSAoZGVmYXVsdCA0KSAgICAgICAgICAtIGluZGVudGF0aW9uIHNpemUsXG4gICAgaW5kZW50X2NoYXIgKGRlZmF1bHQgc3BhY2UpICAgICAgLSBjaGFyYWN0ZXIgdG8gaW5kZW50IHdpdGgsXG4gICAgcHJlc2VydmVfbmV3bGluZXMgKGRlZmF1bHQgdHJ1ZSkgLSB3aGV0aGVyIGV4aXN0aW5nIGxpbmUgYnJlYWtzIHNob3VsZCBiZSBwcmVzZXJ2ZWQsXG4gICAgbWF4X3ByZXNlcnZlX25ld2xpbmVzIChkZWZhdWx0IHVubGltaXRlZCkgLSBtYXhpbXVtIG51bWJlciBvZiBsaW5lIGJyZWFrcyB0byBiZSBwcmVzZXJ2ZWQgaW4gb25lIGNodW5rLFxuXG4gICAganNsaW50X2hhcHB5IChkZWZhdWx0IGZhbHNlKSAtIGlmIHRydWUsIHRoZW4ganNsaW50LXN0cmljdGVyIG1vZGUgaXMgZW5mb3JjZWQuXG5cbiAgICAgICAgICAgIGpzbGludF9oYXBweSAgICAgICAgIWpzbGludF9oYXBweVxuICAgICAgICAgICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSAgICAgICAgIGZ1bmN0aW9uKClcblxuICAgICAgICAgICAgc3dpdGNoICgpIHsgICAgICAgICBzd2l0Y2goKSB7XG4gICAgICAgICAgICBjYXNlIDE6ICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICBicmVhazsgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgIH1cblxuICAgIHNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gKGRlZmF1bHQgZmFsc2UpIC0gc2hvdWxkIHRoZSBzcGFjZSBiZWZvcmUgYW4gYW5vbnltb3VzIGZ1bmN0aW9uJ3MgcGFyZW5zIGJlIGFkZGVkLCBcImZ1bmN0aW9uKClcIiB2cyBcImZ1bmN0aW9uICgpXCIsXG4gICAgICAgICAgTk9URTogVGhpcyBvcHRpb24gaXMgb3ZlcnJpZGVuIGJ5IGpzbGludF9oYXBweSAoaS5lLiBpZiBqc2xpbnRfaGFwcHkgaXMgdHJ1ZSwgc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiBpcyB0cnVlIGJ5IGRlc2lnbilcblxuICAgIGJyYWNlX3N0eWxlIChkZWZhdWx0IFwiY29sbGFwc2VcIikgLSBcImNvbGxhcHNlXCIgfCBcImV4cGFuZFwiIHwgXCJlbmQtZXhwYW5kXCJcbiAgICAgICAgICAgIHB1dCBicmFjZXMgb24gdGhlIHNhbWUgbGluZSBhcyBjb250cm9sIHN0YXRlbWVudHMgKGRlZmF1bHQpLCBvciBwdXQgYnJhY2VzIG9uIG93biBsaW5lIChBbGxtYW4gLyBBTlNJIHN0eWxlKSwgb3IganVzdCBwdXQgZW5kIGJyYWNlcyBvbiBvd24gbGluZS5cblxuICAgIHNwYWNlX2JlZm9yZV9jb25kaXRpb25hbCAoZGVmYXVsdCB0cnVlKSAtIHNob3VsZCB0aGUgc3BhY2UgYmVmb3JlIGNvbmRpdGlvbmFsIHN0YXRlbWVudCBiZSBhZGRlZCwgXCJpZih0cnVlKVwiIHZzIFwiaWYgKHRydWUpXCIsXG5cbiAgICB1bmVzY2FwZV9zdHJpbmdzIChkZWZhdWx0IGZhbHNlKSAtIHNob3VsZCBwcmludGFibGUgY2hhcmFjdGVycyBpbiBzdHJpbmdzIGVuY29kZWQgaW4gXFx4Tk4gbm90YXRpb24gYmUgdW5lc2NhcGVkLCBcImV4YW1wbGVcIiB2cyBcIlxceDY1XFx4NzhcXHg2MVxceDZkXFx4NzBcXHg2Y1xceDY1XCJcblxuICAgIHdyYXBfbGluZV9sZW5ndGggKGRlZmF1bHQgdW5saW1pdGVkKSAtIGxpbmVzIHNob3VsZCB3cmFwIGF0IG5leHQgb3Bwb3J0dW5pdHkgYWZ0ZXIgdGhpcyBudW1iZXIgb2YgY2hhcmFjdGVycy5cbiAgICAgICAgICBOT1RFOiBUaGlzIGlzIG5vdCBhIGhhcmQgbGltaXQuIExpbmVzIHdpbGwgY29udGludWUgdW50aWwgYSBwb2ludCB3aGVyZSBhIG5ld2xpbmUgd291bGRcbiAgICAgICAgICAgICAgICBiZSBwcmVzZXJ2ZWQgaWYgaXQgd2VyZSBwcmVzZW50LlxuXG4gICAgZW5kX3dpdGhfbmV3bGluZSAoZGVmYXVsdCBmYWxzZSkgIC0gZW5kIG91dHB1dCB3aXRoIGEgbmV3bGluZVxuXG5cbiAgICBlLmdcblxuICAgIGpzX2JlYXV0aWZ5KGpzX3NvdXJjZV90ZXh0LCB7XG4gICAgICAnaW5kZW50X3NpemUnOiAxLFxuICAgICAgJ2luZGVudF9jaGFyJzogJ1xcdCdcbiAgICB9KTtcblxuKi9cblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGFjb3JuID0ge307XG4gICAgKGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gICAgICAvLyBUaGlzIHNlY3Rpb24gb2YgY29kZSBpcyB0YWtlbiBmcm9tIGFjb3JuLlxuICAgICAgLy9cbiAgICAgIC8vIEFjb3JuIHdhcyB3cml0dGVuIGJ5IE1hcmlqbiBIYXZlcmJla2UgYW5kIHJlbGVhc2VkIHVuZGVyIGFuIE1JVFxuICAgICAgLy8gbGljZW5zZS4gVGhlIFVuaWNvZGUgcmVnZXhwcyAoZm9yIGlkZW50aWZpZXJzIGFuZCB3aGl0ZXNwYWNlKSB3ZXJlXG4gICAgICAvLyB0YWtlbiBmcm9tIFtFc3ByaW1hXShodHRwOi8vZXNwcmltYS5vcmcpIGJ5IEFyaXlhIEhpZGF5YXQuXG4gICAgICAvL1xuICAgICAgLy8gR2l0IHJlcG9zaXRvcmllcyBmb3IgQWNvcm4gYXJlIGF2YWlsYWJsZSBhdFxuICAgICAgLy9cbiAgICAgIC8vICAgICBodHRwOi8vbWFyaWpuaGF2ZXJiZWtlLm5sL2dpdC9hY29yblxuICAgICAgLy8gICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJpam5oL2Fjb3JuLmdpdFxuXG4gICAgICAvLyAjIyBDaGFyYWN0ZXIgY2F0ZWdvcmllc1xuXG4gICAgICAvLyBCaWcgdWdseSByZWd1bGFyIGV4cHJlc3Npb25zIHRoYXQgbWF0Y2ggY2hhcmFjdGVycyBpbiB0aGVcbiAgICAgIC8vIHdoaXRlc3BhY2UsIGlkZW50aWZpZXIsIGFuZCBpZGVudGlmaWVyLXN0YXJ0IGNhdGVnb3JpZXMuIFRoZXNlXG4gICAgICAvLyBhcmUgb25seSBhcHBsaWVkIHdoZW4gYSBjaGFyYWN0ZXIgaXMgZm91bmQgdG8gYWN0dWFsbHkgaGF2ZSBhXG4gICAgICAvLyBjb2RlIHBvaW50IGFib3ZlIDEyOC5cblxuICAgICAgdmFyIG5vbkFTQ0lJd2hpdGVzcGFjZSA9IC9bXFx1MTY4MFxcdTE4MGVcXHUyMDAwLVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmXS87XG4gICAgICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyA9IFwiXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk3N1xcdTA5NzktXFx1MDk3ZlxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZFxcdTBjNThcXHUwYzU5XFx1MGM2MFxcdTBjNjFcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNjBcXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmMFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YzEtXFx1MTljN1xcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjk3XFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE4MC1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYmMwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcIjtcbiAgICAgIHZhciBub25BU0NJSWlkZW50aWZpZXJDaGFycyA9IFwiXFx1MDMwMC1cXHUwMzZmXFx1MDQ4My1cXHUwNDg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDYxMC1cXHUwNjFhXFx1MDYyMC1cXHUwNjQ5XFx1MDY3Mi1cXHUwNmQzXFx1MDZlNy1cXHUwNmU4XFx1MDZmYi1cXHUwNmZjXFx1MDczMC1cXHUwNzRhXFx1MDgwMC1cXHUwODE0XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg0MC1cXHUwODU3XFx1MDhlNC1cXHUwOGZlXFx1MDkwMC1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2Mi1cXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk4MS1cXHUwOTgzXFx1MDliY1xcdTA5YmUtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDlkN1xcdTA5ZGYtXFx1MDllMFxcdTBhMDEtXFx1MGEwM1xcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTY2LVxcdTBhNzFcXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGFiY1xcdTBhYmUtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZTItXFx1MGFlM1xcdTBhZTYtXFx1MGFlZlxcdTBiMDEtXFx1MGIwM1xcdTBiM2NcXHUwYjNlLVxcdTBiNDRcXHUwYjQ3XFx1MGI0OFxcdTBiNGItXFx1MGI0ZFxcdTBiNTZcXHUwYjU3XFx1MGI1Zi1cXHUwYjYwXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAxLVxcdTBjMDNcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjItXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODJcXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMi1cXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGQwMlxcdTBkMDNcXHUwZDQ2LVxcdTBkNDhcXHUwZDU3XFx1MGQ2Mi1cXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ4MlxcdTBkODNcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZjJcXHUwZGYzXFx1MGUzNC1cXHUwZTNhXFx1MGU0MC1cXHUwZTQ1XFx1MGU1MC1cXHUwZTU5XFx1MGViNC1cXHUwZWI5XFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjQxLVxcdTBmNDdcXHUwZjcxLVxcdTBmODRcXHUwZjg2LVxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAwMC1cXHUxMDI5XFx1MTA0MC1cXHUxMDQ5XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTcwZS1cXHUxNzEwXFx1MTcyMC1cXHUxNzMwXFx1MTc0MC1cXHUxNzUwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3YjJcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgxMC1cXHUxODE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk1MS1cXHUxOTZkXFx1MTliMC1cXHUxOWMwXFx1MTljOC1cXHUxOWM5XFx1MTlkMC1cXHUxOWQ5XFx1MWEwMC1cXHUxYTE1XFx1MWEyMC1cXHUxYTUzXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWI0Ni1cXHUxYjRiXFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMwMC1cXHUxYzIyXFx1MWM0MC1cXHUxYzQ5XFx1MWM1Yi1cXHUxYzdkXFx1MWNkMC1cXHUxY2QyXFx1MWQwMC1cXHUxZGJlXFx1MWUwMS1cXHUxZjE1XFx1MjAwY1xcdTIwMGRcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MmQ4MS1cXHUyZDk2XFx1MmRlMC1cXHUyZGZmXFx1MzAyMS1cXHUzMDI4XFx1MzA5OVxcdTMwOWFcXHVhNjQwLVxcdWE2NmRcXHVhNjc0LVxcdWE2N2RcXHVhNjlmXFx1YTZmMC1cXHVhNmYxXFx1YTdmOC1cXHVhODAwXFx1YTgwNlxcdWE4MGJcXHVhODIzLVxcdWE4MjdcXHVhODgwLVxcdWE4ODFcXHVhOGI0LVxcdWE4YzRcXHVhOGQwLVxcdWE4ZDlcXHVhOGYzLVxcdWE4ZjdcXHVhOTAwLVxcdWE5MDlcXHVhOTI2LVxcdWE5MmRcXHVhOTMwLVxcdWE5NDVcXHVhOTgwLVxcdWE5ODNcXHVhOWIzLVxcdWE5YzBcXHVhYTAwLVxcdWFhMjdcXHVhYTQwLVxcdWFhNDFcXHVhYTRjLVxcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTdiXFx1YWFlMC1cXHVhYWU5XFx1YWFmMi1cXHVhYWYzXFx1YWJjMC1cXHVhYmUxXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjIwLVxcdWZiMjhcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMjZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZmMTAtXFx1ZmYxOVxcdWZmM2ZcIjtcbiAgICAgIHZhciBub25BU0NJSWlkZW50aWZpZXJTdGFydCA9IG5ldyBSZWdFeHAoXCJbXCIgKyBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzICsgXCJdXCIpO1xuICAgICAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllciA9IG5ldyBSZWdFeHAoXCJbXCIgKyBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzICsgbm9uQVNDSUlpZGVudGlmaWVyQ2hhcnMgKyBcIl1cIik7XG5cbiAgICAgIC8vIFdoZXRoZXIgYSBzaW5nbGUgY2hhcmFjdGVyIGRlbm90ZXMgYSBuZXdsaW5lLlxuXG4gICAgICB2YXIgbmV3bGluZSA9IGV4cG9ydHMubmV3bGluZSA9IC9bXFxuXFxyXFx1MjAyOFxcdTIwMjldLztcblxuICAgICAgLy8gTWF0Y2hlcyBhIHdob2xlIGxpbmUgYnJlYWsgKHdoZXJlIENSTEYgaXMgY29uc2lkZXJlZCBhIHNpbmdsZVxuICAgICAgLy8gbGluZSBicmVhaykuIFVzZWQgdG8gY291bnQgbGluZXMuXG5cbiAgICAgIHZhciBsaW5lQnJlYWsgPSAvXFxyXFxufFtcXG5cXHJcXHUyMDI4XFx1MjAyOV0vZztcblxuICAgICAgLy8gVGVzdCB3aGV0aGVyIGEgZ2l2ZW4gY2hhcmFjdGVyIGNvZGUgc3RhcnRzIGFuIGlkZW50aWZpZXIuXG5cbiAgICAgIHZhciBpc0lkZW50aWZpZXJTdGFydCA9IGV4cG9ydHMuaXNJZGVudGlmaWVyU3RhcnQgPSBmdW5jdGlvbihjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlIDwgNjUpIHJldHVybiBjb2RlID09PSAzNjtcbiAgICAgICAgaWYgKGNvZGUgPCA5MSkgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmIChjb2RlIDwgOTcpIHJldHVybiBjb2RlID09PSA5NTtcbiAgICAgICAgaWYgKGNvZGUgPCAxMjMpcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiBjb2RlID49IDB4YWEgJiYgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFRlc3Qgd2hldGhlciBhIGdpdmVuIGNoYXJhY3RlciBpcyBwYXJ0IG9mIGFuIGlkZW50aWZpZXIuXG5cbiAgICAgIHZhciBpc0lkZW50aWZpZXJDaGFyID0gZXhwb3J0cy5pc0lkZW50aWZpZXJDaGFyID0gZnVuY3Rpb24oY29kZSkge1xuICAgICAgICBpZiAoY29kZSA8IDQ4KSByZXR1cm4gY29kZSA9PT0gMzY7XG4gICAgICAgIGlmIChjb2RlIDwgNTgpIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoY29kZSA8IDY1KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChjb2RlIDwgOTEpIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoY29kZSA8IDk3KSByZXR1cm4gY29kZSA9PT0gOTU7XG4gICAgICAgIGlmIChjb2RlIDwgMTIzKXJldHVybiB0cnVlO1xuICAgICAgICByZXR1cm4gY29kZSA+PSAweGFhICYmIG5vbkFTQ0lJaWRlbnRpZmllci50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkpO1xuICAgICAgfTtcbiAgICB9KShhY29ybik7XG5cbiAgICBmdW5jdGlvbiBpbl9hcnJheSh3aGF0LCBhcnIpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmIChhcnJbaV0gPT09IHdoYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJpbShzKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBqc19iZWF1dGlmeShqc19zb3VyY2VfdGV4dCwgb3B0aW9ucykge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgdmFyIGJlYXV0aWZpZXIgPSBuZXcgQmVhdXRpZmllcihqc19zb3VyY2VfdGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiBiZWF1dGlmaWVyLmJlYXV0aWZ5KCk7XG4gICAgfVxuXG4gICAgdmFyIE1PREUgPSB7XG4gICAgICAgICAgICBCbG9ja1N0YXRlbWVudDogJ0Jsb2NrU3RhdGVtZW50JywgLy8gJ0JMT0NLJ1xuICAgICAgICAgICAgU3RhdGVtZW50OiAnU3RhdGVtZW50JywgLy8gJ1NUQVRFTUVOVCdcbiAgICAgICAgICAgIE9iamVjdExpdGVyYWw6ICdPYmplY3RMaXRlcmFsJywgLy8gJ09CSkVDVCcsXG4gICAgICAgICAgICBBcnJheUxpdGVyYWw6ICdBcnJheUxpdGVyYWwnLCAvLydbRVhQUkVTU0lPTl0nLFxuICAgICAgICAgICAgRm9ySW5pdGlhbGl6ZXI6ICdGb3JJbml0aWFsaXplcicsIC8vJyhGT1ItRVhQUkVTU0lPTiknLFxuICAgICAgICAgICAgQ29uZGl0aW9uYWw6ICdDb25kaXRpb25hbCcsIC8vJyhDT05ELUVYUFJFU1NJT04pJyxcbiAgICAgICAgICAgIEV4cHJlc3Npb246ICdFeHByZXNzaW9uJyAvLycoRVhQUkVTU0lPTiknXG4gICAgICAgIH07XG5cbiAgICBmdW5jdGlvbiBCZWF1dGlmaWVyKGpzX3NvdXJjZV90ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICB2YXIgb3V0cHV0XG4gICAgICAgIHZhciB0b2tlbnMgPSBbXSwgdG9rZW5fcG9zO1xuICAgICAgICB2YXIgVG9rZW5pemVyO1xuICAgICAgICB2YXIgY3VycmVudF90b2tlbjtcbiAgICAgICAgdmFyIGxhc3RfdHlwZSwgbGFzdF9sYXN0X3RleHQsIGluZGVudF9zdHJpbmc7XG4gICAgICAgIHZhciBmbGFncywgcHJldmlvdXNfZmxhZ3MsIGZsYWdfc3RvcmU7XG4gICAgICAgIHZhciBwcmVmaXg7XG5cbiAgICAgICAgdmFyIGhhbmRsZXJzLCBvcHQ7XG4gICAgICAgIHZhciBiYXNlSW5kZW50U3RyaW5nID0gJyc7XG5cbiAgICAgICAgaGFuZGxlcnMgPSB7XG4gICAgICAgICAgICAnVEtfU1RBUlRfRVhQUic6IGhhbmRsZV9zdGFydF9leHByLFxuICAgICAgICAgICAgJ1RLX0VORF9FWFBSJzogaGFuZGxlX2VuZF9leHByLFxuICAgICAgICAgICAgJ1RLX1NUQVJUX0JMT0NLJzogaGFuZGxlX3N0YXJ0X2Jsb2NrLFxuICAgICAgICAgICAgJ1RLX0VORF9CTE9DSyc6IGhhbmRsZV9lbmRfYmxvY2ssXG4gICAgICAgICAgICAnVEtfV09SRCc6IGhhbmRsZV93b3JkLFxuICAgICAgICAgICAgJ1RLX1JFU0VSVkVEJzogaGFuZGxlX3dvcmQsXG4gICAgICAgICAgICAnVEtfU0VNSUNPTE9OJzogaGFuZGxlX3NlbWljb2xvbixcbiAgICAgICAgICAgICdUS19TVFJJTkcnOiBoYW5kbGVfc3RyaW5nLFxuICAgICAgICAgICAgJ1RLX0VRVUFMUyc6IGhhbmRsZV9lcXVhbHMsXG4gICAgICAgICAgICAnVEtfT1BFUkFUT1InOiBoYW5kbGVfb3BlcmF0b3IsXG4gICAgICAgICAgICAnVEtfQ09NTUEnOiBoYW5kbGVfY29tbWEsXG4gICAgICAgICAgICAnVEtfQkxPQ0tfQ09NTUVOVCc6IGhhbmRsZV9ibG9ja19jb21tZW50LFxuICAgICAgICAgICAgJ1RLX0lOTElORV9DT01NRU5UJzogaGFuZGxlX2lubGluZV9jb21tZW50LFxuICAgICAgICAgICAgJ1RLX0NPTU1FTlQnOiBoYW5kbGVfY29tbWVudCxcbiAgICAgICAgICAgICdUS19ET1QnOiBoYW5kbGVfZG90LFxuICAgICAgICAgICAgJ1RLX1VOS05PV04nOiBoYW5kbGVfdW5rbm93bixcbiAgICAgICAgICAgICdUS19FT0YnOiBoYW5kbGVfZW9mXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlX2ZsYWdzKGZsYWdzX2Jhc2UsIG1vZGUpIHtcbiAgICAgICAgICAgIHZhciBuZXh0X2luZGVudF9sZXZlbCA9IDA7XG4gICAgICAgICAgICBpZiAoZmxhZ3NfYmFzZSkge1xuICAgICAgICAgICAgICAgIG5leHRfaW5kZW50X2xldmVsID0gZmxhZ3NfYmFzZS5pbmRlbnRhdGlvbl9sZXZlbDtcbiAgICAgICAgICAgICAgICBpZiAoIW91dHB1dC5qdXN0X2FkZGVkX25ld2xpbmUoKSAmJlxuICAgICAgICAgICAgICAgICAgICBmbGFnc19iYXNlLmxpbmVfaW5kZW50X2xldmVsID4gbmV4dF9pbmRlbnRfbGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dF9pbmRlbnRfbGV2ZWwgPSBmbGFnc19iYXNlLmxpbmVfaW5kZW50X2xldmVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5leHRfZmxhZ3MgPSB7XG4gICAgICAgICAgICAgICAgbW9kZTogbW9kZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGZsYWdzX2Jhc2UsXG4gICAgICAgICAgICAgICAgbGFzdF90ZXh0OiBmbGFnc19iYXNlID8gZmxhZ3NfYmFzZS5sYXN0X3RleHQgOiAnJywgLy8gbGFzdCB0b2tlbiB0ZXh0XG4gICAgICAgICAgICAgICAgbGFzdF93b3JkOiBmbGFnc19iYXNlID8gZmxhZ3NfYmFzZS5sYXN0X3dvcmQgOiAnJywgLy8gbGFzdCAnVEtfV09SRCcgcGFzc2VkXG4gICAgICAgICAgICAgICAgZGVjbGFyYXRpb25fc3RhdGVtZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWNsYXJhdGlvbl9hc3NpZ25tZW50OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtdWx0aWxpbmVfZnJhbWU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGlmX2Jsb2NrOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbHNlX2Jsb2NrOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkb19ibG9jazogZmFsc2UsXG4gICAgICAgICAgICAgICAgZG9fd2hpbGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGluX2Nhc2Vfc3RhdGVtZW50OiBmYWxzZSwgLy8gc3dpdGNoKC4uKXsgSU5TSURFIEhFUkUgfVxuICAgICAgICAgICAgICAgIGluX2Nhc2U6IGZhbHNlLCAvLyB3ZSdyZSBvbiB0aGUgZXhhY3QgbGluZSB3aXRoIFwiY2FzZSAwOlwiXG4gICAgICAgICAgICAgICAgY2FzZV9ib2R5OiBmYWxzZSwgLy8gdGhlIGluZGVudGVkIGNhc2UtYWN0aW9uIGJsb2NrXG4gICAgICAgICAgICAgICAgaW5kZW50YXRpb25fbGV2ZWw6IG5leHRfaW5kZW50X2xldmVsLFxuICAgICAgICAgICAgICAgIGxpbmVfaW5kZW50X2xldmVsOiBmbGFnc19iYXNlID8gZmxhZ3NfYmFzZS5saW5lX2luZGVudF9sZXZlbCA6IG5leHRfaW5kZW50X2xldmVsLFxuICAgICAgICAgICAgICAgIHN0YXJ0X2xpbmVfaW5kZXg6IG91dHB1dC5nZXRfbGluZV9udW1iZXIoKSxcbiAgICAgICAgICAgICAgICB0ZXJuYXJ5X2RlcHRoOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIG5leHRfZmxhZ3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTb21lIGludGVycHJldGVycyBoYXZlIHVuZXhwZWN0ZWQgcmVzdWx0cyB3aXRoIGZvbyA9IGJheiB8fCBiYXI7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8gb3B0aW9ucyA6IHt9O1xuICAgICAgICBvcHQgPSB7fTtcblxuICAgICAgICAvLyBjb21wYXRpYmlsaXR5XG4gICAgICAgIGlmIChvcHRpb25zLmJyYWNlc19vbl9vd25fbGluZSAhPT0gdW5kZWZpbmVkKSB7IC8vZ3JhY2VmdWwgaGFuZGxpbmcgb2YgZGVwcmVjYXRlZCBvcHRpb25cbiAgICAgICAgICAgIG9wdC5icmFjZV9zdHlsZSA9IG9wdGlvbnMuYnJhY2VzX29uX293bl9saW5lID8gXCJleHBhbmRcIiA6IFwiY29sbGFwc2VcIjtcbiAgICAgICAgfVxuICAgICAgICBvcHQuYnJhY2Vfc3R5bGUgPSBvcHRpb25zLmJyYWNlX3N0eWxlID8gb3B0aW9ucy5icmFjZV9zdHlsZSA6IChvcHQuYnJhY2Vfc3R5bGUgPyBvcHQuYnJhY2Vfc3R5bGUgOiBcImNvbGxhcHNlXCIpO1xuXG4gICAgICAgIC8vIGdyYWNlZnVsIGhhbmRsaW5nIG9mIGRlcHJlY2F0ZWQgb3B0aW9uXG4gICAgICAgIGlmIChvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kLXN0cmljdFwiKSB7XG4gICAgICAgICAgICBvcHQuYnJhY2Vfc3R5bGUgPSBcImV4cGFuZFwiO1xuICAgICAgICB9XG5cblxuICAgICAgICBvcHQuaW5kZW50X3NpemUgPSBvcHRpb25zLmluZGVudF9zaXplID8gcGFyc2VJbnQob3B0aW9ucy5pbmRlbnRfc2l6ZSwgMTApIDogNDtcbiAgICAgICAgb3B0LmluZGVudF9jaGFyID0gb3B0aW9ucy5pbmRlbnRfY2hhciA/IG9wdGlvbnMuaW5kZW50X2NoYXIgOiAnICc7XG4gICAgICAgIG9wdC5wcmVzZXJ2ZV9uZXdsaW5lcyA9IChvcHRpb25zLnByZXNlcnZlX25ld2xpbmVzID09PSB1bmRlZmluZWQpID8gdHJ1ZSA6IG9wdGlvbnMucHJlc2VydmVfbmV3bGluZXM7XG4gICAgICAgIG9wdC5icmVha19jaGFpbmVkX21ldGhvZHMgPSAob3B0aW9ucy5icmVha19jaGFpbmVkX21ldGhvZHMgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuYnJlYWtfY2hhaW5lZF9tZXRob2RzO1xuICAgICAgICBvcHQubWF4X3ByZXNlcnZlX25ld2xpbmVzID0gKG9wdGlvbnMubWF4X3ByZXNlcnZlX25ld2xpbmVzID09PSB1bmRlZmluZWQpID8gMCA6IHBhcnNlSW50KG9wdGlvbnMubWF4X3ByZXNlcnZlX25ld2xpbmVzLCAxMCk7XG4gICAgICAgIG9wdC5zcGFjZV9pbl9wYXJlbiA9IChvcHRpb25zLnNwYWNlX2luX3BhcmVuID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLnNwYWNlX2luX3BhcmVuO1xuICAgICAgICBvcHQuc3BhY2VfaW5fZW1wdHlfcGFyZW4gPSAob3B0aW9ucy5zcGFjZV9pbl9lbXB0eV9wYXJlbiA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5zcGFjZV9pbl9lbXB0eV9wYXJlbjtcbiAgICAgICAgb3B0LmpzbGludF9oYXBweSA9IChvcHRpb25zLmpzbGludF9oYXBweSA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5qc2xpbnRfaGFwcHk7XG4gICAgICAgIG9wdC5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uID0gKG9wdGlvbnMuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uO1xuICAgICAgICBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiA9IChvcHRpb25zLmtlZXBfYXJyYXlfaW5kZW50YXRpb24gPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMua2VlcF9hcnJheV9pbmRlbnRhdGlvbjtcbiAgICAgICAgb3B0LnNwYWNlX2JlZm9yZV9jb25kaXRpb25hbCA9IChvcHRpb25zLnNwYWNlX2JlZm9yZV9jb25kaXRpb25hbCA9PT0gdW5kZWZpbmVkKSA/IHRydWUgOiBvcHRpb25zLnNwYWNlX2JlZm9yZV9jb25kaXRpb25hbDtcbiAgICAgICAgb3B0LnVuZXNjYXBlX3N0cmluZ3MgPSAob3B0aW9ucy51bmVzY2FwZV9zdHJpbmdzID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLnVuZXNjYXBlX3N0cmluZ3M7XG4gICAgICAgIG9wdC53cmFwX2xpbmVfbGVuZ3RoID0gKG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCA9PT0gdW5kZWZpbmVkKSA/IDAgOiBwYXJzZUludChvcHRpb25zLndyYXBfbGluZV9sZW5ndGgsIDEwKTtcbiAgICAgICAgb3B0LmU0eCA9IChvcHRpb25zLmU0eCA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5lNHg7XG4gICAgICAgIG9wdC5lbmRfd2l0aF9uZXdsaW5lID0gKG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZSA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lO1xuXG5cbiAgICAgICAgLy8gZm9yY2Ugb3B0LnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gdG8gdHJ1ZSBpZiBvcHQuanNsaW50X2hhcHB5XG4gICAgICAgIGlmKG9wdC5qc2xpbnRfaGFwcHkpIHtcbiAgICAgICAgICAgIG9wdC5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG9wdGlvbnMuaW5kZW50X3dpdGhfdGFicyl7XG4gICAgICAgICAgICBvcHQuaW5kZW50X2NoYXIgPSAnXFx0JztcbiAgICAgICAgICAgIG9wdC5pbmRlbnRfc2l6ZSA9IDE7XG4gICAgICAgIH1cblxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgaW5kZW50X3N0cmluZyA9ICcnO1xuICAgICAgICB3aGlsZSAob3B0LmluZGVudF9zaXplID4gMCkge1xuICAgICAgICAgICAgaW5kZW50X3N0cmluZyArPSBvcHQuaW5kZW50X2NoYXI7XG4gICAgICAgICAgICBvcHQuaW5kZW50X3NpemUgLT0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcmVpbmRlbnRfaW5kZXggPSAwO1xuICAgICAgICBpZihqc19zb3VyY2VfdGV4dCAmJiBqc19zb3VyY2VfdGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHdoaWxlICggKGpzX3NvdXJjZV90ZXh0LmNoYXJBdChwcmVpbmRlbnRfaW5kZXgpID09PSAnICcgfHxcbiAgICAgICAgICAgICAgICAgICAganNfc291cmNlX3RleHQuY2hhckF0KHByZWluZGVudF9pbmRleCkgPT09ICdcXHQnKSkge1xuICAgICAgICAgICAgICAgIGJhc2VJbmRlbnRTdHJpbmcgKz0ganNfc291cmNlX3RleHQuY2hhckF0KHByZWluZGVudF9pbmRleCk7XG4gICAgICAgICAgICAgICAgcHJlaW5kZW50X2luZGV4ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqc19zb3VyY2VfdGV4dCA9IGpzX3NvdXJjZV90ZXh0LnN1YnN0cmluZyhwcmVpbmRlbnRfaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGFzdF90eXBlID0gJ1RLX1NUQVJUX0JMT0NLJzsgLy8gbGFzdCB0b2tlbiB0eXBlXG4gICAgICAgIGxhc3RfbGFzdF90ZXh0ID0gJyc7IC8vIHByZS1sYXN0IHRva2VuIHRleHRcbiAgICAgICAgb3V0cHV0ID0gbmV3IE91dHB1dChpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKTtcblxuXG4gICAgICAgIC8vIFN0YWNrIG9mIHBhcnNpbmcvZm9ybWF0dGluZyBzdGF0ZXMsIGluY2x1ZGluZyBNT0RFLlxuICAgICAgICAvLyBXZSB0b2tlbml6ZSwgcGFyc2UsIGFuZCBvdXRwdXQgaW4gYW4gYWxtb3N0IHB1cmVseSBhIGZvcndhcmQtb25seSBzdHJlYW0gb2YgdG9rZW4gaW5wdXRcbiAgICAgICAgLy8gYW5kIGZvcm1hdHRlZCBvdXRwdXQuICBUaGlzIG1ha2VzIHRoZSBiZWF1dGlmaWVyIGxlc3MgYWNjdXJhdGUgdGhhbiBmdWxsIHBhcnNlcnNcbiAgICAgICAgLy8gYnV0IGFsc28gZmFyIG1vcmUgdG9sZXJhbnQgb2Ygc3ludGF4IGVycm9ycy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gRm9yIGV4YW1wbGUsIHRoZSBkZWZhdWx0IG1vZGUgaXMgTU9ERS5CbG9ja1N0YXRlbWVudC4gSWYgd2Ugc2VlIGEgJ3snIHdlIHB1c2ggYSBuZXcgZnJhbWUgb2YgdHlwZVxuICAgICAgICAvLyBNT0RFLkJsb2NrU3RhdGVtZW50IG9uIHRoZSB0aGUgc3RhY2ssIGV2ZW4gdGhvdWdoIGl0IGNvdWxkIGJlIG9iamVjdCBsaXRlcmFsLiAgSWYgd2UgbGF0ZXJcbiAgICAgICAgLy8gZW5jb3VudGVyIGEgXCI6XCIsIHdlJ2xsIHN3aXRjaCB0byB0byBNT0RFLk9iamVjdExpdGVyYWwuICBJZiB3ZSB0aGVuIHNlZSBhIFwiO1wiLFxuICAgICAgICAvLyBtb3N0IGZ1bGwgcGFyc2VycyB3b3VsZCBkaWUsIGJ1dCB0aGUgYmVhdXRpZmllciBncmFjZWZ1bGx5IGZhbGxzIGJhY2sgdG9cbiAgICAgICAgLy8gTU9ERS5CbG9ja1N0YXRlbWVudCBhbmQgY29udGludWVzIG9uLlxuICAgICAgICBmbGFnX3N0b3JlID0gW107XG4gICAgICAgIHNldF9tb2RlKE1PREUuQmxvY2tTdGF0ZW1lbnQpO1xuXG4gICAgICAgIHRoaXMuYmVhdXRpZnkgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLypqc2hpbnQgb25ldmFyOnRydWUgKi9cbiAgICAgICAgICAgIHZhciBsb2NhbF90b2tlbiwgc3dlZXRfY29kZTtcbiAgICAgICAgICAgIFRva2VuaXplciA9IG5ldyB0b2tlbml6ZXIoanNfc291cmNlX3RleHQsIG9wdCwgaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICB0b2tlbnMgPSBUb2tlbml6ZXIudG9rZW5pemUoKTtcbiAgICAgICAgICAgIHRva2VuX3BvcyA9IDA7XG5cbiAgICAgICAgICAgIHdoaWxlIChsb2NhbF90b2tlbiA9IGdldF90b2tlbigpKSB7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGxvY2FsX3Rva2VuLmNvbW1lbnRzX2JlZm9yZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY2xlYW5lc3QgaGFuZGxpbmcgb2YgaW5saW5lIGNvbW1lbnRzIGlzIHRvIHRyZWF0IHRoZW0gYXMgdGhvdWdoIHRoZXkgYXJlbid0IHRoZXJlLlxuICAgICAgICAgICAgICAgICAgICAvLyBKdXN0IGNvbnRpbnVlIGZvcm1hdHRpbmcgYW5kIHRoZSBiZWhhdmlvciBzaG91bGQgYmUgbG9naWNhbC5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWxzbyBpZ25vcmUgdW5rbm93biB0b2tlbnMuICBBZ2FpbiwgdGhpcyBzaG91bGQgcmVzdWx0IGluIGJldHRlciBiZWhhdmlvci5cbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlX3Rva2VuKGxvY2FsX3Rva2VuLmNvbW1lbnRzX2JlZm9yZVtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGhhbmRsZV90b2tlbihsb2NhbF90b2tlbik7XG5cbiAgICAgICAgICAgICAgICBsYXN0X2xhc3RfdGV4dCA9IGZsYWdzLmxhc3RfdGV4dDtcbiAgICAgICAgICAgICAgICBsYXN0X3R5cGUgPSBsb2NhbF90b2tlbi50eXBlO1xuICAgICAgICAgICAgICAgIGZsYWdzLmxhc3RfdGV4dCA9IGxvY2FsX3Rva2VuLnRleHQ7XG5cbiAgICAgICAgICAgICAgICB0b2tlbl9wb3MgKz0gMTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dlZXRfY29kZSA9IG91dHB1dC5nZXRfY29kZSgpO1xuICAgICAgICAgICAgaWYgKG9wdC5lbmRfd2l0aF9uZXdsaW5lKSB7XG4gICAgICAgICAgICAgICAgc3dlZXRfY29kZSArPSAnXFxuJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHN3ZWV0X2NvZGU7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3Rva2VuKGxvY2FsX3Rva2VuKSB7XG4gICAgICAgICAgICB2YXIgbmV3bGluZXMgPSBsb2NhbF90b2tlbi5uZXdsaW5lcztcbiAgICAgICAgICAgIHZhciBrZWVwX3doaXRlc3BhY2UgPSBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiAmJiBpc19hcnJheShmbGFncy5tb2RlKTtcblxuICAgICAgICAgICAgaWYgKGtlZXBfd2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBuZXdsaW5lczsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoaSA+IDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdC5tYXhfcHJlc2VydmVfbmV3bGluZXMgJiYgbmV3bGluZXMgPiBvcHQubWF4X3ByZXNlcnZlX25ld2xpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld2xpbmVzID0gb3B0Lm1heF9wcmVzZXJ2ZV9uZXdsaW5lcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0LnByZXNlcnZlX25ld2xpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb2NhbF90b2tlbi5uZXdsaW5lcyA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbmV3bGluZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1cnJlbnRfdG9rZW4gPSBsb2NhbF90b2tlbjtcbiAgICAgICAgICAgIGhhbmRsZXJzW2N1cnJlbnRfdG9rZW4udHlwZV0oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHdlIGNvdWxkIHVzZSBqdXN0IHN0cmluZy5zcGxpdCwgYnV0XG4gICAgICAgIC8vIElFIGRvZXNuJ3QgbGlrZSByZXR1cm5pbmcgZW1wdHkgc3RyaW5nc1xuXG4gICAgICAgIGZ1bmN0aW9uIHNwbGl0X25ld2xpbmVzKHMpIHtcbiAgICAgICAgICAgIC8vcmV0dXJuIHMuc3BsaXQoL1xceDBkXFx4MGF8XFx4MGEvKTtcblxuICAgICAgICAgICAgcyA9IHMucmVwbGFjZSgvXFx4MGQvZywgJycpO1xuICAgICAgICAgICAgdmFyIG91dCA9IFtdLFxuICAgICAgICAgICAgICAgIGlkeCA9IHMuaW5kZXhPZihcIlxcblwiKTtcbiAgICAgICAgICAgIHdoaWxlIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gocy5zdWJzdHJpbmcoMCwgaWR4KSk7XG4gICAgICAgICAgICAgICAgcyA9IHMuc3Vic3RyaW5nKGlkeCArIDEpO1xuICAgICAgICAgICAgICAgIGlkeCA9IHMuaW5kZXhPZihcIlxcblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoZm9yY2VfbGluZXdyYXApIHtcbiAgICAgICAgICAgIGZvcmNlX2xpbmV3cmFwID0gKGZvcmNlX2xpbmV3cmFwID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBmb3JjZV9saW5ld3JhcDtcblxuICAgICAgICAgICAgaWYgKG91dHB1dC5qdXN0X2FkZGVkX25ld2xpbmUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoKG9wdC5wcmVzZXJ2ZV9uZXdsaW5lcyAmJiBjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lKSB8fCBmb3JjZV9saW5ld3JhcCkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHQud3JhcF9saW5lX2xlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIFdlIG5ldmVyIHdyYXAgdGhlIGZpcnN0IHRva2VuIG9mIGEgbGluZSBkdWUgdG8gbmV3bGluZSBjaGVjayBhYm92ZS5cbiAgICAgICAgICAgICAgICB2YXIgcHJvcG9zZWRfbGluZV9sZW5ndGggPSBvdXRwdXQuY3VycmVudF9saW5lLmdldF9jaGFyYWN0ZXJfY291bnQoKSArIGN1cnJlbnRfdG9rZW4udGV4dC5sZW5ndGggK1xuICAgICAgICAgICAgICAgICAgICAob3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICBpZiAocHJvcG9zZWRfbGluZV9sZW5ndGggPj0gb3B0LndyYXBfbGluZV9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcHJpbnRfbmV3bGluZShmb3JjZV9uZXdsaW5lLCBwcmVzZXJ2ZV9zdGF0ZW1lbnRfZmxhZ3MpIHtcbiAgICAgICAgICAgIGlmICghcHJlc2VydmVfc3RhdGVtZW50X2ZsYWdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLmxhc3RfdGV4dCAhPT0gJzsnICYmIGZsYWdzLmxhc3RfdGV4dCAhPT0gJywnICYmIGZsYWdzLmxhc3RfdGV4dCAhPT0gJz0nICYmIGxhc3RfdHlwZSAhPT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQgJiYgIWZsYWdzLmlmX2Jsb2NrICYmICFmbGFncy5kb19ibG9jaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvdXRwdXQuYWRkX25ld19saW5lKGZvcmNlX25ld2xpbmUpKSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MubXVsdGlsaW5lX2ZyYW1lID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByaW50X3Rva2VuX2xpbmVfaW5kZW50YXRpb24oKSB7XG4gICAgICAgICAgICBpZiAob3V0cHV0Lmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uICYmIGlzX2FycmF5KGZsYWdzLm1vZGUpICYmIGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHJldmVudCByZW1vdmluZyBvZiB0aGlzIHdoaXRlc3BhY2UgYXMgcmVkdW5kYW50XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5jdXJyZW50X2xpbmUucHVzaCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3VycmVudF90b2tlbi53aGl0ZXNwYWNlX2JlZm9yZS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmN1cnJlbnRfbGluZS5wdXNoKGN1cnJlbnRfdG9rZW4ud2hpdGVzcGFjZV9iZWZvcmVbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG91dHB1dC5hZGRfaW5kZW50X3N0cmluZyhmbGFncy5pbmRlbnRhdGlvbl9sZXZlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MubGluZV9pbmRlbnRfbGV2ZWwgPSBmbGFncy5pbmRlbnRhdGlvbl9sZXZlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcmludF90b2tlbihwcmludGFibGVfdG9rZW4pIHtcbiAgICAgICAgICAgIHByaW50YWJsZV90b2tlbiA9IHByaW50YWJsZV90b2tlbiB8fCBjdXJyZW50X3Rva2VuLnRleHQ7XG4gICAgICAgICAgICBwcmludF90b2tlbl9saW5lX2luZGVudGF0aW9uKCk7XG4gICAgICAgICAgICBvdXRwdXQuYWRkX3Rva2VuKHByaW50YWJsZV90b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpbmRlbnQoKSB7XG4gICAgICAgICAgICBmbGFncy5pbmRlbnRhdGlvbl9sZXZlbCArPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZGVpbmRlbnQoKSB7XG4gICAgICAgICAgICBpZiAoZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwgPiAwICYmXG4gICAgICAgICAgICAgICAgKCghZmxhZ3MucGFyZW50KSB8fCBmbGFncy5pbmRlbnRhdGlvbl9sZXZlbCA+IGZsYWdzLnBhcmVudC5pbmRlbnRhdGlvbl9sZXZlbCkpXG4gICAgICAgICAgICAgICAgZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwgLT0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldF9tb2RlKG1vZGUpIHtcbiAgICAgICAgICAgIGlmIChmbGFncykge1xuICAgICAgICAgICAgICAgIGZsYWdfc3RvcmUucHVzaChmbGFncyk7XG4gICAgICAgICAgICAgICAgcHJldmlvdXNfZmxhZ3MgPSBmbGFncztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJldmlvdXNfZmxhZ3MgPSBjcmVhdGVfZmxhZ3MobnVsbCwgbW9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZsYWdzID0gY3JlYXRlX2ZsYWdzKHByZXZpb3VzX2ZsYWdzLCBtb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzX2FycmF5KG1vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2RlID09PSBNT0RFLkFycmF5TGl0ZXJhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzX2V4cHJlc3Npb24obW9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGluX2FycmF5KG1vZGUsIFtNT0RFLkV4cHJlc3Npb24sIE1PREUuRm9ySW5pdGlhbGl6ZXIsIE1PREUuQ29uZGl0aW9uYWxdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc3RvcmVfbW9kZSgpIHtcbiAgICAgICAgICAgIGlmIChmbGFnX3N0b3JlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c19mbGFncyA9IGZsYWdzO1xuICAgICAgICAgICAgICAgIGZsYWdzID0gZmxhZ19zdG9yZS5wb3AoKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNfZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnJlbW92ZV9yZWR1bmRhbnRfaW5kZW50YXRpb24ocHJldmlvdXNfZmxhZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN0YXJ0X29mX29iamVjdF9wcm9wZXJ0eSgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbGFncy5wYXJlbnQubW9kZSA9PT0gTU9ERS5PYmplY3RMaXRlcmFsICYmIGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50ICYmIChcbiAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnOicgJiYgZmxhZ3MudGVybmFyeV9kZXB0aCA9PT0gMCkgfHwgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnZ2V0JywgJ3NldCddKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3RhcnRfb2Zfc3RhdGVtZW50KCkge1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWyd2YXInLCAnbGV0JywgJ2NvbnN0J10pICYmIGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1dPUkQnKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2RvJykgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdyZXR1cm4nICYmICFjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2Vsc2UnICYmICEoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2lmJykpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicgJiYgKHByZXZpb3VzX2ZsYWdzLm1vZGUgPT09IE1PREUuRm9ySW5pdGlhbGl6ZXIgfHwgcHJldmlvdXNfZmxhZ3MubW9kZSA9PT0gTU9ERS5Db25kaXRpb25hbCkpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19XT1JEJyAmJiBmbGFncy5tb2RlID09PSBNT0RFLkJsb2NrU3RhdGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAhZmxhZ3MuaW5fY2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgIShjdXJyZW50X3Rva2VuLnRleHQgPT09ICctLScgfHwgY3VycmVudF90b2tlbi50ZXh0ID09PSAnKysnKVxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgY3VycmVudF90b2tlbi50eXBlICE9PSAnVEtfV09SRCcgJiYgY3VycmVudF90b2tlbi50eXBlICE9PSAnVEtfUkVTRVJWRUQnKSB8fFxuICAgICAgICAgICAgICAgICAgICAoZmxhZ3MubW9kZSA9PT0gTU9ERS5PYmplY3RMaXRlcmFsICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIChmbGFncy5sYXN0X3RleHQgPT09ICc6JyAmJiBmbGFncy50ZXJuYXJ5X2RlcHRoID09PSAwKSB8fCAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWydnZXQnLCAnc2V0J10pKSkpXG4gICAgICAgICAgICAgICAgKSB7XG5cbiAgICAgICAgICAgICAgICBzZXRfbW9kZShNT0RFLlN0YXRlbWVudCk7XG4gICAgICAgICAgICAgICAgaW5kZW50KCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWyd2YXInLCAnbGV0JywgJ2NvbnN0J10pICYmIGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1dPUkQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmRlY2xhcmF0aW9uX3N0YXRlbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSXNzdWUgIzI3NjpcbiAgICAgICAgICAgICAgICAvLyBJZiBzdGFydGluZyBhIG5ldyBzdGF0ZW1lbnQgd2l0aCBbaWYsIGZvciwgd2hpbGUsIGRvXSwgcHVzaCB0byBhIG5ldyBsaW5lLlxuICAgICAgICAgICAgICAgIC8vIGlmIChhKSBpZiAoYikgaWYoYykgZCgpOyBlbHNlIGUoKTsgZWxzZSBmKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzdGFydF9vZl9vYmplY3RfcHJvcGVydHkoKSkge1xuICAgICAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWydkbycsICdmb3InLCAnaWYnLCAnd2hpbGUnXSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWxsX2xpbmVzX3N0YXJ0X3dpdGgobGluZXMsIGMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbGluZSA9IHRyaW0obGluZXNbaV0pO1xuICAgICAgICAgICAgICAgIGlmIChsaW5lLmNoYXJBdCgwKSAhPT0gYykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlYWNoX2xpbmVfbWF0Y2hlc19pbmRlbnQobGluZXMsIGluZGVudCkge1xuICAgICAgICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IGxpbmVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBsaW5lO1xuICAgICAgICAgICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICAgICAgICAgICAgICAvLyBhbGxvdyBlbXB0eSBsaW5lcyB0byBwYXNzIHRocm91Z2hcbiAgICAgICAgICAgICAgICBpZiAobGluZSAmJiBsaW5lLmluZGV4T2YoaW5kZW50KSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc19zcGVjaWFsX3dvcmQod29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGluX2FycmF5KHdvcmQsIFsnY2FzZScsICdyZXR1cm4nLCAnZG8nLCAnaWYnLCAndGhyb3cnLCAnZWxzZSddKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldF90b2tlbihvZmZzZXQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IHRva2VuX3BvcyArIChvZmZzZXQgfHwgMCk7XG4gICAgICAgICAgICByZXR1cm4gKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0b2tlbnMubGVuZ3RoKSA/IG51bGwgOiB0b2tlbnNbaW5kZXhdO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3N0YXJ0X2V4cHIoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBuZXh0X21vZGUgPSBNT0RFLkV4cHJlc3Npb247XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnWycpIHtcblxuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19XT1JEJyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICcpJykge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGFycmF5IGluZGV4IHNwZWNpZmllciwgYnJlYWsgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgLy8gYVt4XSwgZm4oKVt4XVxuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgVG9rZW5pemVyLmxpbmVfc3RhcnRlcnMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzZXRfbW9kZShuZXh0X21vZGUpO1xuICAgICAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgICAgICBpbmRlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdC5zcGFjZV9pbl9wYXJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG5leHRfbW9kZSA9IE1PREUuQXJyYXlMaXRlcmFsO1xuICAgICAgICAgICAgICAgIGlmIChpc19hcnJheShmbGFncy5tb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ID09PSAnWycgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChmbGFncy5sYXN0X3RleHQgPT09ICcsJyAmJiAobGFzdF9sYXN0X3RleHQgPT09ICddJyB8fCBsYXN0X2xhc3RfdGV4dCA9PT0gJ30nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIF0sIFsgZ29lcyB0byBuZXcgbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSwgWyBnb2VzIHRvIG5ldyBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZm9yJykge1xuICAgICAgICAgICAgICAgICAgICBuZXh0X21vZGUgPSBNT0RFLkZvckluaXRpYWxpemVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWydpZicsICd3aGlsZSddKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0X21vZGUgPSBNT0RFLkNvbmRpdGlvbmFsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5leHRfbW9kZSA9IE1PREUuRXhwcmVzc2lvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgPT09ICc7JyB8fCBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9CTE9DSycpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9FWFBSJyB8fCBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9FWFBSJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FTkRfQkxPQ0snIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogQ29uc2lkZXIgd2hldGhlciBmb3JjaW5nIHRoaXMgaXMgcmVxdWlyZWQuICBSZXZpZXcgZmFpbGluZyB0ZXN0cyB3aGVuIHJlbW92ZWQuXG4gICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZShjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lKTtcbiAgICAgICAgICAgICAgICAvLyBkbyBub3RoaW5nIG9uICgoIGFuZCApKCBhbmQgXVsgYW5kIF0oIGFuZCAuKFxuICAgICAgICAgICAgfSBlbHNlIGlmICghKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICcoJykgJiYgbGFzdF90eXBlICE9PSAnVEtfV09SRCcgJiYgbGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgKGZsYWdzLmxhc3Rfd29yZCA9PT0gJ2Z1bmN0aW9uJyB8fCBmbGFncy5sYXN0X3dvcmQgPT09ICd0eXBlb2YnKSkgfHxcbiAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnKicgJiYgbGFzdF9sYXN0X3RleHQgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgLy8gZnVuY3Rpb24oKSB2cyBmdW5jdGlvbiAoKVxuICAgICAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiAoaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnY2F0Y2gnKSkge1xuICAgICAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfYmVmb3JlX2NvbmRpdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3VwcG9ydCBvZiB0aGlzIGtpbmQgb2YgbmV3bGluZSBwcmVzZXJ2YXRpb24uXG4gICAgICAgICAgICAvLyBhID0gKGIgJiZcbiAgICAgICAgICAgIC8vICAgICAoYyB8fCBkKSk7XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnKCcpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfRVFVQUxTJyB8fCBsYXN0X3R5cGUgPT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdGFydF9vZl9vYmplY3RfcHJvcGVydHkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZXRfbW9kZShuZXh0X21vZGUpO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfaW5fcGFyZW4pIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW4gYWxsIGNhc2VzLCBpZiB3ZSBuZXdsaW5lIHdoaWxlIGluc2lkZSBhbiBleHByZXNzaW9uIGl0IHNob3VsZCBiZSBpbmRlbnRlZC5cbiAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2VuZF9leHByKCkge1xuICAgICAgICAgICAgLy8gc3RhdGVtZW50cyBpbnNpZGUgZXhwcmVzc2lvbnMgYXJlIG5vdCB2YWxpZCBzeW50YXgsIGJ1dC4uLlxuICAgICAgICAgICAgLy8gc3RhdGVtZW50cyBtdXN0IGFsbCBiZSBjbG9zZWQgd2hlbiB0aGVpciBjb250YWluZXIgY2xvc2VzXG4gICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZsYWdzLm11bHRpbGluZV9mcmFtZSkge1xuICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoY3VycmVudF90b2tlbi50ZXh0ID09PSAnXScgJiYgaXNfYXJyYXkoZmxhZ3MubW9kZSkgJiYgIW9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9wdC5zcGFjZV9pbl9wYXJlbikge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9FWFBSJyAmJiAhIG9wdC5zcGFjZV9pbl9lbXB0eV9wYXJlbikge1xuICAgICAgICAgICAgICAgICAgICAvLyAoKSBbXSBubyBpbm5lciBzcGFjZSBpbiBlbXB0eSBwYXJlbnMgbGlrZSB0aGVzZSwgZXZlciwgcmVmICMzMjBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICddJyAmJiBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXRwdXQucmVtb3ZlX3JlZHVuZGFudF9pbmRlbnRhdGlvbihwcmV2aW91c19mbGFncyk7XG5cbiAgICAgICAgICAgIC8vIGRvIHt9IHdoaWxlICgpIC8vIG5vIHN0YXRlbWVudCByZXF1aXJlZCBhZnRlclxuICAgICAgICAgICAgaWYgKGZsYWdzLmRvX3doaWxlICYmIHByZXZpb3VzX2ZsYWdzLm1vZGUgPT09IE1PREUuQ29uZGl0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c19mbGFncy5tb2RlID0gTU9ERS5FeHByZXNzaW9uO1xuICAgICAgICAgICAgICAgIGZsYWdzLmRvX2Jsb2NrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZmxhZ3MuZG9fd2hpbGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3N0YXJ0X2Jsb2NrKCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBzaG91bGQgYmUgdHJlYXRlZCBhcyBhIE9iamVjdExpdGVyYWxcbiAgICAgICAgICAgIHZhciBuZXh0X3Rva2VuID0gZ2V0X3Rva2VuKDEpXG4gICAgICAgICAgICB2YXIgc2Vjb25kX3Rva2VuID0gZ2V0X3Rva2VuKDIpXG4gICAgICAgICAgICBpZiAoc2Vjb25kX3Rva2VuICYmIChcbiAgICAgICAgICAgICAgICAgICAgKHNlY29uZF90b2tlbi50ZXh0ID09PSAnOicgJiYgaW5fYXJyYXkobmV4dF90b2tlbi50eXBlLCBbJ1RLX1NUUklORycsICdUS19XT1JEJywgJ1RLX1JFU0VSVkVEJ10pKVxuICAgICAgICAgICAgICAgICAgICB8fCAoaW5fYXJyYXkobmV4dF90b2tlbi50ZXh0LCBbJ2dldCcsICdzZXQnXSkgJiYgaW5fYXJyYXkoc2Vjb25kX3Rva2VuLnR5cGUsIFsnVEtfV09SRCcsICdUS19SRVNFUlZFRCddKSlcbiAgICAgICAgICAgICAgICApKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3Qgc3VwcG9ydCBUeXBlU2NyaXB0LGJ1dCB3ZSBkaWRuJ3QgYnJlYWsgaXQgZm9yIGEgdmVyeSBsb25nIHRpbWUuXG4gICAgICAgICAgICAgICAgLy8gV2UnbGwgdHJ5IHRvIGtlZXAgbm90IGJyZWFraW5nIGl0LlxuICAgICAgICAgICAgICAgIGlmICghaW5fYXJyYXkobGFzdF9sYXN0X3RleHQsIFsnY2xhc3MnLCdpbnRlcmZhY2UnXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0X21vZGUoTU9ERS5PYmplY3RMaXRlcmFsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZXRfbW9kZShNT0RFLkJsb2NrU3RhdGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldF9tb2RlKE1PREUuQmxvY2tTdGF0ZW1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZW1wdHlfYnJhY2VzID0gIW5leHRfdG9rZW4uY29tbWVudHNfYmVmb3JlLmxlbmd0aCAmJiAgbmV4dF90b2tlbi50ZXh0ID09PSAnfSc7XG4gICAgICAgICAgICB2YXIgZW1wdHlfYW5vbnltb3VzX2Z1bmN0aW9uID0gZW1wdHlfYnJhY2VzICYmIGZsYWdzLmxhc3Rfd29yZCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICAgIGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9FWFBSJztcblxuICAgICAgICAgICAgaWYgKG9wdC5icmFjZV9zdHlsZSA9PT0gXCJleHBhbmRcIikge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicgJiZcbiAgICAgICAgICAgICAgICAgICAgKGVtcHR5X2Fub255bW91c19mdW5jdGlvbiB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF90eXBlID09PSAnVEtfRVFVQUxTJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpc19zcGVjaWFsX3dvcmQoZmxhZ3MubGFzdF90ZXh0KSAmJiBmbGFncy5sYXN0X3RleHQgIT09ICdlbHNlJykpKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSAhPT0gJ1RLX09QRVJBVE9SJyAmJiBsYXN0X3R5cGUgIT09ICdUS19TVEFSVF9FWFBSJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIFRLX09QRVJBVE9SIG9yIFRLX1NUQVJUX0VYUFJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzX2FycmF5KHByZXZpb3VzX2ZsYWdzLm1vZGUpICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJywnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdF9sYXN0X3RleHQgPT09ICd9Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0sIHsgaW4gYXJyYXkgY29udGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7IC8vIFthLCBiLCBjLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZW5kX2Jsb2NrKCkge1xuICAgICAgICAgICAgLy8gc3RhdGVtZW50cyBtdXN0IGFsbCBiZSBjbG9zZWQgd2hlbiB0aGVpciBjb250YWluZXIgY2xvc2VzXG4gICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBlbXB0eV9icmFjZXMgPSBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9CTE9DSyc7XG5cbiAgICAgICAgICAgIGlmIChvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWVtcHR5X2JyYWNlcykge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBza2lwIHt9XG4gICAgICAgICAgICAgICAgaWYgKCFlbXB0eV9icmFjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzX2FycmF5KGZsYWdzLm1vZGUpICYmIG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBSRUFMTFkgbmVlZCBhIG5ld2xpbmUgaGVyZSwgYnV0IG5ld2xpbmVyIHdvdWxkIHNraXAgdGhhdFxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3dvcmQoKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLm1vZGUgIT09IE1PREUuT2JqZWN0TGl0ZXJhbCAmJlxuICAgICAgICAgICAgICAgIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWydzZXQnLCAnZ2V0J10pKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudF90b2tlbi50eXBlID0gJ1RLX1dPUkQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0X3Rva2VuID0gZ2V0X3Rva2VuKDEpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0X3Rva2VuLnRleHQgPT0gJzonKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRfdG9rZW4udHlwZSA9ICdUS19XT1JEJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSAmJiAhaXNfZXhwcmVzc2lvbihmbGFncy5tb2RlKSAmJlxuICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicgfHwgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJy0tJyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICcrKycpKSAmJlxuICAgICAgICAgICAgICAgIGxhc3RfdHlwZSAhPT0gJ1RLX0VRVUFMUycgJiZcbiAgICAgICAgICAgICAgICAob3B0LnByZXNlcnZlX25ld2xpbmVzIHx8ICEobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWyd2YXInLCAnbGV0JywgJ2NvbnN0JywgJ3NldCcsICdnZXQnXSkpKSkge1xuXG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmxhZ3MuZG9fYmxvY2sgJiYgIWZsYWdzLmRvX3doaWxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICd3aGlsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8ge30gIyMgd2hpbGUgKClcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5kb193aGlsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyB7fSBzaG91bGQgYWx3YXlzIGhhdmUgd2hpbGUgYXMgdGhlIG5leHQgd29yZC5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgd2UgZG9uJ3Qgc2VlIHRoZSBleHBlY3RlZCB3aGlsZSwgcmVjb3ZlclxuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmRvX2Jsb2NrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiBtYXkgYmUgZm9sbG93ZWQgYnkgZWxzZSwgb3Igbm90XG4gICAgICAgICAgICAvLyBCYXJlL2lubGluZSBpZnMgYXJlIHRyaWNreVxuICAgICAgICAgICAgLy8gTmVlZCB0byB1bndpbmQgdGhlIG1vZGVzIGNvcnJlY3RseTogaWYgKGEpIGlmIChiKSBjKCk7IGVsc2UgZCgpOyBlbHNlIGUoKTtcbiAgICAgICAgICAgIGlmIChmbGFncy5pZl9ibG9jaykge1xuICAgICAgICAgICAgICAgIGlmICghZmxhZ3MuZWxzZV9ibG9jayAmJiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2Vsc2UnKSkge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5lbHNlX2Jsb2NrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmlmX2Jsb2NrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmVsc2VfYmxvY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2Nhc2UnIHx8IChjdXJyZW50X3Rva2VuLnRleHQgPT09ICdkZWZhdWx0JyAmJiBmbGFncy5pbl9jYXNlX3N0YXRlbWVudCkpKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIGlmIChmbGFncy5jYXNlX2JvZHkgfHwgb3B0LmpzbGludF9oYXBweSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzd2l0Y2ggY2FzZXMgZm9sbG93aW5nIG9uZSBhbm90aGVyXG4gICAgICAgICAgICAgICAgICAgIGRlaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmNhc2VfYm9keSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIGZsYWdzLmluX2Nhc2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGZsYWdzLmluX2Nhc2Vfc3RhdGVtZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWyd9JywgJzsnXSkgfHwgKG91dHB1dC5qdXN0X2FkZGVkX25ld2xpbmUoKSAmJiAhIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWydbJywgJ3snLCAnOicsICc9JywgJywnXSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSBpcyBhIG5pY2UgY2xlYW4gc3BhY2Ugb2YgYXQgbGVhc3Qgb25lIGJsYW5rIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgLy8gYmVmb3JlIGEgbmV3IGZ1bmN0aW9uIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKCAhb3V0cHV0Lmp1c3RfYWRkZWRfYmxhbmtsaW5lKCkgJiYgIWN1cnJlbnRfdG9rZW4uY29tbWVudHNfYmVmb3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1dPUkQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ2dldCcsICdzZXQnLCAnbmV3JywgJ3JldHVybicsICdleHBvcnQnXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdkZWZhdWx0JyAmJiBsYXN0X2xhc3RfdGV4dCA9PT0gJ2V4cG9ydCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19PUEVSQVRPUicgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnPScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9vID0gZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghZmxhZ3MubXVsdGlsaW5lX2ZyYW1lICYmIChpc19leHByZXNzaW9uKGZsYWdzLm1vZGUpIHx8IGlzX2FycmF5KGZsYWdzLm1vZGUpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAoZnVuY3Rpb25cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfQ09NTUEnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0VYUFInIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX0VRVUFMUycgfHwgbGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzdGFydF9vZl9vYmplY3RfcHJvcGVydHkoKSkge1xuICAgICAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmICBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnZnVuY3Rpb24nLCAnZ2V0JywgJ3NldCddKSkge1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgZmxhZ3MubGFzdF93b3JkID0gY3VycmVudF90b2tlbi50ZXh0O1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJlZml4ID0gJ05PTkUnO1xuXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfRU5EX0JMT0NLJykge1xuICAgICAgICAgICAgICAgIGlmICghKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnZWxzZScsICdjYXRjaCcsICdmaW5hbGx5J10pKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdC5icmFjZV9zdHlsZSA9PT0gXCJleHBhbmRcIiB8fCBvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZW5kLWV4cGFuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXggPSAnU1BBQ0UnO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NFTUlDT0xPTicgJiYgZmxhZ3MubW9kZSA9PT0gTU9ERS5CbG9ja1N0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IFNob3VsZCB0aGlzIGJlIGZvciBTVEFURU1FTlQgYXMgd2VsbD9cbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NFTUlDT0xPTicgJiYgaXNfZXhwcmVzc2lvbihmbGFncy5tb2RlKSkge1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdTUEFDRSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NUUklORycpIHtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyB8fCBsYXN0X3R5cGUgPT09ICdUS19XT1JEJyB8fFxuICAgICAgICAgICAgICAgIChmbGFncy5sYXN0X3RleHQgPT09ICcqJyAmJiBsYXN0X2xhc3RfdGV4dCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnU1BBQ0UnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9CTE9DSycpIHtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9FWFBSJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFRva2VuaXplci5saW5lX3N0YXJ0ZXJzKSAmJiBmbGFncy5sYXN0X3RleHQgIT09ICcpJykge1xuICAgICAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgPT09ICdlbHNlJyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICdleHBvcnQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZWZpeCA9ICdTUEFDRSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWydlbHNlJywgJ2NhdGNoJywgJ2ZpbmFsbHknXSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlICE9PSAnVEtfRU5EX0JMT0NLJyB8fCBvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kXCIgfHwgb3B0LmJyYWNlX3N0eWxlID09PSBcImVuZC1leHBhbmRcIikge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnRyaW0odHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW5lID0gb3V0cHV0LmN1cnJlbnRfbGluZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgdHJpbW1lZCBhbmQgdGhlcmUncyBzb21ldGhpbmcgb3RoZXIgdGhhbiBhIGNsb3NlIGJsb2NrIGJlZm9yZSB1c1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXQgYSBuZXdsaW5lIGJhY2sgaW4uICBIYW5kbGVzICd9IC8vIGNvbW1lbnQnIHNjZW5hcmlvLlxuICAgICAgICAgICAgICAgICAgICBpZiAobGluZS5sYXN0KCkgIT09ICd9Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJlZml4ID09PSAnTkVXTElORScpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGlzX3NwZWNpYWxfd29yZChmbGFncy5sYXN0X3RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vIG5ld2xpbmUgYmV0d2VlbiAncmV0dXJuIG5ubidcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgIT09ICdUS19FTkRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChsYXN0X3R5cGUgIT09ICdUS19TVEFSVF9FWFBSJyB8fCAhKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCddKSkpICYmIGZsYWdzLmxhc3RfdGV4dCAhPT0gJzonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGZvcmNlIG5ld2xpbmUgb24gJ3Zhcic6IGZvciAodmFyIHggPSAwLi4uKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdpZicgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBubyBuZXdsaW5lIGZvciB9IGVsc2UgaWYge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFRva2VuaXplci5saW5lX3N0YXJ0ZXJzKSAmJiBmbGFncy5sYXN0X3RleHQgIT09ICcpJykge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChmbGFncy5tdWx0aWxpbmVfZnJhbWUgJiYgaXNfYXJyYXkoZmxhZ3MubW9kZSkgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnLCcgJiYgbGFzdF9sYXN0X3RleHQgPT09ICd9Jykge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTsgLy8gfSwgaW4gbGlzdHMgZ2V0IGEgbmV3bGluZSB0cmVhdG1lbnRcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJlZml4ID09PSAnU1BBQ0UnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgZmxhZ3MubGFzdF93b3JkID0gY3VycmVudF90b2tlbi50ZXh0O1xuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2RvJykge1xuICAgICAgICAgICAgICAgIGZsYWdzLmRvX2Jsb2NrID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdpZicpIHtcbiAgICAgICAgICAgICAgICBmbGFncy5pZl9ibG9jayA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfc2VtaWNvbG9uKCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgICAgIC8vIFNlbWljb2xvbiBjYW4gYmUgdGhlIHN0YXJ0IChhbmQgZW5kKSBvZiBhIHN0YXRlbWVudFxuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCAmJiAhZmxhZ3MuaWZfYmxvY2sgJiYgIWZsYWdzLmRvX2Jsb2NrKSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3N0cmluZygpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgICAgICAvLyBPbmUgZGlmZmVyZW5jZSAtIHN0cmluZ3Mgd2FudCBhdCBsZWFzdCBhIHNwYWNlIGJlZm9yZVxuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgfHwgbGFzdF90eXBlID09PSAnVEtfV09SRCcpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfQ09NTUEnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0VYUFInIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX0VRVUFMUycgfHwgbGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzdGFydF9vZl9vYmplY3RfcHJvcGVydHkoKSkge1xuICAgICAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2VxdWFscygpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZsYWdzLmRlY2xhcmF0aW9uX3N0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIC8vIGp1c3QgZ290IGFuICc9JyBpbiBhIHZhci1saW5lLCBkaWZmZXJlbnQgZm9ybWF0dGluZy9saW5lLWJyZWFraW5nLCBldGMgd2lsbCBub3cgYmUgZG9uZVxuICAgICAgICAgICAgICAgIGZsYWdzLmRlY2xhcmF0aW9uX2Fzc2lnbm1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfY29tbWEoKSB7XG4gICAgICAgICAgICBpZiAoZmxhZ3MuZGVjbGFyYXRpb25fc3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzX2V4cHJlc3Npb24oZmxhZ3MucGFyZW50Lm1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdCBicmVhayBvbiBjb21tYSwgZm9yKHZhciBhID0gMSwgYiA9IDIpXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmRlY2xhcmF0aW9uX2Fzc2lnbm1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLmRlY2xhcmF0aW9uX2Fzc2lnbm1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZGVjbGFyYXRpb25fYXNzaWdubWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgaWYgKGZsYWdzLm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCB8fFxuICAgICAgICAgICAgICAgIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCAmJiBmbGFncy5wYXJlbnQubW9kZSA9PT0gTU9ERS5PYmplY3RMaXRlcmFsKSkge1xuICAgICAgICAgICAgICAgIGlmIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFWFBSIG9yIERPX0JMT0NLXG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9vcGVyYXRvcigpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpc19zcGVjaWFsX3dvcmQoZmxhZ3MubGFzdF90ZXh0KSkge1xuICAgICAgICAgICAgICAgIC8vIFwicmV0dXJuXCIgaGFkIGEgc3BlY2lhbCBoYW5kbGluZyBpbiBUS19XT1JELiBOb3cgd2UgbmVlZCB0byByZXR1cm4gdGhlIGZhdm9yXG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGhhY2sgZm9yIGFjdGlvbnNjcmlwdCdzIGltcG9ydCAuKjtcbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICcqJyAmJiBsYXN0X3R5cGUgPT09ICdUS19ET1QnKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICc6JyAmJiBmbGFncy5pbl9jYXNlKSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MuY2FzZV9ib2R5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpbmRlbnQoKTtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICBmbGFncy5pbl9jYXNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnOjonKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gc3BhY2VzIGFyb3VuZCBleG90aWMgbmFtZXNwYWNpbmcgc3ludGF4IG9wZXJhdG9yXG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi81LjEvI3NlYy03LjkuMVxuICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBuZXdsaW5lIGJldHdlZW4gLS0gb3IgKysgYW5kIGFueXRoaW5nIGVsc2Ugd2Ugc2hvdWxkIHByZXNlcnZlIGl0LlxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUgJiYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJy0tJyB8fCBjdXJyZW50X3Rva2VuLnRleHQgPT09ICcrKycpKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFsbG93IGxpbmUgd3JhcHBpbmcgYmV0d2VlbiBvcGVyYXRvcnNcbiAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzcGFjZV9iZWZvcmUgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIHNwYWNlX2FmdGVyID0gdHJ1ZTtcblxuICAgICAgICAgICAgaWYgKGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWyctLScsICcrKycsICchJywgJ34nXSkgfHwgKGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWyctJywgJysnXSkgJiYgKGluX2FycmF5KGxhc3RfdHlwZSwgWydUS19TVEFSVF9CTE9DSycsICdUS19TVEFSVF9FWFBSJywgJ1RLX0VRVUFMUycsICdUS19PUEVSQVRPUiddKSB8fCBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFRva2VuaXplci5saW5lX3N0YXJ0ZXJzKSB8fCBmbGFncy5sYXN0X3RleHQgPT09ICcsJykpKSB7XG4gICAgICAgICAgICAgICAgLy8gdW5hcnkgb3BlcmF0b3JzIChhbmQgYmluYXJ5ICsvLSBwcmV0ZW5kaW5nIHRvIGJlIHVuYXJ5KSBzcGVjaWFsIGNhc2VzXG5cbiAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzcGFjZV9hZnRlciA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJzsnICYmIGlzX2V4cHJlc3Npb24oZmxhZ3MubW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yICg7OyArK2kpXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICBeXl5cbiAgICAgICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9FWFBSJykge1xuICAgICAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAoaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJy0tJywgJy0nXSkgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJy0tJywgJy0nXSkpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJysrJywgJysnXSkgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJysrJywgJysnXSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICgoZmxhZ3MubW9kZSA9PT0gTU9ERS5CbG9ja1N0YXRlbWVudCB8fCBmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkgJiYgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJ3snIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJzsnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyB7IGZvbzsgLS1pIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gZm9vKCk7IC0tYmFyO1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICc6Jykge1xuICAgICAgICAgICAgICAgIGlmIChmbGFncy50ZXJuYXJ5X2RlcHRoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbG9uIGlzIGludmFsaWQgamF2YXNjcmlwdCBvdXRzaWRlIG9mIHRlcm5hcnkgYW5kIG9iamVjdCwgYnV0IGRvIG91ciBiZXN0IHRvIGd1ZXNzIHdoYXQgd2FzIG1lYW50LlxuICAgICAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy50ZXJuYXJ5X2RlcHRoIC09IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICc/Jykge1xuICAgICAgICAgICAgICAgIGZsYWdzLnRlcm5hcnlfZGVwdGggKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnKicgJiYgbGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNwYWNlX2FmdGVyID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiB8fCBzcGFjZV9iZWZvcmU7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHNwYWNlX2FmdGVyO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2Jsb2NrX2NvbW1lbnQoKSB7XG4gICAgICAgICAgICB2YXIgbGluZXMgPSBzcGxpdF9uZXdsaW5lcyhjdXJyZW50X3Rva2VuLnRleHQpO1xuICAgICAgICAgICAgdmFyIGo7IC8vIGl0ZXJhdG9yIGZvciB0aGlzIGNhc2VcbiAgICAgICAgICAgIHZhciBqYXZhZG9jID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgc3Rhcmxlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBsYXN0SW5kZW50ID0gY3VycmVudF90b2tlbi53aGl0ZXNwYWNlX2JlZm9yZS5qb2luKCcnKTtcbiAgICAgICAgICAgIHZhciBsYXN0SW5kZW50TGVuZ3RoID0gbGFzdEluZGVudC5sZW5ndGg7XG5cbiAgICAgICAgICAgIC8vIGJsb2NrIGNvbW1lbnQgc3RhcnRzIHdpdGggYSBuZXcgbGluZVxuICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGlmIChhbGxfbGluZXNfc3RhcnRfd2l0aChsaW5lcy5zbGljZSgxKSwgJyonKSkge1xuICAgICAgICAgICAgICAgICAgICBqYXZhZG9jID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZWFjaF9saW5lX21hdGNoZXNfaW5kZW50KGxpbmVzLnNsaWNlKDEpLCBsYXN0SW5kZW50KSkge1xuICAgICAgICAgICAgICAgICAgICBzdGFybGVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmaXJzdCBsaW5lIGFsd2F5cyBpbmRlbnRlZFxuICAgICAgICAgICAgcHJpbnRfdG9rZW4obGluZXNbMF0pO1xuICAgICAgICAgICAgZm9yIChqID0gMTsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGphdmFkb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gamF2YWRvYzogcmVmb3JtYXQgYW5kIHJlLWluZGVudFxuICAgICAgICAgICAgICAgICAgICBwcmludF90b2tlbignICcgKyB0cmltKGxpbmVzW2pdKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdGFybGVzcyAmJiBsaW5lc1tqXS5sZW5ndGggPiBsYXN0SW5kZW50TGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0YXJsZXNzOiByZS1pbmRlbnQgbm9uLWVtcHR5IGNvbnRlbnQsIGF2b2lkaW5nIHRyaW1cbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4obGluZXNbal0uc3Vic3RyaW5nKGxhc3RJbmRlbnRMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBub3JtYWwgY29tbWVudHMgb3V0cHV0IHJhd1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuYWRkX3Rva2VuKGxpbmVzW2pdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZvciBjb21tZW50cyBvZiBtb3JlIHRoYW4gb25lIGxpbmUsIG1ha2Ugc3VyZSB0aGVyZSdzIGEgbmV3IGxpbmUgYWZ0ZXJcbiAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2lubGluZV9jb21tZW50KCkge1xuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfY29tbWVudCgpIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dHB1dC50cmltKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9kb3QoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaXNfc3BlY2lhbF93b3JkKGZsYWdzLmxhc3RfdGV4dCkpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYWxsb3cgcHJlc2VydmVkIG5ld2xpbmVzIGJlZm9yZSBkb3RzIGluIGdlbmVyYWxcbiAgICAgICAgICAgICAgICAvLyBmb3JjZSBuZXdsaW5lcyBvbiBkb3RzIGFmdGVyIGNsb3NlIHBhcmVuIHdoZW4gYnJlYWtfY2hhaW5lZCAtIGZvciBiYXIoKS5iYXooKVxuICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoZmxhZ3MubGFzdF90ZXh0ID09PSAnKScgJiYgb3B0LmJyZWFrX2NoYWluZWRfbWV0aG9kcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfdW5rbm93bigpIHtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHRbY3VycmVudF90b2tlbi50ZXh0Lmxlbmd0aCAtIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9lb2YoKSB7XG4gICAgICAgICAgICAvLyBVbndpbmQgYW55IG9wZW4gc3RhdGVtZW50c1xuICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBPdXRwdXRMaW5lKCkge1xuICAgICAgICB2YXIgY2hhcmFjdGVyX2NvdW50ID0gMDtcbiAgICAgICAgdmFyIGxpbmVfaXRlbXMgPSBbXTtcblxuICAgICAgICB0aGlzLmdldF9jaGFyYWN0ZXJfY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGFyYWN0ZXJfY291bnQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdldF9pdGVtX2NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZV9pdGVtcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdldF9vdXRwdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBsaW5lX2l0ZW1zLmpvaW4oJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAobGluZV9pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGxpbmVfaXRlbXNbbGluZV9pdGVtcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wdXNoID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgICAgICAgIGxpbmVfaXRlbXMucHVzaChpbnB1dCk7XG4gICAgICAgICAgICBjaGFyYWN0ZXJfY291bnQgKz0gaW5wdXQubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZW1vdmVfaW5kZW50ID0gZnVuY3Rpb24oaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgdmFyIHNwbGljZV9pbmRleCA9IDA7XG5cbiAgICAgICAgICAgIC8vIHNraXAgZW1wdHkgbGluZXNcbiAgICAgICAgICAgIGlmIChsaW5lX2l0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2tpcCB0aGUgcHJlaW5kZW50IHN0cmluZyBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoYmFzZUluZGVudFN0cmluZyAmJiBsaW5lX2l0ZW1zWzBdID09PSBiYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgc3BsaWNlX2luZGV4ID0gMTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVtb3ZlIG9uZSBpbmRlbnQsIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChsaW5lX2l0ZW1zW3NwbGljZV9pbmRleF0gPT09IGluZGVudF9zdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJfY291bnQgLT0gbGluZV9pdGVtc1tzcGxpY2VfaW5kZXhdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBsaW5lX2l0ZW1zLnNwbGljZShzcGxpY2VfaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50cmltID0gZnVuY3Rpb24oaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgd2hpbGUgKHRoaXMuZ2V0X2l0ZW1fY291bnQoKSAmJlxuICAgICAgICAgICAgICAgICh0aGlzLmxhc3QoKSA9PT0gJyAnIHx8XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdCgpID09PSBpbmRlbnRfc3RyaW5nIHx8XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdCgpID09PSBiYXNlSW5kZW50U3RyaW5nKSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gbGluZV9pdGVtcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJfY291bnQgLT0gaXRlbS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBPdXRwdXQoaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICB2YXIgbGluZXMgPVtdO1xuICAgICAgICB0aGlzLmJhc2VJbmRlbnRTdHJpbmcgPSBiYXNlSW5kZW50U3RyaW5nO1xuICAgICAgICB0aGlzLmN1cnJlbnRfbGluZSA9IG51bGw7XG4gICAgICAgIHRoaXMuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5nZXRfbGluZV9udW1iZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBsaW5lcy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2luZyBvYmplY3QgaW5zdGVhZCBvZiBzdHJpbmcgdG8gYWxsb3cgZm9yIGxhdGVyIGV4cGFuc2lvbiBvZiBpbmZvIGFib3V0IGVhY2ggbGluZVxuICAgICAgICB0aGlzLmFkZF9uZXdfbGluZSA9IGZ1bmN0aW9uKGZvcmNlX25ld2xpbmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldF9saW5lX251bWJlcigpID09PSAxICYmIHRoaXMuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIG5vIG5ld2xpbmUgb24gc3RhcnQgb2YgZmlsZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZm9yY2VfbmV3bGluZSB8fCAhdGhpcy5qdXN0X2FkZGVkX25ld2xpbmUoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lID0gbmV3IE91dHB1dExpbmUoKTtcbiAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKHRoaXMuY3VycmVudF9saW5lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB0aGlzLmFkZF9uZXdfbGluZSh0cnVlKTtcblxuICAgICAgICB0aGlzLmdldF9jb2RlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc3dlZXRfY29kZSA9IGxpbmVzWzBdLmdldF9vdXRwdXQoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGxpbmVfaW5kZXggPSAxOyBsaW5lX2luZGV4IDwgbGluZXMubGVuZ3RoOyBsaW5lX2luZGV4KyspIHtcbiAgICAgICAgICAgICAgICBzd2VldF9jb2RlICs9ICdcXG4nICsgbGluZXNbbGluZV9pbmRleF0uZ2V0X291dHB1dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dlZXRfY29kZSA9IHN3ZWV0X2NvZGUucmVwbGFjZSgvW1xcclxcblxcdCBdKyQvLCAnJyk7XG4gICAgICAgICAgICByZXR1cm4gc3dlZXRfY29kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYWRkX2luZGVudF9zdHJpbmcgPSBmdW5jdGlvbihpbmRlbnRhdGlvbl9sZXZlbCkge1xuICAgICAgICAgICAgaWYgKGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS5wdXNoKGJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOZXZlciBpbmRlbnQgeW91ciBmaXJzdCBvdXRwdXQgaW5kZW50IGF0IHRoZSBzdGFydCBvZiB0aGUgZmlsZVxuICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGVudGF0aW9uX2xldmVsOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUucHVzaChpbmRlbnRfc3RyaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFkZF90b2tlbiA9IGZ1bmN0aW9uKHByaW50YWJsZV90b2tlbikge1xuICAgICAgICAgICAgdGhpcy5hZGRfc3BhY2VfYmVmb3JlX3Rva2VuKCk7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS5wdXNoKHByaW50YWJsZV90b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFkZF9zcGFjZV9iZWZvcmVfdG9rZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNwYWNlX2JlZm9yZV90b2tlbiAmJiB0aGlzLmN1cnJlbnRfbGluZS5nZXRfaXRlbV9jb3VudCgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxhc3Rfb3V0cHV0ID0gdGhpcy5jdXJyZW50X2xpbmUubGFzdCgpO1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X291dHB1dCAhPT0gJyAnICYmIGxhc3Rfb3V0cHV0ICE9PSBpbmRlbnRfc3RyaW5nICYmIGxhc3Rfb3V0cHV0ICE9PSBiYXNlSW5kZW50U3RyaW5nKSB7IC8vIHByZXZlbnQgb2NjYXNzaW9uYWwgZHVwbGljYXRlIHNwYWNlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnB1c2goJyAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwYWNlX2JlZm9yZV90b2tlbiA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZW1vdmVfcmVkdW5kYW50X2luZGVudGF0aW9uID0gZnVuY3Rpb24gKGZyYW1lKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGltcGxlbWVudGF0aW9uIGlzIGVmZmVjdGl2ZSBidXQgaGFzIHNvbWUgaXNzdWVzOlxuICAgICAgICAgICAgLy8gICAgIC0gbGVzcyB0aGFuIGdyZWF0IHBlcmZvcm1hbmNlIGR1ZSB0byBhcnJheSBzcGxpY2luZ1xuICAgICAgICAgICAgLy8gICAgIC0gY2FuIGNhdXNlIGxpbmUgd3JhcCB0byBoYXBwZW4gdG9vIHNvb24gZHVlIHRvIGluZGVudCByZW1vdmFsXG4gICAgICAgICAgICAvLyAgICAgICAgICAgYWZ0ZXIgd3JhcCBwb2ludHMgYXJlIGNhbGN1bGF0ZWRcbiAgICAgICAgICAgIC8vIFRoZXNlIGlzc3VlcyBhcmUgbWlub3IgY29tcGFyZWQgdG8gdWdseSBpbmRlbnRhdGlvbi5cblxuICAgICAgICAgICAgaWYgKGZyYW1lLm11bHRpbGluZV9mcmFtZSB8fFxuICAgICAgICAgICAgICAgIGZyYW1lLm1vZGUgPT09IE1PREUuRm9ySW5pdGlhbGl6ZXIgfHxcbiAgICAgICAgICAgICAgICBmcmFtZS5tb2RlID09PSBNT0RFLkNvbmRpdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyByZW1vdmUgb25lIGluZGVudCBmcm9tIGVhY2ggbGluZSBpbnNpZGUgdGhpcyBzZWN0aW9uXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBmcmFtZS5zdGFydF9saW5lX2luZGV4O1xuICAgICAgICAgICAgdmFyIGxpbmU7XG5cbiAgICAgICAgICAgIHZhciBvdXRwdXRfbGVuZ3RoID0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgb3V0cHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgIGxpbmVzW2luZGV4XS5yZW1vdmVfaW5kZW50KGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRyaW0gPSBmdW5jdGlvbihlYXRfbmV3bGluZXMpIHtcbiAgICAgICAgICAgIGVhdF9uZXdsaW5lcyA9IChlYXRfbmV3bGluZXMgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IGVhdF9uZXdsaW5lcztcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUudHJpbShpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKTtcblxuICAgICAgICAgICAgd2hpbGUgKGVhdF9uZXdsaW5lcyAmJiBsaW5lcy5sZW5ndGggPiAxICYmXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUuZ2V0X2l0ZW1fY291bnQoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGxpbmVzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV1cbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS50cmltKGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5qdXN0X2FkZGVkX25ld2xpbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRfbGluZS5nZXRfaXRlbV9jb3VudCgpID09PSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5qdXN0X2FkZGVkX2JsYW5rbGluZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOyAvLyBzdGFydCBvZiB0aGUgZmlsZSBhbmQgbmV3bGluZSA9IGJsYW5rXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGxpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAyXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluZS5nZXRfaXRlbV9jb3VudCgpID09PSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICB2YXIgVG9rZW4gPSBmdW5jdGlvbih0eXBlLCB0ZXh0LCBuZXdsaW5lcywgd2hpdGVzcGFjZV9iZWZvcmUsIG1vZGUsIHBhcmVudCkge1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmNvbW1lbnRzX2JlZm9yZSA9IFtdO1xuICAgICAgICB0aGlzLm5ld2xpbmVzID0gbmV3bGluZXMgfHwgMDtcbiAgICAgICAgdGhpcy53YW50ZWRfbmV3bGluZSA9IG5ld2xpbmVzID4gMDtcbiAgICAgICAgdGhpcy53aGl0ZXNwYWNlX2JlZm9yZSA9IHdoaXRlc3BhY2VfYmVmb3JlIHx8IFtdO1xuICAgICAgICB0aGlzLnBhcmVudCA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9rZW5pemVyKGlucHV0LCBvcHRzLCBpbmRlbnRfc3RyaW5nKSB7XG5cbiAgICAgICAgdmFyIHdoaXRlc3BhY2UgPSBcIlxcblxcclxcdCBcIi5zcGxpdCgnJyk7XG4gICAgICAgIHZhciBkaWdpdCA9IC9bMC05XS87XG5cbiAgICAgICAgdmFyIHB1bmN0ID0gKCcrIC0gKiAvICUgJiArKyAtLSA9ICs9IC09ICo9IC89ICU9ID09ID09PSAhPSAhPT0gPiA8ID49IDw9ID4+IDw8ID4+PiA+Pj49ID4+PSA8PD0gJiYgJj0gfCB8fCAhIH4gLCA6ID8gXiBePSB8PSA6OiA9PidcbiAgICAgICAgICAgICAgICArJyA8JT0gPCUgJT4gPD89IDw/ID8+Jykuc3BsaXQoJyAnKTsgLy8gdHJ5IHRvIGJlIGEgZ29vZCBib3kgYW5kIHRyeSBub3QgdG8gYnJlYWsgdGhlIG1hcmt1cCBsYW5ndWFnZSBpZGVudGlmaWVyc1xuXG4gICAgICAgIC8vIHdvcmRzIHdoaWNoIHNob3VsZCBhbHdheXMgc3RhcnQgb24gbmV3IGxpbmUuXG4gICAgICAgIHRoaXMubGluZV9zdGFydGVycyA9ICdjb250aW51ZSx0cnksdGhyb3cscmV0dXJuLHZhcixsZXQsY29uc3QsaWYsc3dpdGNoLGNhc2UsZGVmYXVsdCxmb3Isd2hpbGUsYnJlYWssZnVuY3Rpb24seWllbGQsaW1wb3J0LGV4cG9ydCcuc3BsaXQoJywnKTtcbiAgICAgICAgdmFyIHJlc2VydmVkX3dvcmRzID0gdGhpcy5saW5lX3N0YXJ0ZXJzLmNvbmNhdChbJ2RvJywgJ2luJywgJ2Vsc2UnLCAnZ2V0JywgJ3NldCcsICduZXcnLCAnY2F0Y2gnLCAnZmluYWxseScsICd0eXBlb2YnXSk7XG5cbiAgICAgICAgdmFyIG5fbmV3bGluZXMsIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuLCBpbl9odG1sX2NvbW1lbnQsIHRva2VucywgcGFyc2VyX3BvcztcbiAgICAgICAgdmFyIGlucHV0X2xlbmd0aDtcblxuICAgICAgICB0aGlzLnRva2VuaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBjYWNoZSB0aGUgc291cmNlJ3MgbGVuZ3RoLlxuICAgICAgICAgICAgaW5wdXRfbGVuZ3RoID0gaW5wdXQubGVuZ3RoXG4gICAgICAgICAgICBwYXJzZXJfcG9zID0gMDtcbiAgICAgICAgICAgIGluX2h0bWxfY29tbWVudCA9IGZhbHNlXG4gICAgICAgICAgICB0b2tlbnMgPSBbXTtcblxuICAgICAgICAgICAgdmFyIG5leHQsIGxhc3Q7XG4gICAgICAgICAgICB2YXIgdG9rZW5fdmFsdWVzO1xuICAgICAgICAgICAgdmFyIG9wZW4gPSBudWxsO1xuICAgICAgICAgICAgdmFyIG9wZW5fc3RhY2sgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb21tZW50cyA9IFtdO1xuXG4gICAgICAgICAgICB3aGlsZSAoIShsYXN0ICYmIGxhc3QudHlwZSA9PT0gJ1RLX0VPRicpKSB7XG4gICAgICAgICAgICAgICAgdG9rZW5fdmFsdWVzID0gdG9rZW5pemVfbmV4dCgpO1xuICAgICAgICAgICAgICAgIG5leHQgPSBuZXcgVG9rZW4odG9rZW5fdmFsdWVzWzFdLCB0b2tlbl92YWx1ZXNbMF0sIG5fbmV3bGluZXMsIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuKTtcbiAgICAgICAgICAgICAgICB3aGlsZShuZXh0LnR5cGUgPT09ICdUS19JTkxJTkVfQ09NTUVOVCcgfHwgbmV4dC50eXBlID09PSAnVEtfQ09NTUVOVCcgfHxcbiAgICAgICAgICAgICAgICAgICAgbmV4dC50eXBlID09PSAnVEtfQkxPQ0tfQ09NTUVOVCcgfHwgbmV4dC50eXBlID09PSAnVEtfVU5LTk9XTicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudHMucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5fdmFsdWVzID0gdG9rZW5pemVfbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBuZXh0ID0gbmV3IFRva2VuKHRva2VuX3ZhbHVlc1sxXSwgdG9rZW5fdmFsdWVzWzBdLCBuX25ld2xpbmVzLCB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNvbW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0LmNvbW1lbnRzX2JlZm9yZSA9IGNvbW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50cyA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChuZXh0LnR5cGUgPT09ICdUS19TVEFSVF9CTE9DSycgfHwgbmV4dC50eXBlID09PSAnVEtfU1RBUlRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dC5wYXJlbnQgPSBsYXN0O1xuICAgICAgICAgICAgICAgICAgICBvcGVuID0gbmV4dDtcbiAgICAgICAgICAgICAgICAgICAgb3Blbl9zdGFjay5wdXNoKG5leHQpO1xuICAgICAgICAgICAgICAgIH0gIGVsc2UgaWYgKChuZXh0LnR5cGUgPT09ICdUS19FTkRfQkxPQ0snIHx8IG5leHQudHlwZSA9PT0gJ1RLX0VORF9FWFBSJykgJiZcbiAgICAgICAgICAgICAgICAgICAgKG9wZW4gJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgKG5leHQudGV4dCA9PT0gJ10nICYmIG9wZW4udGV4dCA9PT0gJ1snKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKG5leHQudGV4dCA9PT0gJyknICYmIG9wZW4udGV4dCA9PT0gJygnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKG5leHQudGV4dCA9PT0gJ30nICYmIG9wZW4udGV4dCA9PT0gJ30nKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQucGFyZW50ID0gb3Blbi5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIG9wZW4gPSBvcGVuX3N0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKG5leHQpO1xuICAgICAgICAgICAgICAgIGxhc3QgPSBuZXh0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdG9rZW5zO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdG9rZW5pemVfbmV4dCgpIHtcbiAgICAgICAgICAgIHZhciBpLCByZXN1bHRpbmdfc3RyaW5nO1xuXG4gICAgICAgICAgICBuX25ld2xpbmVzID0gMDtcbiAgICAgICAgICAgIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuID0gW107XG5cbiAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbJycsICdUS19FT0YnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxhc3RfdG9rZW47XG4gICAgICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGxhc3RfdG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIHRoZSBzYWtlIG9mIHRva2VuaXppbmcgd2UgY2FuIHByZXRlbmQgdGhhdCB0aGVyZSB3YXMgb24gb3BlbiBicmFjZSB0byBzdGFydFxuICAgICAgICAgICAgICAgIGxhc3RfdG9rZW4gPSBuZXcgVG9rZW4oJ1RLX1NUQVJUX0JMT0NLJywgJ3snKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcblxuICAgICAgICAgICAgd2hpbGUgKGluX2FycmF5KGMsIHdoaXRlc3BhY2UpKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgbl9uZXdsaW5lcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbiA9IFtdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobl9uZXdsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gaW5kZW50X3N0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4ucHVzaChpbmRlbnRfc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjICE9PSAnXFxyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4ucHVzaCgnICcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPj0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbJycsICdUS19FT0YnXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRpZ2l0LnRlc3QoYykpIHtcbiAgICAgICAgICAgICAgICB2YXIgYWxsb3dfZGVjaW1hbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGFsbG93X2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBsb2NhbF9kaWdpdCA9IGRpZ2l0O1xuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICcwJyAmJiBwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIC9bWHhdLy50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3dpdGNoIHRvIGhleCBudW1iZXIsIG5vIGRlY2ltYWwgb3IgZSwganVzdCBoZXggZGlnaXRzXG4gICAgICAgICAgICAgICAgICAgIGFsbG93X2RlY2ltYWwgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbF9kaWdpdCA9IC9bMDEyMzQ1Njc4OWFiY2RlZkFCQ0RFRl0vXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2Uga25vdyB0aGlzIGZpcnN0IGxvb3Agd2lsbCBydW4uICBJdCBrZWVwcyB0aGUgbG9naWMgc2ltcGxlci5cbiAgICAgICAgICAgICAgICAgICAgYyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zIC09IDFcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIGRpZ2l0c1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGxvY2FsX2RpZ2l0LnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd19kZWNpbWFsICYmIHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsb3dfZGVjaW1hbCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93X2UgJiYgcGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiAvW0VlXS8udGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgL1srLV0vLnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgYWxsb3dfZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsb3dfZGVjaW1hbCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfV09SRCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYWNvcm4uaXNJZGVudGlmaWVyU3RhcnQoaW5wdXQuY2hhckNvZGVBdChwYXJzZXJfcG9zLTEpKSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChhY29ybi5pc0lkZW50aWZpZXJDaGFyKGlucHV0LmNoYXJDb2RlQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID09PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghKGxhc3RfdG9rZW4udHlwZSA9PT0gJ1RLX0RPVCcgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChsYXN0X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkobGFzdF90b2tlbi50ZXh0LCBbJ3NldCcsICdnZXQnXSkpKVxuICAgICAgICAgICAgICAgICAgICAmJiBpbl9hcnJheShjLCByZXNlcnZlZF93b3JkcykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICdpbicpIHsgLy8gaGFjayBmb3IgJ2luJyBvcGVyYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfT1BFUkFUT1InXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19SRVNFUlZFRCddO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1dPUkQnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcoJyB8fCBjID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19TVEFSVF9FWFBSJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnKScgfHwgYyA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfRU5EX0VYUFInXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICd7Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1NUQVJUX0JMT0NLJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19FTkRfQkxPQ0snXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICc7Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1NFTUlDT0xPTiddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICAvLyBwZWVrIGZvciBjb21tZW50IC8qIC4uLiAqL1xuICAgICAgICAgICAgICAgIHZhciBpbmxpbmVfY29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmICEoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnKicgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MgKyAxKSAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcyArIDEpID09PSAnLycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IFwiXFxuXCIgfHwgYyA9PT0gXCJcXHJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmxpbmVfY29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPj0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmxpbmVfY29tbWVudCAmJiBuX25ld2xpbmVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWycvKicgKyBjb21tZW50ICsgJyovJywgJ1RLX0lOTElORV9DT01NRU5UJ107XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWycvKicgKyBjb21tZW50ICsgJyovJywgJ1RLX0JMT0NLX0NPTU1FTlQnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBwZWVrIGZvciBjb21tZW50IC8vIC4uLlxuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gYztcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSAhPT0gJ1xccicgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA+PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2NvbW1lbnQsICdUS19DT01NRU5UJ107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnYCcgfHwgYyA9PT0gXCInXCIgfHwgYyA9PT0gJ1wiJyB8fCAvLyBzdHJpbmdcbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgIChjID09PSAnLycpIHx8IC8vIHJlZ2V4cFxuICAgICAgICAgICAgICAgICAgICAob3B0cy5lNHggJiYgYyA9PT0gXCI8XCIgJiYgaW5wdXQuc2xpY2UocGFyc2VyX3BvcyAtIDEpLm1hdGNoKC9ePChbLWEtekEtWjowLTlfLl0rfHtbXnt9XSp9fCFcXFtDREFUQVxcW1tcXHNcXFNdKj9cXF1cXF0pXFxzKihbLWEtekEtWjowLTlfLl0rPSgnW14nXSonfFwiW15cIl0qXCJ8e1tee31dKn0pXFxzKikqXFwvP1xccyo+LykpIC8vIHhtbFxuICAgICAgICAgICAgICAgICkgJiYgKCAvLyByZWdleCBhbmQgeG1sIGNhbiBvbmx5IGFwcGVhciBpbiBzcGVjaWZpYyBsb2NhdGlvbnMgZHVyaW5nIHBhcnNpbmdcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShsYXN0X3Rva2VuLnRleHQgLCBbJ3JldHVybicsICdjYXNlJywgJ3Rocm93JywgJ2Vsc2UnLCAnZG8nLCAndHlwZW9mJywgJ3lpZWxkJ10pKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90b2tlbi50eXBlID09PSAnVEtfRU5EX0VYUFInICYmIGxhc3RfdG9rZW4udGV4dCA9PT0gJyknICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0X3Rva2VuLnBhcmVudCAmJiBsYXN0X3Rva2VuLnBhcmVudC50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGxhc3RfdG9rZW4ucGFyZW50LnRleHQsIFsnaWYnLCAnd2hpbGUnLCAnZm9yJ10pKSB8fFxuICAgICAgICAgICAgICAgICAgICAoaW5fYXJyYXkobGFzdF90b2tlbi50eXBlLCBbJ1RLX0NPTU1FTlQnLCAnVEtfU1RBUlRfRVhQUicsICdUS19TVEFSVF9CTE9DSycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnVEtfRU5EX0JMT0NLJywgJ1RLX09QRVJBVE9SJywgJ1RLX0VRVUFMUycsICdUS19FT0YnLCAnVEtfU0VNSUNPTE9OJywgJ1RLX0NPTU1BJ1xuICAgICAgICAgICAgICAgICAgICBdKSlcbiAgICAgICAgICAgICAgICApKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2VwID0gYyxcbiAgICAgICAgICAgICAgICAgICAgZXNjID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGhhc19jaGFyX2VzY2FwZXMgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgPSBjO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNlcCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZSByZWdleHBcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgdmFyIGluX2NoYXJfY2xhc3MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKGVzYyB8fCBpbl9jaGFyX2NsYXNzIHx8IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSAhPT0gc2VwKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICFhY29ybi5uZXdsaW5lLnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlc2MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2MgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICdcXFxcJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5fY2hhcl9jbGFzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICddJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbl9jaGFyX2NsYXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0cy5lNHggJiYgc2VwID09PSAnPCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIGU0eCB4bWwgbGl0ZXJhbHNcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgdmFyIHhtbFJlZ0V4cCA9IC88KFxcLz8pKFstYS16QS1aOjAtOV8uXSt8e1tee31dKn18IVxcW0NEQVRBXFxbW1xcc1xcU10qP1xcXVxcXSlcXHMqKFstYS16QS1aOjAtOV8uXSs9KCdbXiddKid8XCJbXlwiXSpcInx7W157fV0qfSlcXHMqKSooXFwvPylcXHMqPi9nO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeG1sU3RyID0gaW5wdXQuc2xpY2UocGFyc2VyX3BvcyAtIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSB4bWxSZWdFeHAuZXhlYyh4bWxTdHIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2ggJiYgbWF0Y2guaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByb290VGFnID0gbWF0Y2hbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGVwdGggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzRW5kVGFnID0gISEgbWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ05hbWUgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNTaW5nbGV0b25UYWcgPSAoICEhIG1hdGNoW21hdGNoLmxlbmd0aCAtIDFdKSB8fCAodGFnTmFtZS5zbGljZSgwLCA4KSA9PT0gXCIhW0NEQVRBW1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFnTmFtZSA9PT0gcm9vdFRhZyAmJiAhaXNTaW5nbGV0b25UYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzRW5kVGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLWRlcHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKytkZXB0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVwdGggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2ggPSB4bWxSZWdFeHAuZXhlYyh4bWxTdHIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHhtbExlbmd0aCA9IG1hdGNoID8gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGggOiB4bWxTdHIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSB4bWxMZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4bWxTdHIuc2xpY2UoMCwgeG1sTGVuZ3RoKSwgXCJUS19TVFJJTkdcIl07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIFRlbXBsYXRlIHN0cmluZ3MgY2FuIHRyYXZlcnMgbGluZXMgd2l0aG91dCBlc2NhcGUgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICAgICAgLy8gT3RoZXIgc3RyaW5ncyBjYW5ub3RcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZXNjIHx8IChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09IHNlcCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChzZXAgPT09ICdgJyB8fCAhYWNvcm4ubmV3bGluZS50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVzYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICd4JyB8fCBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNfY2hhcl9lc2NhcGVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ1xcXFwnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaGFzX2NoYXJfZXNjYXBlcyAmJiBvcHRzLnVuZXNjYXBlX3N0cmluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyA9IHVuZXNjYXBlX3N0cmluZyhyZXN1bHRpbmdfc3RyaW5nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09IHNlcCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IHNlcDtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXAgPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVnZXhwcyBtYXkgaGF2ZSBtb2RpZmllcnMgL3JlZ2V4cC9NT0QgLCBzbyBmZXRjaCB0aG9zZSwgdG9vXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IFtnaW1dIGFyZSB2YWxpZCwgYnV0IGlmIHRoZSB1c2VyIHB1dHMgaW4gZ2FyYmFnZSwgZG8gd2hhdCB3ZSBjYW4gdG8gdGFrZSBpdC5cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGFjb3JuLmlzSWRlbnRpZmllclN0YXJ0KGlucHV0LmNoYXJDb2RlQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBbcmVzdWx0aW5nX3N0cmluZywgJ1RLX1NUUklORyddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJyMnKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gMCAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICchJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBzaGViYW5nXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgPSBjO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBjICE9PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3RyaW0ocmVzdWx0aW5nX3N0cmluZykgKyAnXFxuJywgJ1RLX1VOS05PV04nXTtcbiAgICAgICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICAgICAgLy8gU3BpZGVybW9ua2V5LXNwZWNpZmljIHNoYXJwIHZhcmlhYmxlcyBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL0VuL1NoYXJwX3ZhcmlhYmxlc19pbl9KYXZhU2NyaXB0XG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL214ci5tb3ppbGxhLm9yZy9tb3ppbGxhLWNlbnRyYWwvc291cmNlL2pzL3NyYy9qc3NjYW4uY3BwIGFyb3VuZCBsaW5lIDE5MzVcbiAgICAgICAgICAgICAgICB2YXIgc2hhcnAgPSAnIyc7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgZGlnaXQudGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFycCArPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9IHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGMgIT09ICcjJyAmJiBjICE9PSAnPScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJyMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ1snICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zICsgMSkgPT09ICddJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hhcnAgKz0gJ1tdJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICd7JyAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcyArIDEpID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYXJwICs9ICd7fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtzaGFycCwgJ1RLX1dPUkQnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnPCcgJiYgaW5wdXQuc3Vic3RyaW5nKHBhcnNlcl9wb3MgLSAxLCBwYXJzZXJfcG9zICsgMykgPT09ICc8IS0tJykge1xuICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMztcbiAgICAgICAgICAgICAgICBjID0gJzwhLS0nO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09ICdcXG4nICYmIHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5faHRtbF9jb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19DT01NRU5UJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnLScgJiYgaW5faHRtbF9jb21tZW50ICYmIGlucHV0LnN1YnN0cmluZyhwYXJzZXJfcG9zIC0gMSwgcGFyc2VyX3BvcyArIDIpID09PSAnLS0+Jykge1xuICAgICAgICAgICAgICAgIGluX2h0bWxfY29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMjtcbiAgICAgICAgICAgICAgICByZXR1cm4gWyctLT4nLCAnVEtfQ09NTUVOVCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfRE9UJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpbl9hcnJheShjLCBwdW5jdCkpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBpbl9hcnJheShjICsgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpLCBwdW5jdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPj0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjID09PSAnLCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfQ09NTUEnXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc9Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19FUVVBTFMnXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19PUEVSQVRPUiddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfVU5LTk9XTiddO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiB1bmVzY2FwZV9zdHJpbmcocykge1xuICAgICAgICAgICAgdmFyIGVzYyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIG91dCA9ICcnLFxuICAgICAgICAgICAgICAgIHBvcyA9IDAsXG4gICAgICAgICAgICAgICAgc19oZXggPSAnJyxcbiAgICAgICAgICAgICAgICBlc2NhcGVkID0gMCxcbiAgICAgICAgICAgICAgICBjO1xuXG4gICAgICAgICAgICB3aGlsZSAoZXNjIHx8IHBvcyA8IHMubGVuZ3RoKSB7XG5cbiAgICAgICAgICAgICAgICBjID0gcy5jaGFyQXQocG9zKTtcbiAgICAgICAgICAgICAgICBwb3MrKztcblxuICAgICAgICAgICAgICAgIGlmIChlc2MpIHtcbiAgICAgICAgICAgICAgICAgICAgZXNjID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAneCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbXBsZSBoZXgtZXNjYXBlIFxceDI0XG4gICAgICAgICAgICAgICAgICAgICAgICBzX2hleCA9IHMuc3Vic3RyKHBvcywgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVuaWNvZGUtZXNjYXBlLCBcXHUyMTM0XG4gICAgICAgICAgICAgICAgICAgICAgICBzX2hleCA9IHMuc3Vic3RyKHBvcywgNCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgKz0gNDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvbWUgY29tbW9uIGVzY2FwZSwgZS5nIFxcblxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXFxcJyArIGM7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNfaGV4Lm1hdGNoKC9eWzAxMjM0NTY3ODlhYmNkZWZBQkNERUZdKyQvKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc29tZSB3ZWlyZCBlc2NhcGluZywgYmFpbCBvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZWF2aW5nIHdob2xlIHN0cmluZyBpbnRhY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZXNjYXBlZCA9IHBhcnNlSW50KHNfaGV4LCAxNik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVzY2FwZWQgPj0gMHgwMCAmJiBlc2NhcGVkIDwgMHgyMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGVhdmUgMHgwMC4uLjB4MWYgZXNjYXBlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICd4Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnXFxcXHgnICsgc19oZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnXFxcXHUnICsgc19oZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlc2NhcGVkID09PSAweDIyIHx8IGVzY2FwZWQgPT09IDB4MjcgfHwgZXNjYXBlZCA9PT0gMHg1Yykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlLXF1b3RlLCBhcG9zdHJvcGhlLCBiYWNrc2xhc2ggLSBlc2NhcGUgdGhlc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnXFxcXCcgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGVzY2FwZWQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICd4JyAmJiBlc2NhcGVkID4gMHg3ZSAmJiBlc2NhcGVkIDw9IDB4ZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGJhaWwgb3V0IG9uIFxceDdmLi5cXHhmZixcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxlYXZpbmcgd2hvbGUgc3RyaW5nIGVzY2FwZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBpdCdzIHByb2JhYmx5IGNvbXBsZXRlbHkgYmluYXJ5XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGVzY2FwZWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXNjID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gYztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9XG5cbiAgICB9XG5cblxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQU1EICggaHR0cHM6Ly9naXRodWIuY29tL2FtZGpzL2FtZGpzLWFwaS93aWtpL0FNRCNkZWZpbmVhbWQtcHJvcGVydHktIClcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGpzX2JlYXV0aWZ5OiBqc19iZWF1dGlmeSB9O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBDb21tb25KUy4gSnVzdCBwdXQgdGhpcyBmaWxlIHNvbWV3aGVyZSBvbiB5b3VyIHJlcXVpcmUucGF0aHNcbiAgICAgICAgLy8gYW5kIHlvdSB3aWxsIGJlIGFibGUgdG8gYHZhciBqc19iZWF1dGlmeSA9IHJlcXVpcmUoXCJiZWF1dGlmeVwiKS5qc19iZWF1dGlmeWAuXG4gICAgICAgIGV4cG9ydHMuanNfYmVhdXRpZnkgPSBqc19iZWF1dGlmeTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcnVubmluZyBhIHdlYiBwYWdlIGFuZCBkb24ndCBoYXZlIGVpdGhlciBvZiB0aGUgYWJvdmUsIGFkZCBvdXIgb25lIGdsb2JhbFxuICAgICAgICB3aW5kb3cuanNfYmVhdXRpZnkgPSBqc19iZWF1dGlmeTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gSWYgd2UgZG9uJ3QgZXZlbiBoYXZlIHdpbmRvdywgdHJ5IGdsb2JhbC5cbiAgICAgICAgZ2xvYmFsLmpzX2JlYXV0aWZ5ID0ganNfYmVhdXRpZnk7XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcbnZhciB3YXRjaGVyID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAvLyRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9cbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6ICdBcHBDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9hcHAvdmlld3MvaW5kZXguaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGZzUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBmaWxlc3lzdGVtLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZXN5c3RlbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgZnNXYXRjaGVyUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB3YXRjaGVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUod2F0Y2hlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuaG9tZScsIHtcbiAgICAgIHVybDogJycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvYXBwL3ZpZXdzL2FwcC5odG1sJ1xuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRGJTdGF0ZXMoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAuc3RhdGUoJ2RiJywge1xuICAgICAgICB1cmw6ICcvZGInLFxuICAgICAgICBjb250cm9sbGVyOiAnRGJDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwnLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdNb2RlbEN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgbW9kZWxQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuZWRpdCcsIHtcbiAgICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLWVkaXRvci5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgICB1cmw6ICcvOnNjaGVtYUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTY2hlbWFDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvc2NoZW1hLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgICB1cmw6ICcvOmtleUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdLZXlDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwva2V5Lmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5kaWFncmFtJywge1xuICAgICAgICB1cmw6ICcjZGlhZ3JhbScsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICAvL2NvbnRyb2xsZXI6ICdEaWFncmFtQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlckFwaVN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnYXBpJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL2FwaS86YXBpTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYXBpLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgYXBpUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICByZXR1cm4gd2luZG93Ll9hcGk7IC8vJGh0dHAuZ2V0KCcvJyArICRzdGF0ZVBhcmFtcy5tb2RlbE5hbWUgKyAnLmpzb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChhcGkvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGktaG9tZS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJy9kaWFncmFtJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaURpYWdyYW1DdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvZGlhZ3JhbS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvY29udHJvbGxlcidcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLWhvbWUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86Y29udHJvbGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDb250cm9sbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5pdGVtLmhhbmRsZXInLCB7XG4gICAgICAgIHVybDogJy86aGFuZGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAneEBhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2hhbmRsZXJAYXBpLmNvbnRyb2xsZXIuaXRlbSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PSdoYW5kbGVyJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaS5jb250cm9sbGVyLml0ZW0nLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUhhbmRsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2hhbmRsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZScsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9yb3V0ZSdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUtaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpUm91dGVDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbS5hY3Rpb24nLCB7XG4gICAgICAgIHVybDogJy86YWN0aW9uSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUFjdGlvbkN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYWN0aW9uLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9XG5cbn07XG4iLCJ2YXIgQXBwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvYXBwJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIHBhcnNlQ29va2llID0gcmVxdWlyZSgnY29va2llJykucGFyc2U7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsIGZzLCB3YXRjaGVyLCBmaWxlU2VydmljZSwgZGlhbG9nLCBjb2xvclNlcnZpY2UsIHNlc3Npb25TZXJ2aWNlKSB7XG5cbiAgdmFyIG1vZGVsID0gbmV3IEFwcE1vZGVsKHtcbiAgICBmczogZnMsXG4gICAgd2F0Y2hlcjogd2F0Y2hlcixcbiAgICBzZXNzaW9uU2VydmljZTogc2Vzc2lvblNlcnZpY2UsXG4gICAgcmVjZW50RmlsZXM6IGFuZ3VsYXIuZnJvbUpzb24ocGFyc2VDb29raWUoZG9jdW1lbnQuY29va2llKS5yZWNlbnRGaWxlcylcbiAgfSk7XG5cbiAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG5cbiAgLy8gTGlzdGVuIG91dCBmb3IgY2hhbmdlcyB0byB0aGUgZmlsZSBzeXN0ZW1cbiAgd2F0Y2hlci5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG4gICAgY29uc29sZS5sb2coJ2ZzIGNoYW5nZScpO1xuICAgICRzY29wZS4kYXBwbHkoKTtcbiAgfSk7XG5cbiAgdmFyIHBhY2thZ2VGaWxlID0gbW9kZWwucGFja2FnZUZpbGU7XG4gIGlmIChwYWNrYWdlRmlsZSkge1xuICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHBhY2thZ2VGaWxlLnBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBtb2RlbC5wYWNrYWdlID0gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIHJlYWRtZUZpbGUgPSBtb2RlbC5yZWFkbWVGaWxlO1xuICBpZiAocmVhZG1lRmlsZSkge1xuICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHJlYWRtZUZpbGUucGF0aCkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIG1vZGVsLnJlYWRtZSA9IHJlcztcbiAgICB9KTtcbiAgfVxuXG4gICRzY29wZS5vblNlYXJjaEZvcm1TdWJtaXQgPSBmdW5jdGlvbigpIHtcbiAgICAkc3RhdGUuZ28oJ2FwcC5mcy5zZWFyY2gnLCB7XG4gICAgICBxOiBzZWFyY2hGb3JtLnEudmFsdWVcbiAgICB9KTtcbiAgfTtcbiAgLy9cbiAgLy8gJHNjb3BlLmZpbGVVcmwgPSBmdW5jdGlvbihmaWxlKSB7XG4gIC8vICAgcmV0dXJuICRzdGF0ZS5ocmVmKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gIC8vICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZmlsZS5wYXRoIHx8IGZpbGUpXG4gIC8vICAgfSk7XG4gIC8vIH07XG5cbiAgJHNjb3BlLmdvdG9GaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICAgIHJldHVybiAkc3RhdGUudHJhbnNpdGlvblRvKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZmlsZS5wYXRoIHx8IGZpbGUpXG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmZpbGVQYXJhbXMgPSBmdW5jdGlvbihmaWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhmaWxlLnBhdGgpXG4gICAgfTtcbiAgfTtcblxuXG4gICRzY29wZS5kaXJVcmwgPSBmdW5jdGlvbihkaXIpIHtcbiAgICByZXR1cm4gJHN0YXRlLmhyZWYoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZGlyLnBhdGgpXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29sb3IgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYyBjb2xvcnMgZnJvbSBhIHN0cmluZ1xuICAkc2NvcGUuY29sb3IgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLmhleCgpIDogJyc7XG4gIH07XG4gICRzY29wZS5jb2xvclRleHQgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLnJlYWRhYmxlKCkuaGV4KCkgOiAnJztcbiAgfTtcblxuICBmdW5jdGlvbiBzYXZlU2Vzc2lvbihzZXNzaW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBwYXRoID0gc2Vzc2lvbi5wYXRoO1xuICAgIHZhciBlZGl0U2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcbiAgICB2YXIgY29udGVudHMgPSBlZGl0U2Vzc2lvbi5nZXRWYWx1ZSgpO1xuXG4gICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZScsIHBhdGgpO1xuXG4gICAgZnMud3JpdGVGaWxlKHBhdGgsIGNvbnRlbnRzLCBmdW5jdGlvbihyc3ApIHtcblxuICAgICAgaWYgKHJzcC5lcnIpIHtcblxuICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gV3JpdGUgRXJyb3InLFxuICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJzcC5lcnIpO1xuICAgICAgICBjb25zb2xlLmxvZygnd3JpdGVGaWxlIEZhaWxlZCcsIHBhdGgsIHJzcC5lcnIpO1xuXG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZUZpbGUgU3VjY2VlZGVkJywgcGF0aCk7XG5cbiAgICAgICAgc2Vzc2lvbi5tYXJrQ2xlYW4oKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBzZXNzaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kYXBwbHkoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG5cbiAgJHNjb3BlLnNhdmVTZXNzaW9uID0gZnVuY3Rpb24oc2Vzc2lvbikge1xuICAgIHNhdmVTZXNzaW9uKHNlc3Npb24pO1xuICB9O1xuICAkc2NvcGUuc2F2ZUFsbFNlc3Npb25zID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlc3Npb25zID0gc2Vzc2lvblNlcnZpY2UuZGlydHk7XG5cbiAgICBzZXNzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHNhdmVTZXNzaW9uKGl0ZW0pO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5yZW1vdmVSZWNlbnRGaWxlID0gZnVuY3Rpb24oZW50cnkpIHtcblxuICAgIC8vIGZpbmQgcmVsYXRlZCBzZXNzaW9uXG4gICAgdmFyIHNlc3Npb25zID0gbW9kZWwuc2Vzc2lvbnM7XG4gICAgdmFyIHNlc3Npb24gPSBzZXNzaW9ucy5maW5kU2Vzc2lvbihlbnRyeS5wYXRoKTtcbiAgICBpZiAoc2Vzc2lvbikge1xuXG4gICAgICBpZiAoc2Vzc2lvbi5pc0RpcnR5KSB7XG5cbiAgICAgICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgICAgIHRpdGxlOiAnU2F2ZSBGaWxlJyxcbiAgICAgICAgICBtZXNzYWdlOiAnRmlsZSBoYXMgY2hhbmdlZC4gV291bGQgeW91IGxpa2UgdG8gU2F2ZSBbJyArIG1vZGVsLmdldFJlbGF0aXZlUGF0aChzZXNzaW9uLnBhdGgpICsgJ10nLFxuICAgICAgICAgIG9rQnV0dG9uVGV4dDogJ1llcycsXG4gICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogJ05vJ1xuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNhdmVTZXNzaW9uKHNlc3Npb24sIGZ1bmN0aW9uKGVyciwgc2Vzc2lvbikge1xuICAgICAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICAgICAgbW9kZWwucmVtb3ZlUmVjZW50RmlsZShlbnRyeSk7XG4gICAgICAgICAgICAgIHNlc3Npb25zLnJlbW92ZVNlc3Npb24oc2Vzc2lvbik7XG4gICAgICAgICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdyZWNlbnQtcmVtb3ZlZCcsIGVudHJ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnUmVtb3ZlIHJlY2VudCAoc2F2ZSkgbW9kYWwgZGlzbWlzc2VkJywgdmFsdWUpO1xuICAgICAgICAgIC8vIENoZWNrIGlmIGNsaWNrZWQgJ05vJywgb3RoZXJ3aXNlIGRvIG5vdGhpbmdcbiAgICAgICAgICBpZiAodmFsdWUgPT09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBtb2RlbC5yZW1vdmVSZWNlbnRGaWxlKGVudHJ5KTtcbiAgICAgICAgICAgIHNlc3Npb25zLnJlbW92ZVNlc3Npb24oc2Vzc2lvbik7XG4gICAgICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncmVjZW50LXJlbW92ZWQnLCBlbnRyeSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHNlc3Npb25zLnJlbW92ZVNlc3Npb24oc2Vzc2lvbik7XG5cbiAgICB9XG5cbiAgICBtb2RlbC5yZW1vdmVSZWNlbnRGaWxlKGVudHJ5KTtcbiAgICAkc2NvcGUuJGJyb2FkY2FzdCgncmVjZW50LXJlbW92ZWQnLCBlbnRyeSk7XG5cbiAgfTtcblxuXG4gIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChzZXNzaW9uU2VydmljZS5kaXJ0eS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAnWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gbGVhdmUuJztcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLmVuY29kZVBhdGggPSB1dGlscy5lbmNvZGVTdHJpbmc7XG4gICRzY29wZS5kZWNvZGVQYXRoID0gdXRpbHMuZGVjb2RlU3RyaW5nO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgkdGltZW91dCkge1xuICByZXR1cm4gZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCwgYXR0cnMpIHtcbiAgICAkc2NvcGUuJHdhdGNoKGF0dHJzLm5nU2Nyb2xsZWRJbnRvVmlldywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB2YXIgZWwgPSAkZWxlbWVudFswXTtcbiAgICAgICAgLy9lbC5zY3JvbGxJbnRvVmlldyhmYWxzZSk7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBhY3RpdmUgID0gZWwucXVlcnlTZWxlY3RvcignLmFjdGl2ZScpO1xuICAgICAgICAgIHZhciBjZW50ZXJPZkFjdGl2ZUVsID0gYWN0aXZlLm9mZnNldExlZnQgKyAoYWN0aXZlLm9mZnNldFdpZHRoIC8gMik7XG4gICAgICAgICAgdmFyIGxlZnRCb3VuZGFyeSA9IGVsLnNjcm9sbExlZnQ7XG4gICAgICAgICAgdmFyIHJpZ2h0Qm91bmRhcnkgPSBsZWZ0Qm91bmRhcnkgKyBlbC5vZmZzZXRXaWR0aDtcblxuICAgICAgICAgIGlmIChjZW50ZXJPZkFjdGl2ZUVsIDwgbGVmdEJvdW5kYXJ5KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gYWN0aXZlLm9mZnNldExlZnQgLSAoZWwub2Zmc2V0V2lkdGggLyAyKSArIChhY3RpdmUub2Zmc2V0V2lkdGggLyAyKTsvLyAtIGVsLm9mZnNldFdpZHRoXG4gICAgICAgICAgfSBlbHNlIGlmIChjZW50ZXJPZkFjdGl2ZUVsID4gcmlnaHRCb3VuZGFyeSkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCA9IGFjdGl2ZS5vZmZzZXRMZWZ0IC0gKGVsLm9mZnNldFdpZHRoIC8gMikgKyAoYWN0aXZlLm9mZnNldFdpZHRoIC8gMik7Ly8gKyBlbC5vZmZzZXRXaWR0aFxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgLy9lbC5zY3JvbGxUb3AgPSBzY3JvbGxUby5vZmZzZXQoKS50b3AgLSBjb250YWluZXIub2Zmc2V0KCkudG9wICsgY29udGFpbmVyLnNjcm9sbFRvcCgpXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkcGFyc2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm5nU2Nyb2xsZWRMZWZ0KTtcbiAgICB2YXIgZWwgPSAkZWxlbWVudFswXTtcblxuICAgICRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICBlbC5zY3JvbGxMZWZ0ID0gZWwuc2Nyb2xsV2lkdGg7XG4gICAgfSk7XG5cbiAgfTtcbn07XG4iLCIvLyB2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtJyk7XG4vLyB2YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbi8vIHZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG4vLyBMb2FkIE1vZHVsZSBEZXBlbmRlbmNpZXNcbnJlcXVpcmUoJy4uL2RpYWxvZycpO1xucmVxdWlyZSgnLi4vZnMnKTtcblxudmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5tb2QudmFsdWUoJyRhbmNob3JTY3JvbGwnLCBhbmd1bGFyLm5vb3ApO1xubW9kLnNlcnZpY2UoJ0ZpbGVTZXJ2aWNlJywgW1xuICAnJHEnLFxuICByZXF1aXJlKCcuL3NlcnZpY2VzL2ZpbGUnKVxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdSZXNwb25zZUhhbmRsZXInLCBbXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9yZXNwb25zZS1oYW5kbGVyJylcbl0pO1xuXG5tb2Quc2VydmljZSgnQ29sb3JTZXJ2aWNlJywgW1xuICByZXF1aXJlKCcuL3NlcnZpY2VzL2NvbG9yJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignQXBwQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICAnZnNQcm9taXNlJyxcbiAgJ2ZzV2F0Y2hlclByb21pc2UnLFxuICAnRmlsZVNlcnZpY2UnLFxuICAnRGlhbG9nU2VydmljZScsXG4gICdDb2xvclNlcnZpY2UnLFxuICAnU2Vzc2lvblNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJylcbl0pO1xuXG4vLyBBQ0UgR2xvYmFsIERlZmF1bHRzXG5tb2QucnVuKFsndWlBY2VDb25maWcnLFxuICBmdW5jdGlvbih1aUFjZUNvbmZpZykge1xuICAgIHVpQWNlQ29uZmlnLmFjZSA9IHt9O1xuICAgIGFuZ3VsYXIuZXh0ZW5kKHVpQWNlQ29uZmlnLmFjZSwge1xuICAgICAgdXNlU29mdFRhYnM6IHRydWUsXG4gICAgICB0YWJTaXplOiAyLFxuICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgIHNob3dHdXR0ZXI6IHRydWUsXG4gICAgICAvLyBzZXRBdXRvU2Nyb2xsRWRpdG9ySW50b1ZpZXc6IHRydWUsXG4gICAgICAvLyBtYXhMaW5lczogNjAwLFxuICAgICAgLy8gbWluTGluZXM6IDE1LFxuICAgICAgbW9kZTogJ2phdmFzY3JpcHQnLFxuICAgICAgcmVxdWlyZTogWydhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzJ10sXG4gICAgICBhZHZhbmNlZDoge1xuICAgICAgICBlbmFibGVTbmlwcGV0czogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlTGl2ZUF1dG9jb21wbGV0aW9uOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbl0pO1xuXG5tb2QuY29uZmlnKFtcbiAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgJyRsb2NhdGlvblByb3ZpZGVyJyxcbiAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2QuY29uZmlnKCBbJyRjb21waWxlUHJvdmlkZXInLCBmdW5jdGlvbigkY29tcGlsZVByb3ZpZGVyKXtcbiAgJGNvbXBpbGVQcm92aWRlci5pbWdTcmNTYW5pdGl6YXRpb25XaGl0ZWxpc3QoL15cXHMqKChodHRwcz98ZnRwfGZpbGV8YmxvYik6fGRhdGE6aW1hZ2VcXC8pLyk7XG59XSk7XG5cbm1vZC5kaXJlY3RpdmUoJ25nU2Nyb2xsZWQnLCBbXG4gICckcGFyc2UnLFxuICByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvc2Nyb2xsZWQnKVxuXSk7XG5cbm1vZC5kaXJlY3RpdmUoJ25nU2Nyb2xsZWRJbnRvVmlldycsIFtcbiAgJyR0aW1lb3V0JyxcbiAgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3Njcm9sbGVkLWludG8tdmlldycpXG5dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIGNvb2tpZSA9IHJlcXVpcmUoJ2Nvb2tpZScpO1xuXG5mdW5jdGlvbiBBcHBNb2RlbChkYXRhKSB7XG4gIGRhdGEgPSBkYXRhIHx8IHt9O1xuICB0aGlzLmZzID0gZGF0YS5mcztcbiAgdGhpcy53YXRjaGVyID0gZGF0YS53YXRjaGVyO1xuICB0aGlzLnNlc3Npb25zID0gZGF0YS5zZXNzaW9uU2VydmljZTtcblxuICB0aGlzLnRpdGxlID0gJ1RpdGxlJztcbiAgdGhpcy5zdWJUaXRsZSA9ICdTdWJ0aXRsZSc7XG5cbiAgdGhpcy5fcmVjZW50RmlsZXMgPSBkYXRhLnJlY2VudEZpbGVzIHx8IFtdO1xufVxuQXBwTW9kZWwucHJvdG90eXBlLmFkZFJlY2VudEZpbGUgPSBmdW5jdGlvbihmaWxlKSB7XG4gIHZhciByZWNlbnQgPSB0aGlzLl9yZWNlbnRGaWxlcztcbiAgdmFyIGlkeCA9IHJlY2VudC5maW5kSW5kZXgoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLnBhdGggPT09IGZpbGUucGF0aDtcbiAgfSk7XG4gIGlmIChpZHggIT09IC0xKSB7XG4gICAgcmVjZW50Lm1vdmUoaWR4LCAwKTtcbiAgfSBlbHNlIHtcbiAgICByZWNlbnQudW5zaGlmdCh7XG4gICAgICBwYXRoOiBmaWxlLnBhdGgsXG4gICAgICB0aW1lOiBEYXRlLm5vdygpXG4gICAgfSk7XG4gICAgcmVjZW50Lmxlbmd0aCA9IE1hdGgubWluKHRoaXMuX3JlY2VudEZpbGVzLmxlbmd0aCwgMjApO1xuICB9XG5cbiAgdGhpcy5zdG9yZVJlY2VudEZpbGVzKCk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLnJlbW92ZVJlY2VudEZpbGUgPSBmdW5jdGlvbihlbnRyeSkge1xuICB2YXIgcmVjZW50ID0gdGhpcy5fcmVjZW50RmlsZXM7XG4gIHZhciBpZHggPSByZWNlbnQuaW5kZXhPZihlbnRyeSk7XG5cbiAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICByZWNlbnQuc3BsaWNlKGlkeCwgMSk7XG4gICAgdGhpcy5zdG9yZVJlY2VudEZpbGVzKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5zdG9yZVJlY2VudEZpbGVzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb29raWVFeHBpcmVzID0gbmV3IERhdGUoKTtcbiAgY29va2llRXhwaXJlcy5zZXRGdWxsWWVhcihjb29raWVFeHBpcmVzLmdldEZ1bGxZZWFyKCkgKyAxKTtcblxuICBkb2N1bWVudC5jb29raWUgPSBjb29raWUuc2VyaWFsaXplKCdyZWNlbnRGaWxlcycsIGFuZ3VsYXIudG9Kc29uKHRoaXMucmVjZW50RmlsZXMpLCB7XG4gICAgZXhwaXJlczogY29va2llRXhwaXJlc1xuICB9KTtcbn07XG5cbkFwcE1vZGVsLnByb3RvdHlwZS5jb3VudEZpbGVzID0gZnVuY3Rpb24oZXh0KSB7XG4gIHJldHVybiB0aGlzLmxpc3QuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gIWl0ZW0uaXNEaXJlY3RvcnkgJiYgaXRlbS5leHQgPT09IGV4dDtcbiAgfSkubGVuZ3RoO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5jbGVhclJlY2VudEZpbGVzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3JlY2VudEZpbGVzLmxlbmd0aCA9IDA7XG4gIHRoaXMuc3RvcmVSZWNlbnRGaWxlcygpO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5nZXRSZWxhdGl2ZVBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwLnJlbGF0aXZlKHRoaXMudHJlZS5kaXIsIHBhdGgpO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5fcmVhZERlcGVuZGVuY2llcyA9IGZ1bmN0aW9uKGRldikge1xuICB2YXIgZGVwcyA9IFtdO1xuICB2YXIgcGFja2FnZUpTT04gPSB0aGlzLl9wYWNrYWdlSlNPTjtcbiAgaWYgKHBhY2thZ2VKU09OKSB7XG4gICAgdmFyIGRlcEtleSA9IHBhY2thZ2VKU09OW2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyddO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVwS2V5KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0ga2V5c1tpXTtcbiAgICAgIHZhciB2ZXJzaW9uID0gZGVwS2V5W25hbWVdO1xuICAgICAgZGVwcy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXBzO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwcE1vZGVsLnByb3RvdHlwZSwge1xuICBtYXA6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5tYXA7XG4gICAgfVxuICB9LFxuICBsaXN0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIubGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci50cmVlWzBdLmNoaWxkcmVuWzBdO1xuICAgIH1cbiAgfSxcbiAgcmVjZW50RmlsZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlY2VudCA9IHRoaXMuX3JlY2VudEZpbGVzO1xuXG4gICAgICAvLyBjbGVhbiBhbnkgZmlsZXMgdGhhdCBtYXkgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICB2YXIgaSA9IHJlY2VudC5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGlmICghdGhpcy5tYXBbcmVjZW50W2ldLnBhdGhdKSB7XG4gICAgICAgICAgcmVjZW50LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlY2VudDtcbiAgICB9XG4gIH0sXG4gIGpzQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmpzJyk7XG4gICAgfVxuICB9LFxuICBjc3NDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuY3NzJyk7XG4gICAgfVxuICB9LFxuICBodG1sQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmh0bWwnKTtcbiAgICB9XG4gIH0sXG4gIHRvdGFsQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdC5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wYWNrYWdlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFja2FnZSA9IHZhbHVlO1xuICAgICAgdGhpcy5fcGFja2FnZUpTT04gPSBKU09OLnBhcnNlKHZhbHVlLmNvbnRlbnRzKTtcbiAgICAgIHRoaXMuX2RlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXMoKTtcbiAgICAgIHRoaXMuX2RldkRlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXModHJ1ZSk7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmVlLmNoaWxkcmVuLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdwYWNrYWdlLmpzb24nO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBoYXNQYWNrYWdlRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLnBhY2thZ2VGaWxlO1xuICAgIH1cbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZXBlbmRlbmNpZXM7XG4gICAgfVxuICB9LFxuICBkZXZEZXBlbmRlbmNpZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RldkRlcGVuZGVuY2llcztcbiAgICB9XG4gIH0sXG4gIHJlYWRtZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZG1lO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcmVhZG1lID0gdmFsdWU7XG4gICAgfVxuICB9LFxuICByZWFkbWVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRyZWUuY2hpbGRyZW4uZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiAvXnJlYWRtZS4obWR8bWFya2Rvd24pJC8udGVzdChpdGVtLm5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIGhhc1JlYWRtZUZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICEhdGhpcy5yZWFkbWVGaWxlO1xuICAgIH1cbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBNb2RlbDtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcbiAgJ3VpLnJvdXRlcicsXG4gICd1aS5ib290c3RyYXAnLFxuICAndWkuYWNlJyxcbiAgJ2V2Z2VueW5ldS5tYXJrZG93bi1wcmV2aWV3JyxcbiAgJ21pY2hpS29ubycsXG4gICdkaWFsb2cnLFxuICAnZnMnXG5dKTtcbiIsIi8qKlxuICogY29sb3JUYWcgdiAwLjFcbiAqIGJ5IFJ5YW4gUXVpbm5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXpvbmRvL2NvbG9yVGFnXG4gKlxuICogY29sb3JUYWcgaXMgdXNlZCB0byBnZW5lcmF0ZSBhIHJhbmRvbSBjb2xvciBmcm9tIGEgZ2l2ZW4gc3RyaW5nXG4gKiBUaGUgZ29hbCBpcyB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYywgdXNhYmxlIGNvbG9ycyBmb3IgdGhlIHB1cnBvc2VcbiAqIG9mIGFkZGluZyBjb2xvciBjb2RpbmcgdG8gdGFnc1xuKi9cblxuZnVuY3Rpb24gY29sb3JUYWcodGFnU3RyaW5nKSB7XG5cdC8vIHdlcmUgd2UgZ2l2ZW4gYSBzdHJpbmcgdG8gd29yayB3aXRoPyAgSWYgbm90LCB0aGVuIGp1c3QgcmV0dXJuIGZhbHNlXG5cdGlmICghdGFnU3RyaW5nKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJldHVybiBzdGhlIGx1bWlub3NpdHkgZGlmZmVyZW5jZSBiZXR3ZWVuIDIgcmdiIHZhbHVlc1xuXHQgKiBhbnl0aGluZyBncmVhdGVyIHRoYW4gNSBpcyBjb25zaWRlcmVkIHJlYWRhYmxlXG5cdCAqL1xuXHRmdW5jdGlvbiBsdW1pbm9zaXR5RGlmZihyZ2IxLCByZ2IyKSB7XG4gIFx0XHR2YXIgbDEgPSAwLjIxMjYgKyBNYXRoLnBvdyhyZ2IxLnIvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC43MTUyICogTWF0aC5wb3cocmdiMS5nLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuMDcyMiAqIE1hdGgucG93KHJnYjEuYi8yNTUsIDIuMiksXG4gIFx0XHRcdGwyID0gMC4yMTI2ICsgTWF0aC5wb3cocmdiMi5yLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuNzE1MiAqIE1hdGgucG93KHJnYjIuZy8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjA3MjIgKiBNYXRoLnBvdyhyZ2IyLmIvMjU1LCAyLjIpO1xuXG4gIFx0XHRpZiAobDEgPiBsMikge1xuICBcdFx0XHRyZXR1cm4gKGwxICsgMC4wNSkgLyAobDIgKyAwLjA1KTtcbiAgXHRcdH0gZWxzZSB7XG4gIFx0XHRcdHJldHVybiAobDIgKyAwLjA1KSAvIChsMSArIDAuMDUpO1xuICBcdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIFRoaXMgaXMgdGhlIGRlZmluaXRpb24gb2YgYSBjb2xvciBmb3Igb3VyIHB1cnBvc2VzLiAgV2UndmUgYWJzdHJhY3RlZCBpdCBvdXRcblx0ICogc28gdGhhdCB3ZSBjYW4gcmV0dXJuIG5ldyBjb2xvciBvYmplY3RzIHdoZW4gcmVxdWlyZWRcblx0Ki9cblx0ZnVuY3Rpb24gY29sb3IoaGV4Q29kZSkge1xuXHRcdC8vd2VyZSB3ZSBnaXZlbiBhIGhhc2h0YWc/ICByZW1vdmUgaXQuXG5cdFx0dmFyIGhleENvZGUgPSBoZXhDb2RlLnJlcGxhY2UoXCIjXCIsIFwiXCIpO1xuXHRcdHJldHVybiB7XG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgYSBzaW1wbGUgaGV4IHN0cmluZyBpbmNsdWRpbmcgaGFzaHRhZ1xuXHRcdFx0ICogb2YgdGhlIGNvbG9yXG5cdFx0XHQgKi9cblx0XHRcdGhleDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBoZXhDb2RlO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIGFuIFJHQiBicmVha2Rvd24gb2YgdGhlIGNvbG9yIHByb3ZpZGVkXG5cdFx0XHQgKi9cblx0XHRcdHJnYjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBiaWdpbnQgPSBwYXJzZUludChoZXhDb2RlLCAxNik7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0cjogKGJpZ2ludCA+PiAxNikgJiAyNTUsXG5cdFx0XHRcdFx0ZzogKGJpZ2ludCA+PiA4KSAmIDI1NSxcblx0XHRcdFx0XHRiOiBiaWdpbnQgJiAyNTVcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHaXZlbiBhIGxpc3Qgb2YgaGV4IGNvbG9yIGNvZGVzXG5cdFx0XHQgKiBEZXRlcm1pbmUgd2hpY2ggaXMgdGhlIG1vc3QgcmVhZGFibGVcblx0XHRcdCAqIFdlIHVzZSB0aGUgbHVtaW5vc2l0eSBlcXVhdGlvbiBwcmVzZW50ZWQgaGVyZTpcblx0XHRcdCAqIGh0dHA6Ly93d3cuc3BsaXRicmFpbi5vcmcvYmxvZy8yMDA4LTA5LzE4LWNhbGN1bGF0aW5nX2NvbG9yX2NvbnRyYXN0X3dpdGhfcGhwXG5cdFx0XHQgKi9cblx0XHRcdHJlYWRhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gdGhpcyBpcyBtZWFudCB0byBiZSBzaW1wbGlzdGljLCBpZiB5b3UgZG9uJ3QgZ2l2ZSBtZSBtb3JlIHRoYW5cblx0XHRcdFx0Ly8gb25lIGNvbG9yIHRvIHdvcmsgd2l0aCwgeW91J3JlIGdldHRpbmcgd2hpdGUgb3IgYmxhY2suXG5cdFx0XHRcdHZhciBjb21wYXJhdG9ycyA9IChhcmd1bWVudHMubGVuZ3RoID4gMSkgPyBhcmd1bWVudHMgOiBbXCIjRTFFMUUxXCIsIFwiIzQ2NDY0NlwiXSxcblx0XHRcdFx0XHRvcmlnaW5hbFJHQiA9IHRoaXMucmdiKCksXG5cdFx0XHRcdFx0YnJpZ2h0ZXN0ID0geyBkaWZmZXJlbmNlOiAwIH07XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wYXJhdG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdC8vY2FsY3VsYXRlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIG9yaWdpbmFsIGNvbG9yIGFuZCB0aGUgb25lIHdlIHdlcmUgZ2l2ZW5cblx0XHRcdFx0XHR2YXIgYyA9IGNvbG9yKGNvbXBhcmF0b3JzW2ldKSxcblx0XHRcdFx0XHRcdGwgPSBsdW1pbm9zaXR5RGlmZihvcmlnaW5hbFJHQiwgYy5yZ2IoKSk7XG5cblx0XHRcdFx0XHQvLyBpZiBpdCdzIGJyaWdodGVyIHRoYW4gdGhlIGN1cnJlbnQgYnJpZ2h0ZXN0LCBzdG9yZSBpdCB0byBjb21wYXJlIGFnYWluc3QgbGF0ZXIgb25lc1xuXHRcdFx0XHRcdGlmIChsID4gYnJpZ2h0ZXN0LmRpZmZlcmVuY2UpIHtcblx0XHRcdFx0XHRcdGJyaWdodGVzdCA9IHtcblx0XHRcdFx0XHRcdFx0ZGlmZmVyZW5jZTogbCxcblx0XHRcdFx0XHRcdFx0Y29sb3I6IGNcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyByZXR1cm4gdGhlIGJyaWdoZXN0IGNvbG9yXG5cdFx0XHRcdHJldHVybiBicmlnaHRlc3QuY29sb3I7XG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cblxuXHQvLyBjcmVhdGUgdGhlIGhleCBmb3IgdGhlIHJhbmRvbSBzdHJpbmdcbiAgICB2YXIgaGFzaCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWdTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaGFzaCA9IHRhZ1N0cmluZy5jaGFyQ29kZUF0KGkpICsgKChoYXNoIDw8IDUpIC0gaGFzaCk7XG4gICAgfVxuICAgIGhleCA9IFwiXCJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICB2YXIgdmFsdWUgPSAoaGFzaCA+PiAoaSAqIDgpKSAmIDB4RkY7XG4gICAgICAgIGhleCArPSAoJzAwJyArIHZhbHVlLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC0yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3IoaGV4KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gY29sb3JUYWc7XG59O1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRxKSB7XG4gIHJldHVybiB7XG4gICAgcmVhZEZpbGU6IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgIGZpbGVzeXN0ZW0ucmVhZEZpbGUoZmlsZSwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgIGlmIChyZXMuZXJyKSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJlcy5lcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfVxuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGlhbG9nKSB7XG4gIHJldHVybiB7XG4gICAgcmVzcG9uc2VIYW5kbGVyOiBmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHJzcCwgc2hvd0Vycm9yKSB7XG4gICAgICAgIHNob3dFcnJvciA9IHNob3dFcnJvciB8fCB0cnVlO1xuICAgICAgICBpZiAocnNwLmVycikge1xuICAgICAgICAgIGlmIChzaG93RXJyb3IpIHtcbiAgICAgICAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyc3AuZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZuKHJzcC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH07XG59O1xuIiwiQXJyYXkucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbihvbGRJbmRleCwgbmV3SW5kZXgpIHtcblxuICBpZiAoaXNOYU4obmV3SW5kZXgpIHx8IGlzTmFOKG9sZEluZGV4KSB8fCBvbGRJbmRleCA8IDAgfHwgb2xkSW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAobmV3SW5kZXggPCAwKSB7XG4gICAgbmV3SW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSBpZiAobmV3SW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICBuZXdJbmRleCA9IDA7XG4gIH1cblxuICB0aGlzLnNwbGljZShuZXdJbmRleCwgMCwgdGhpcy5zcGxpY2Uob2xkSW5kZXgsIDEpWzBdKTtcblxuICByZXR1cm4gbmV3SW5kZXg7XG59O1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gIEFycmF5LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgaWYgKHRoaXMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LnByb3RvdHlwZS5maW5kIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH07XG59XG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCkge1xuICBBcnJheS5wcm90b3R5cGUuZmluZEluZGV4ID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwiZWRpdG9yXCI6IHtcbiAgICBcInRoZW1lXCI6IFwibW9ub2thaVwiLFxuICAgIFwidGFiU2l6ZVwiOiAyLFxuICAgIFwidXNlU29mdFRhYnNcIjogdHJ1ZSxcbiAgICBcImhpZ2hsaWdodEFjdGl2ZUxpbmVcIjogdHJ1ZSxcbiAgICBcInNob3dQcmludE1hcmdpblwiOiBmYWxzZSxcbiAgICBcInNob3dHdXR0ZXJcIjogdHJ1ZSxcbiAgICBcImZvbnRTaXplXCI6IFwiMTJweFwiLFxuICAgIFwidXNlV29ya2VyXCI6IHRydWUsXG4gICAgXCJzaG93SW52aXNpYmxlc1wiOiB0cnVlLFxuICAgIFwibW9kZXNcIjoge1xuICAgICAgXCIuanNcIjogXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIsXG4gICAgICBcIi5jc3NcIjogXCJhY2UvbW9kZS9jc3NcIixcbiAgICAgIFwiLmh0bWxcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gICAgICBcIi5odG1cIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gICAgICBcIi5lanNcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gICAgICBcIi5qc29uXCI6IFwiYWNlL21vZGUvanNvblwiLFxuICAgICAgXCIubWRcIjogXCJhY2UvbW9kZS9tYXJrZG93blwiLFxuICAgICAgXCIuY29mZmVlXCI6IFwiYWNlL21vZGUvY29mZmVlXCIsXG4gICAgICBcIi5qYWRlXCI6IFwiYWNlL21vZGUvamFkZVwiLFxuICAgICAgXCIucGhwXCI6IFwiYWNlL21vZGUvcGhwXCIsXG4gICAgICBcIi5weVwiOiBcImFjZS9tb2RlL3B5dGhvblwiLFxuICAgICAgXCIuc2Nzc1wiOiBcImFjZS9tb2RlL3Nhc3NcIixcbiAgICAgIFwiLnR4dFwiOiBcImFjZS9tb2RlL3RleHRcIixcbiAgICAgIFwiLnR5cGVzY3JpcHRcIjogXCJhY2UvbW9kZS90eXBlc2NyaXB0XCIsXG4gICAgICBcIi54bWxcIjogXCJhY2UvbW9kZS94bWxcIlxuICAgIH1cbiAgfSxcbiAgXCJiZWF1dGlmeVwiOiB7XG4gICAgXCJqc1wiOiB7XG4gICAgICBcImluZGVudF9zaXplXCI6IDIsXG4gICAgICBcImluZGVudF9jaGFyXCI6IFwiIFwiLFxuICAgICAgXCJpbmRlbnRfbGV2ZWxcIjogMCxcbiAgICAgIFwiaW5kZW50X3dpdGhfdGFic1wiOiBmYWxzZSxcbiAgICAgIFwicHJlc2VydmVfbmV3bGluZXNcIjogdHJ1ZSxcbiAgICAgIFwibWF4X3ByZXNlcnZlX25ld2xpbmVzXCI6IDMsXG4gICAgICBcImpzbGludF9oYXBweVwiOiBmYWxzZSxcbiAgICAgIFwiYnJhY2Vfc3R5bGVcIjogXCJjb2xsYXBzZVwiLFxuICAgICAgXCJrZWVwX2FycmF5X2luZGVudGF0aW9uXCI6IGZhbHNlLFxuICAgICAgXCJrZWVwX2Z1bmN0aW9uX2luZGVudGF0aW9uXCI6IGZhbHNlLFxuICAgICAgXCJzcGFjZV9iZWZvcmVfY29uZGl0aW9uYWxcIjogdHJ1ZSxcbiAgICAgIFwiYnJlYWtfY2hhaW5lZF9tZXRob2RzXCI6IGZhbHNlLFxuICAgICAgXCJldmFsX2NvZGVcIjogZmFsc2UsXG4gICAgICBcInVuZXNjYXBlX3N0cmluZ3NcIjogZmFsc2UsXG4gICAgICBcIndyYXBfbGluZV9sZW5ndGhcIjogMFxuICAgIH0sXG4gICAgXCJjc3NcIjoge1xuICAgICAgXCJpbmRlbnRfc2l6ZVwiOiAyLFxuICAgICAgXCJpbmRlbnRfY2hhclwiOiBcIiBcIlxuICAgIH0sXG4gICAgXCJodG1sXCI6IHtcbiAgICAgIFwiaW5kZW50X3NpemVcIjogMixcbiAgICAgIFwiaW5kZW50X2NoYXJcIjogXCIgXCIsXG4gICAgICBcImJyYWNlX3N0eWxlXCI6IFwiY29sbGFwc2VcIixcbiAgICAgIFwiaW5kZW50X3NjcmlwdHMgXCI6IFwibm9ybWFsXCJcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcbiAgJHNjb3BlLm9rQnV0dG9uVGV4dCA9IGRhdGEub2tCdXR0b25UZXh0IHx8ICdPSyc7XG4gICRzY29wZS5jYW5jZWxCdXR0b25UZXh0ID0gZGF0YS5jYW5jZWxCdXR0b25UZXh0IHx8ICdDYW5jZWwnO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBhbGVydDogcmVxdWlyZSgnLi9hbGVydCcpLFxuICBjb25maXJtOiByZXF1aXJlKCcuL2NvbmZpcm0nKSxcbiAgcHJvbXB0OiByZXF1aXJlKCcuL3Byb21wdCcpXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAkc2NvcGUucGxhY2Vob2xkZXIgPSBkYXRhLnBsYWNlaG9sZGVyO1xuICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gIH07XG5cbiAgJHNjb3BlLm9rID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgfTtcblxuICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gIH07XG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG52YXIgY29udHJvbGxlcnMgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJyk7XG5cbm1vZC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLmFsZXJ0XG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5jb25maXJtXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ1Byb21wdEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLnByb21wdFxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdEaWFsb2dTZXJ2aWNlJywgW1xuICAnJG1vZGFsJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZGlhbG9nJywgW1xuICAndWkuYm9vdHN0cmFwJ1xuXSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRtb2RhbCkge1xuXG4gIHZhciBzZXJ2aWNlID0ge307XG5cbiAgc2VydmljZS5hbGVydCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL2FsZXJ0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FsZXJ0Q3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLmNvbmZpcm0gPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9jb25maXJtLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpcm1DdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBkYXRhLm9rQnV0dG9uVGV4dCxcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IGRhdGEuY2FuY2VsQnV0dG9uVGV4dFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLnByb21wdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL3Byb21wdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdQcm9tcHRDdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHJldHVybiBzZXJ2aWNlO1xuXG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTtcblxuLypcbiAqIEZpbGVTeXN0ZW1XYXRjaGVyIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW1XYXRjaGVyKCkge1xuXG4gIHRoaXMuX3dhdGNoZWQgPSB7fTtcblxuICB0aGlzLl9saXN0ID0gbnVsbDtcbiAgdGhpcy5fdHJlZSA9IG51bGw7XG5cbiAgdmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mc3dhdGNoJyk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuXG4gICAgT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdGhpcy5fd2F0Y2hlZFtrZXldID0gbmV3IEZpbGVTeXN0ZW1PYmplY3Qoa2V5LCBkYXRhW2tleV0uaXNEaXJlY3RvcnkpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy91dGlscy5leHRlbmQodGhpcy5fd2F0Y2hlZCwgZGF0YSk7XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBjb25uZWN0aW9uJyk7XG5cbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCB0aGlzLl93YXRjaGVkKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGQnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdID0gZnNvO1xuXG4gICAgY29uc29sZS5sb2coJ1dhdGNoZXIgYWRkJywgZnNvKTtcblxuICAgIHRoaXMuZW1pdCgnYWRkJywgZnNvKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGREaXInLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgdHJ1ZSk7XG5cbiAgICB0aGlzLl93YXRjaGVkW2Zzby5wYXRoXSA9IGZzbztcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGFkZERpcicsIGZzbyk7XG5cbiAgICB0aGlzLmVtaXQoJ2FkZERpcicsIGZzbyk7XG4gICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY2hhbmdlJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICAvLyBjaGVjayB3ZSBnb3Qgc29tZXRoaW5nXG4gICAgaWYgKGZzbykge1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBjaGFuZ2UnLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ21vZGlmaWVkJywgZnNvKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGluaycsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgICAgY29uc29sZS5sb2coJ1dhdGNoZXIgdW5saW5rJywgZnNvKTtcblxuICAgICAgdGhpcy5lbWl0KCd1bmxpbmsnLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGlua0RpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgICAgY29uc29sZS5sb2coJ1dhdGNoZXIgdW5saW5rRGlyJywgZnNvKTtcblxuICAgICAgdGhpcy5lbWl0KCd1bmxpbmtEaXInLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2Vycm9yJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBlcnJvcicsIHJlcy5lcnIpO1xuXG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIHJlcy5lcnIpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG4gIHRoaXMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpc3QgPSBudWxsO1xuICAgIHRoaXMuX3RyZWUgPSBudWxsO1xuICB9KTtcblxufVxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLl9saXN0KSB7XG4gICAgICAgIHRoaXMuX2xpc3QgPSBbXTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl93YXRjaGVkKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5fbGlzdC5wdXNoKHRoaXMuX3dhdGNoZWRba2V5c1tpXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fbGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBmdW5jdGlvbiB0cmVlaWZ5KGxpc3QsIGlkQXR0ciwgcGFyZW50QXR0ciwgY2hpbGRyZW5BdHRyKSB7XG5cbiAgICAgICAgdmFyIHRyZWVMaXN0ID0gW107XG4gICAgICAgIHZhciBsb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIHBhdGgsIG9iajtcblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuXG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICBvYmoubGFiZWwgPSBvYmoubmFtZTtcbiAgICAgICAgICBsb29rdXBbb2JqW2lkQXR0cl1dID0gb2JqO1xuICAgICAgICAgIG9ialtjaGlsZHJlbkF0dHJdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuICAgICAgICAgIG9iaiA9IGxpc3RbcGF0aF07XG4gICAgICAgICAgdmFyIHBhcmVudCA9IGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dO1xuICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgIG9iai5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICBsb29rdXBbb2JqW3BhcmVudEF0dHJdXVtjaGlsZHJlbkF0dHJdLnB1c2gob2JqKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJlZUxpc3QucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmVlTGlzdDtcblxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3RyZWUpIHtcbiAgICAgICAgdGhpcy5fdHJlZSA9IHRyZWVpZnkodGhpcy5fd2F0Y2hlZCwgJ3BhdGgnLCAnZGlyJywgJ2NoaWxkcmVuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgIH1cbiAgfVxufSk7XG5lbWl0dGVyKEZpbGVTeXN0ZW1XYXRjaGVyLnByb3RvdHlwZSk7XG5cbnZhciBGaWxlU3lzdGVtV2F0Y2hlciA9IG5ldyBGaWxlU3lzdGVtV2F0Y2hlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTeXN0ZW1XYXRjaGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItY29tcG9uZW50Jyk7O1xuXG4vKlxuICogRmlsZVN5c3RlbSBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGaWxlU3lzdGVtKHNvY2tldCkge1xuXG4gIHNvY2tldC5vbignbWtkaXInLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtkaXInLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdta2ZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY29weScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdjb3B5JywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVuYW1lJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbmFtZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZW1vdmUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZWFkZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZWFkZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3dyaXRlZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCd3cml0ZWZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG59XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2RpciA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2RpcicsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2ZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnbWtmaWxlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbihzb3VyY2UsIGRlc3RpbmF0aW9uLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnY29weScsIHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVuYW1lJywgb2xkUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW1vdmUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVhZGZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUud3JpdGVGaWxlID0gZnVuY3Rpb24ocGF0aCwgY29udGVudHMsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCd3cml0ZWZpbGUnLCBwYXRoLCBjb250ZW50cywgY2FsbGJhY2spO1xufTtcblxuZW1pdHRlcihGaWxlU3lzdGVtLnByb3RvdHlwZSk7XG5cblxudmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mcycpO1xuXG52YXIgZmlsZVN5c3RlbSA9IG5ldyBGaWxlU3lzdGVtKHNvY2tldCk7XG5cbmZpbGVTeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdmcyBjb25uZWN0ZWQnLCBkYXRhKTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZmlsZVN5c3RlbTsiLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIEVkaXRTZXNzaW9uID0gYWNlLnJlcXVpcmUoJ2FjZS9lZGl0X3Nlc3Npb24nKS5FZGl0U2Vzc2lvbjtcbnZhciBVbmRvTWFuYWdlciA9IGFjZS5yZXF1aXJlKCdhY2UvdW5kb21hbmFnZXInKS5VbmRvTWFuYWdlcjtcblxudmFyIG1vZGVzID0ge1xuICBcIi5qc1wiOiBcImFjZS9tb2RlL2phdmFzY3JpcHRcIixcbiAgXCIuY3NzXCI6IFwiYWNlL21vZGUvY3NzXCIsXG4gIFwiLnNjc3NcIjogXCJhY2UvbW9kZS9zY3NzXCIsXG4gIFwiLmxlc3NcIjogXCJhY2UvbW9kZS9sZXNzXCIsXG4gIFwiLmh0bWxcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gIFwiLmh0bVwiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgXCIuZWpzXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICBcIi5qc29uXCI6IFwiYWNlL21vZGUvanNvblwiLFxuICBcIi5tZFwiOiBcImFjZS9tb2RlL21hcmtkb3duXCIsXG4gIFwiLmNvZmZlZVwiOiBcImFjZS9tb2RlL2NvZmZlZVwiLFxuICBcIi5qYWRlXCI6IFwiYWNlL21vZGUvamFkZVwiLFxuICBcIi5waHBcIjogXCJhY2UvbW9kZS9waHBcIixcbiAgXCIucHlcIjogXCJhY2UvbW9kZS9weXRob25cIixcbiAgXCIuc2Fzc1wiOiBcImFjZS9tb2RlL3Nhc3NcIixcbiAgXCIudHh0XCI6IFwiYWNlL21vZGUvdGV4dFwiLFxuICBcIi50eXBlc2NyaXB0XCI6IFwiYWNlL21vZGUvdHlwZXNjcmlwdFwiLFxuICBcIi54bWxcIjogXCJhY2UvbW9kZS94bWxcIlxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FwcC5mcycsIHtcbiAgICAgIGFic3RyYWN0OiB0cnVlXG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICB1cmw6ICcvZmluZGVyJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAYXBwJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcHAnXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRmluZGVyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbmRlci5odG1sJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgIHVybDogJy9maWxlLzpwYXRoJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdGc0ZpbGVDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9maWxlLmh0bWwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBzZXNzaW9uOiBbJyRxJywgJyRzdGF0ZVBhcmFtcycsICdGaWxlU2VydmljZScsICdTZXNzaW9uU2VydmljZScsICd1aUFjZUNvbmZpZycsXG4gICAgICAgICAgZnVuY3Rpb24oJHEsICRzdGF0ZVBhcmFtcywgZmlsZVNlcnZpY2UsIHNlc3Npb25TZXJ2aWNlLCBhY2VDb25maWcpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXF1ZXN0ZWQgZmlsZSAnICsgcGF0aCk7XG5cbiAgICAgICAgICAgIHZhciBzZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuZmluZFNlc3Npb24ocGF0aCk7XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uKSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VzaW5nIGZvdW5kIHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2Vzc2lvbik7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlYWRpbmcgZmlsZSBmb3IgbmV3IHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHBhdGgpLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzVXRmOCA9ICEoZmlsZS5jb250ZW50cyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uRGF0YTtcbiAgICAgICAgICAgICAgICBpZiAoaXNVdGY4KSB7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YSA9IG5ldyBFZGl0U2Vzc2lvbihmaWxlLmNvbnRlbnRzLCBtb2Rlc1tmaWxlLmV4dF0pO1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuc2V0VGFiU2l6ZShhY2VDb25maWcuYWNlLnRhYlNpemUpO1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuc2V0VXNlU29mdFRhYnMoYWNlQ29uZmlnLmFjZS51c2VTb2Z0VGFicyk7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YS5zZXRVbmRvTWFuYWdlcihuZXcgVW5kb01hbmFnZXIoKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhID0gZmlsZS5jb250ZW50cztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuYWRkU2Vzc2lvbihwYXRoLCBzZXNzaW9uRGF0YSwgaXNVdGY4KTtcblxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2Vzc2lvbik7XG5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLnNlYXJjaCcsIHtcbiAgICAgIHVybDogJy9zZWFyY2g/cScsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGFwcCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBwJyxcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNTZWFyY2hDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3Mvc2VhcmNoLmh0bWwnXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmRpcicsIHtcbiAgICAgIHVybDogJy9kaXIvOnBhdGgnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRGlyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2Rpci5odG1sJyxcbiAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsIGRpciwgZmlsZVNlcnZpY2UpIHtcbiAgJHNjb3BlLmRpciA9IGRpcjtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBzZXNzaW9uLCBmaWxlU2VydmljZSkge1xuICB2YXIgaXNVdGY4ID0gc2Vzc2lvbi5pc1V0Zjg7XG5cbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmaWxlID0gbW9kZWwubWFwW3Nlc3Npb24ucGF0aF07XG5cbiAgLy8gZW5zdXJlIHRoZSBmaW5kZXIgaXMgc2V0IHRoZSB0aGUgcmlnaHQgZnNvXG4gICRzY29wZS5maW5kZXIuYWN0aXZlID0gZmlsZTtcblxuICAvLyBIYW5kbGUgdGhlIGNhc2Ugb2YgdGhlIGZpbGUgYmVpbmcgcmVtb3ZlZCBmcm9tIHJlY2VudEZpbGVzLlxuICAkc2NvcGUuJG9uKCdyZWNlbnQtcmVtb3ZlZCcsIGZ1bmN0aW9uKGUsIGRhdGEpIHtcbiAgICBpZiAoZGF0YS5wYXRoID09PSBmaWxlLnBhdGgpIHsgLy8gdGhpcyBzaG91bGQgYWx3YXlzIGJlIHRoZSBjYXNlXG4gICAgICBpZiAobW9kZWwucmVjZW50RmlsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtb3N0UmVjZW50RW50cnkgPSBtb2RlbC5yZWNlbnRGaWxlc1swXTtcbiAgICAgICAgdmFyIG1vc3RSZWNlbnRGaWxlID0gbW9kZWwubWFwW21vc3RSZWNlbnRFbnRyeS5wYXRoXTtcbiAgICAgICAgJHNjb3BlLmdvdG9GaWxlKG1vc3RSZWNlbnRGaWxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS4kcGFyZW50LnNob3dFZGl0b3IgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmZpbmRlci5hY3RpdmUgPSBtb2RlbC5tYXBbZmlsZS5kaXJdO1xuICAgICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXInKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIG1vZGVsLmFkZFJlY2VudEZpbGUoZmlsZSk7XG5cbiAgZnVuY3Rpb24gaW1nQmxvYlVybCgpIHtcbiAgICAvLyBPYnRhaW4gYSBibG9iOiBVUkwgZm9yIHRoZSBpbWFnZSBkYXRhLlxuICAgIHZhciBhcnJheUJ1ZmZlclZpZXcgPSBuZXcgVWludDhBcnJheShzZXNzaW9uLmRhdGEpO1xuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2FycmF5QnVmZmVyVmlld10sIHtcbiAgICAgIHR5cGU6ICdpbWFnZS8nICsgZmlsZS5leHQuc3Vic3RyKDEpXG4gICAgfSk7XG4gICAgdmFyIHVybENyZWF0b3IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgdmFyIHVybCA9IHVybENyZWF0b3IuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBpZiAoaXNVdGY4KSB7XG5cbiAgICAkc2NvcGUudmlld2VyID0gJ2FjZSc7XG4gICAgJHNjb3BlLiRwYXJlbnQuc2hvd0VkaXRvciA9IHRydWU7XG4gICAgJHNjb3BlLiRwYXJlbnQuZWRpdG9yU2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcblxuICAgIC8vIGlmIHRoZSBlZGl0b3IgZXhpc3RzLCBsb2FkIHRoZSBlZGl0U2Vzc2lvbiB3ZSBqdXN0IGFzc2lnbmVkXG4gICAgaWYgKCRzY29wZS4kcGFyZW50LmVkaXRvcikge1xuICAgICAgJHNjb3BlLiRwYXJlbnQubG9hZFNlc3Npb24oKTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcblxuICAgICRzY29wZS52aWV3ZXIgPSAnJztcbiAgICAkc2NvcGUuJHBhcmVudC5zaG93RWRpdG9yID0gZmFsc2U7XG5cbiAgICBzd2l0Y2ggKGZpbGUuZXh0KSB7XG4gICAgICBjYXNlICcucG5nJzpcbiAgICAgIGNhc2UgJy5qcGcnOlxuICAgICAgY2FzZSAnLmpwZWcnOlxuICAgICAgY2FzZSAnLmdpZic6XG4gICAgICBjYXNlICcuaWNvJzpcbiAgICAgICAgJHNjb3BlLnZpZXdlciA9ICdpbWcnO1xuICAgICAgICAkc2NvcGUuaW1nVXJsID0gaW1nQmxvYlVybCgpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuXG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaW5kZXJNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9maW5kZXInKTtcblxudmFyIGJlYXV0aWZ5Q29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnJykuYmVhdXRpZnk7XG52YXIgYmVhdXRpZnlfanMgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpO1xudmFyIGJlYXV0aWZ5X2NzcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuY3NzO1xudmFyIGJlYXV0aWZ5X2h0bWwgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmh0bWw7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2csICRxLCBkaWFsb2csIGZpbGVTZXJ2aWNlLCByZXNwb25zZUhhbmRsZXIpIHtcblxuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuICAkc2NvcGUuc2hvd0VkaXRvciA9IGZhbHNlO1xuXG4gICRzY29wZS5hY2VMb2FkZWQgPSBmdW5jdGlvbihlZGl0b3IpIHtcblxuICAgICRzY29wZS5lZGl0b3IgPSBlZGl0b3I7XG5cbiAgICBlZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZHMoW3tcbiAgICAgIG5hbWU6ICdzYXZlJyxcbiAgICAgIGJpbmRLZXk6IHtcbiAgICAgICAgd2luOiAnQ3RybC1TJyxcbiAgICAgICAgbWFjOiAnQ29tbWFuZC1TJ1xuICAgICAgfSxcbiAgICAgIGV4ZWM6IGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgICB2YXIgZWRpdG9yU2Vzc2lvbiA9IGVkaXRvci5nZXRTZXNzaW9uKCk7XG4gICAgICAgIHZhciBzZXNzaW9uID0gbW9kZWwuc2Vzc2lvbnMuZGlydHkuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZW0uZGF0YSA9PT0gZWRpdG9yU2Vzc2lvbjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzZXNzaW9uKSB7XG4gICAgICAgICAgJHNjb3BlLnNhdmVTZXNzaW9uKHNlc3Npb24pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmVhZE9ubHk6IGZhbHNlIC8vIHRoaXMgY29tbWFuZCBzaG91bGQgbm90IGFwcGx5IGluIHJlYWRPbmx5IG1vZGVcbiAgICB9LCB7XG4gICAgICBuYW1lOiAnc2F2ZWFsbCcsXG4gICAgICBiaW5kS2V5OiB7XG4gICAgICAgIHdpbjogJ0N0cmwtU2hpZnQtUycsXG4gICAgICAgIG1hYzogJ0NvbW1hbmQtT3B0aW9uLVMnXG4gICAgICB9LFxuICAgICAgZXhlYzogJHNjb3BlLnNhdmVBbGxTZXNzaW9ucyxcbiAgICAgIHJlYWRPbmx5OiBmYWxzZSAvLyB0aGlzIGNvbW1hbmQgc2hvdWxkIG5vdCBhcHBseSBpbiByZWFkT25seSBtb2RlXG4gICAgfSwge1xuICAgICAgbmFtZTogJ2hlbHAnLFxuICAgICAgYmluZEtleToge1xuICAgICAgICB3aW46ICdDdHJsLUgnLFxuICAgICAgICBtYWM6ICdDb21tYW5kLUgnXG4gICAgICB9LFxuICAgICAgLy9leGVjOiB0aGlzLl9vbkhlbHAuYmluZCh0aGlzKSxcbiAgICAgIHJlYWRPbmx5OiB0cnVlIC8vIHRoaXMgY29tbWFuZCBzaG91bGQgYXBwbHkgaW4gcmVhZE9ubHkgbW9kZVxuICAgIH1dKTtcblxuICAgIGVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kcyhbe1xuICAgICAgbmFtZTogJ2JlYXV0aWZ5JyxcbiAgICAgIGJpbmRLZXk6IHtcbiAgICAgICAgd2luOiAnQ3RybC1CJyxcbiAgICAgICAgbWFjOiAnQ29tbWFuZC1CJ1xuICAgICAgfSxcbiAgICAgIGV4ZWM6IGZ1bmN0aW9uKGVkaXRvciwgbGluZSkge1xuICAgICAgICB2YXIgY2ZnLCBmbjtcbiAgICAgICAgdmFyIGZzbyA9IGZpbmRlci5hY3RpdmU7XG5cbiAgICAgICAgc3dpdGNoIChmc28uZXh0KSB7XG4gICAgICAgICAgY2FzZSAnLmNzcyc6XG4gICAgICAgICAgY2FzZSAnLmxlc3MnOlxuICAgICAgICAgIGNhc2UgJy5zYXNzJzpcbiAgICAgICAgICBjYXNlICcuc2Nzcyc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZuID0gYmVhdXRpZnlfY3NzO1xuICAgICAgICAgICAgICBjZmcgPSBiZWF1dGlmeUNvbmZpZyA/IGJlYXV0aWZ5Q29uZmlnLmNzcyA6IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICcuaHRtbCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZuID0gYmVhdXRpZnlfaHRtbDtcbiAgICAgICAgICAgICAgY2ZnID0gYmVhdXRpZnlDb25maWcgPyBiZWF1dGlmeUNvbmZpZy5odG1sIDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJy5qcyc6XG4gICAgICAgICAgY2FzZSAnLmpzb24nOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmbiA9IGJlYXV0aWZ5X2pzO1xuICAgICAgICAgICAgICBjZmcgPSBiZWF1dGlmeUNvbmZpZyA/IGJlYXV0aWZ5Q29uZmlnLmpzIDogbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgZWRpdG9yLnNldFZhbHVlKGZuKGVkaXRvci5nZXRWYWx1ZSgpLCBjZmcpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHJlYWRPbmx5OiBmYWxzZSAvLyB0aGlzIGNvbW1hbmQgc2hvdWxkIG5vdCBhcHBseSBpbiByZWFkT25seSBtb2RlXG4gICAgfV0pO1xuXG4gICAgLy8gbG9hZCB0aGUgZWRpdG9yU2Vzc2lvbiBpZiBvbmUgaGFzIGFscmVhZHkgYmVlbiBkZWZpbmVkIChsaWtlIGluIGNoaWxkIGNvbnRyb2xsZXIgRmlsZUN0cmwpXG4gICAgaWYgKCRzY29wZS5lZGl0b3JTZXNzaW9uKSB7XG4gICAgICAkc2NvcGUubG9hZFNlc3Npb24oKTtcbiAgICB9XG5cbiAgfTtcblxuICAkc2NvcGUubG9hZFNlc3Npb24gPSBmdW5jdGlvbigpIHtcbiAgICAkc2NvcGUuZWRpdG9yLnNldFNlc3Npb24oJHNjb3BlLmVkaXRvclNlc3Npb24pO1xuICB9O1xuXG4gICRzY29wZS5hY2VDaGFuZ2VkID0gZnVuY3Rpb24oZWRpdG9yKSB7XG4gICAgLy8gRG9uJ3QgcmVtb3ZlIHRoaXMuIFNpbXBseSBoYW5kbGluZyB0aGlzIGNhdXNlcyB0aGUgJGRpZ2VzdCB3ZSB3YW50IHRvIHVwZGF0ZSB0aGUgVUlcbiAgICBjb25zb2xlLmxvZygnRmluZGVyIGVkaXRvciBjaGFuZ2VkJyk7XG4gIH07XG5cbiAgdmFyIHBhdGggPSAkc3RhdGUucGFyYW1zLnBhdGggPyB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlLnBhcmFtcy5wYXRoKSA6IG51bGw7XG4gIHZhciBtb2RlbCA9ICRzY29wZS5tb2RlbDtcblxuICB2YXIgZmluZGVyID0gbmV3IEZpbmRlck1vZGVsKHBhdGggPyBtb2RlbC5saXN0LmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLnBhdGggPT09IHBhdGg7XG4gIH0pIDogbW9kZWwudHJlZSk7XG5cbiAgJHNjb3BlLmZpbmRlciA9IGZpbmRlcjtcblxuICBmdW5jdGlvbiBmaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZmluZGVyLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmIChmc28uaXNGaWxlKSB7XG4gICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZzby5wYXRoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihmc28pIHtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnUmVuYW1lIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZmlsZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZmlsZScsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZpbGUgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtmaWxlKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBmaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihmc28pIHtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBmaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuICAgIHZhciBwYXN0ZVBhdGggPSBmc28uaXNEaXJlY3RvcnkgPyBmc28ucGF0aCA6IGZzby5kaXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjb3B5Jykge1xuICAgICAgZmlsZXN5c3RlbS5jb3B5KHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUocGFzdGVQYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2N1dCcpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUocGFzdGVQYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB9O1xuXG4gICRzY29wZS5zaG93UGFzdGUgPSBmdW5jdGlvbihhY3RpdmUpIHtcbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG4gICAgXG4gICAgaWYgKHBhc3RlQnVmZmVyKSB7XG4gICAgICB2YXIgc291cmNlUGF0aCA9IHBhc3RlQnVmZmVyLmZzby5wYXRoLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgc291cmNlRGlyID0gcGFzdGVCdWZmZXIuZnNvLmRpci50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIGRlc3RpbmF0aW9uRGlyID0gKGFjdGl2ZS5pc0RpcmVjdG9yeSA/IGFjdGl2ZS5wYXRoIDogYWN0aXZlLmRpcikudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciBpc0RpcmVjdG9yeSA9IHBhc3RlQnVmZmVyLmZzby5pc0RpcmVjdG9yeTtcbiAgICAgIFxuICAgICAgaWYgKCFpc0RpcmVjdG9yeSkge1xuICAgICAgICAvLyBBbHdheXMgYWxsb3cgcGFzdGVpbmcgb2YgYSBmaWxlIHVubGVzcyBpdCdzIGEgbW92ZSBvcGVyYXRpb24gKGN1dCkgYW5kIHRoZSBkZXN0aW5hdGlvbiBkaXIgaXMgdGhlIHNhbWVcbiAgICAgICAgcmV0dXJuIHBhc3RlQnVmZmVyLm9wICE9PSAnY3V0JyB8fCBkZXN0aW5hdGlvbkRpciAhPT0gc291cmNlRGlyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQWxsb3cgcGFzdGVpbmcgZGlyZWN0b3JpZXMgaWYgbm90IGludG8gc2VsZiBhIGRlY2VuZGVudFxuICAgICAgICBpZiAoZGVzdGluYXRpb25EaXIuaW5kZXhPZihzb3VyY2VQYXRoKSAhPT0gMCkge1xuICAgICAgICAgIC8vIGFuZCAgb3IgaWYgdGhlIG9wZXJhdGlvbiBpcyBtb3ZlIChjdXQpIHRoZSBwYXJlbnQgZGlyIHRvb1xuICAgICAgICAgIHJldHVybiBwYXN0ZUJ1ZmZlci5vcCAhPT0gJ2N1dCcgfHwgZGVzdGluYXRpb25EaXIgIT09IHNvdXJjZURpcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLnNldFBhc3RlQnVmZmVyID0gZnVuY3Rpb24oZnNvLCBvcCkge1xuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0ge1xuICAgICAgZnNvOiBmc28sXG4gICAgICBvcDogb3BcbiAgICB9O1xuXG4gIH07XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlKSB7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlKSB7XG4gICRzY29wZS5tb2RlbC5xID0gJHN0YXRlLnBhcmFtcy5xO1xufTtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJG1vZGFsLCAkbG9nLCBkaWFsb2csIHJlc3BvbnNlSGFuZGxlcikge1xuXG4gIHZhciBleHBhbmRlZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgJHNjb3BlLnRyZWVEYXRhID0ge1xuICAgIHNob3dNZW51OiBmYWxzZVxuICB9O1xuICAkc2NvcGUuYWN0aXZlID0gbnVsbDtcbiAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICBmdW5jdGlvbiBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKHJlc3BvbnNlKSB7XG4gICAgLy8gbm90aWZ5IG9mIGFueSBlcnJvcnMsIG90aGVyd2lzZSBzaWxlbnQuXG4gICAgLy8gVGhlIEZpbGUgU3lzdGVtIFdhdGNoZXIgd2lsbCBoYW5kbGUgdGhlIHN0YXRlIGNoYW5nZXMgaW4gdGhlIGZpbGUgc3lzdGVtXG4gICAgaWYgKHJlc3BvbnNlLmVycikge1xuICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgdGl0bGU6ICdGaWxlIFN5c3RlbSBFcnJvcicsXG4gICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLmVycilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gICRzY29wZS5nZXRDbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgICB2YXIgY2xhc3NlcyA9IFsnZnNvJ107XG4gICAgY2xhc3Nlcy5wdXNoKGZzby5pc0RpcmVjdG9yeSA/ICdkaXInIDogJ2ZpbGUnKTtcblxuICAgIGlmIChmc28gPT09ICRzY29wZS5hY3RpdmUpIHtcbiAgICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICB9O1xuXG4gICRzY29wZS5nZXRJY29uQ2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2ZhJ107XG5cbiAgICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICBjbGFzc2VzLnB1c2goJHNjb3BlLmlzRXhwYW5kZWQoZnNvKSA/ICdmYS1mb2xkZXItb3BlbicgOiAnZmEtZm9sZGVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNsYXNzZXMucHVzaCgnZmEtZmlsZS1vJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICB9O1xuXG4gICRzY29wZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuICEhZXhwYW5kZWRbZnNvLnBhdGhdO1xuICB9O1xuXG4gICRzY29wZS5yaWdodENsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGNvbnNvbGUubG9nKCdSQ2xpY2tlZCAnICsgZnNvLm5hbWUpO1xuICAgICRzY29wZS5tZW51WCA9IGUucGFnZVg7XG4gICAgJHNjb3BlLm1lbnVZID0gZS5wYWdlWTtcbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuICAgICRzY29wZS50cmVlRGF0YS5zaG93TWVudSA9IHRydWU7XG4gIH07XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgIHZhciBpc0V4cGFuZGVkID0gJHNjb3BlLmlzRXhwYW5kZWQoZnNvKTtcbiAgICAgIGlmIChpc0V4cGFuZGVkKSB7XG4gICAgICAgIGRlbGV0ZSBleHBhbmRlZFtmc28ucGF0aF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHBhbmRlZFtmc28ucGF0aF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAkc2NvcGUub3Blbihmc28pO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cuY29uZmlybSh7XG4gICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdEZWxldGUgWycgKyBmc28ubmFtZSArICddLiBBcmUgeW91IHN1cmU/J1xuICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbW92ZShmc28ucGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ1JlbmFtZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2ZpbGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZpbGUnLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGaWxlIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZmlsZShwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZmlsZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2RpciA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRm9sZGVyIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZvbGRlciBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtkaXIocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY29weScpIHtcbiAgICAgIGZpbGVzeXN0ZW0uY29weShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjdXQnKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH1cblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgfTtcblxuICAkc2NvcGUuc2hvd1Bhc3RlID0gZnVuY3Rpb24oZSwgYWN0aXZlKSB7XG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyICYmIGFjdGl2ZS5pc0RpcmVjdG9yeSkge1xuICAgICAgaWYgKCFwYXN0ZUJ1ZmZlci5mc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZS5wYXRoLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXN0ZUJ1ZmZlci5mc28ucGF0aC50b0xvd2VyQ2FzZSgpKSAhPT0gMCkgeyAvLyBkaXNhbGxvdyBwYXN0aW5nIGludG8gc2VsZiBvciBhIGRlY2VuZGVudFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5zZXRQYXN0ZUJ1ZmZlciA9IGZ1bmN0aW9uKGUsIGZzbywgb3ApIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IHtcbiAgICAgIGZzbzogZnNvLFxuICAgICAgb3A6IG9wXG4gICAgfTtcblxuICB9O1xuXG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5cbm1vZC5jb25maWcoW1xuICAnJHN0YXRlUHJvdmlkZXInLFxuICByZXF1aXJlKCcuL2NvbmZpZycpXG5dKTtcblxubW9kLnNlcnZpY2UoJ1Nlc3Npb25TZXJ2aWNlJywgW1xuICByZXF1aXJlKCcuL3NlcnZpY2VzL3Nlc3Npb24nKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0N0cmwnLCBbXG4gICckc2NvcGUnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaW5kZXJDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICckbG9nJyxcbiAgJyRxJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnRmlsZVNlcnZpY2UnLFxuICAnUmVzcG9uc2VIYW5kbGVyJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9maW5kZXInKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0ZpbGVDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICdzZXNzaW9uJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9maWxlJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNTZWFyY2hDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvc2VhcmNoJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNEaXJDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJ2RpcicsXG4gICdGaWxlU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNUcmVlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckbW9kYWwnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvdHJlZScpXG5dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJmdW5jdGlvbiBGaW5kZXJNb2RlbChhY3RpdmUpIHtcbiAgLy8gdGhpcy50cmVlID0gdHJlZTtcbiAgdGhpcy5hY3RpdmUgPSBhY3RpdmU7XG59XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuX3JlYWRDb2xzID0gZnVuY3Rpb24odHJlZSkge1xuXG4gIC8vdmFyIHRyZWUgPSB0aGlzLl90cmVlO1xuICB2YXIgYWN0aXZlID0gdGhpcy5fYWN0aXZlO1xuICAvL3ZhciBhY3RpdmVJc0RpciA9IGFjdGl2ZS5pc0RpcmVjdG9yeTtcblxuICB2YXIgY29scyA9IFtdO1xuXG4gIGlmIChhY3RpdmUpIHtcblxuICAgIHZhciBjdXJyID0gYWN0aXZlLmlzRGlyZWN0b3J5ID8gYWN0aXZlIDogYWN0aXZlLnBhcmVudDtcbiAgICBkbyB7XG4gICAgICBjb2xzLnVuc2hpZnQoY3Vyci5jaGlsZHJlbik7XG4gICAgICBjdXJyID0gY3Vyci5wYXJlbnQ7XG4gICAgfSB3aGlsZSAoY3Vycik7XG5cbiAgICBjb2xzLnNoaWZ0KCk7XG5cbiAgfSBlbHNlIHtcbiAgICBjb2xzLnB1c2godHJlZS5jaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gY29scztcblxufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5nZXRDbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGNsYXNzZXMgPSBbJ2ZzbyddO1xuICBjbGFzc2VzLnB1c2goZnNvLmlzRGlyZWN0b3J5ID8gJ2RpcicgOiAnZmlsZScpO1xuXG4gIGlmIChmc28gPT09IHRoaXMuYWN0aXZlKSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdhY3RpdmUnKTtcbiAgfVxuXG4gIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuZ2V0SWNvbkNsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgY2xhc3NlcyA9IFsnZmEnXTtcblxuICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgY2xhc3Nlcy5wdXNoKHRoaXMuaXNFeHBhbmRlZChmc28pID8gJ2ZhLWZvbGRlci1vcGVuLW8nIDogJ2ZhLWZvbGRlci1vJyk7XG4gIH0gZWxzZSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdmYS1maWxlJyk7XG4gIH1cblxuICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmlzSGlnaGxpZ2h0ZWQgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGFjdGl2ZSA9IHRoaXMuX2FjdGl2ZTtcbiAgdmFyIGlzSGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblxuICBpZiAoZnNvID09PSBhY3RpdmUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChhY3RpdmUgJiYgZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgLy8gY2hlY2sgaWYgaXQgaXMgYW4gYW5jZXN0b3JcbiAgICB2YXIgciA9IGFjdGl2ZTtcbiAgICB3aGlsZSAoci5wYXJlbnQpIHtcbiAgICAgIGlmIChyID09PSBmc28pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByID0gci5wYXJlbnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZGlyKSB7XG4gIHJldHVybiB0aGlzLmlzSGlnaGxpZ2h0ZWQoZGlyKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuY29scyA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgcmV0dXJuIHRoaXMuX3JlYWRDb2xzKHRyZWUpO1xufTtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhGaW5kZXJNb2RlbC5wcm90b3R5cGUsIHtcbiAgYWN0aXZlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9hY3RpdmUgPSB2YWx1ZTtcbiAgICAgIGlmICh0aGlzLl9hY3RpdmUuaXNGaWxlKSB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZUZpbGUgPSB0aGlzLl9hY3RpdmU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBhY3RpdmVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmVGaWxlO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJNb2RlbDtcbiIsImZ1bmN0aW9uIFNlc3Npb24oZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5wYXRoID0gZGF0YS5wYXRoO1xuICB0aGlzLnRpbWUgPSBkYXRhLnRpbWU7XG4gIHRoaXMuZGF0YSA9IGRhdGEuZGF0YSB8fCB7fTtcbiAgdGhpcy5pc1V0ZjggPSBkYXRhLmlzVXRmODtcbn1cblNlc3Npb24ucHJvdG90eXBlLm1hcmtDbGVhbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKSB7XG4gICAgdGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKCkubWFya0NsZWFuKCk7XG4gIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZXNzaW9uLnByb3RvdHlwZSwge1xuICBpc0RpcnR5OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIoKS5pc0NsZWFuKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbm1vZHVsZS5leHBvcnRzID0gU2Vzc2lvbjtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2ZzJywgW10pO1xuIiwidmFyIFNlc3Npb24gPSByZXF1aXJlKCcuLi9tb2RlbHMvc2Vzc2lvbicpO1xudmFyIGZzdyA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcblxudmFyIFNlc3Npb25zID0gZnVuY3Rpb24obWFwKSB7XG4gIHRoaXMuX3Nlc3Npb25zID0gW107XG4gIHRoaXMuX21hcCA9IG1hcDtcbn07XG5TZXNzaW9ucy5wcm90b3R5cGUuZmluZFNlc3Npb24gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZXNzaW9ucyA9IHRoaXMuX3Nlc3Npb25zO1xuXG4gIHJldHVybiBzZXNzaW9ucy5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBwYXRoO1xuICB9KTtcblxufTtcblNlc3Npb25zLnByb3RvdHlwZS5hZGRTZXNzaW9uID0gZnVuY3Rpb24ocGF0aCwgZGF0YSwgaXNVdGY4KSB7XG5cbiAgaWYgKHRoaXMuZmluZFNlc3Npb24ocGF0aCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZm9yIHBhdGggZXhpc3RzIGFscmVhZHkuJyk7XG4gIH1cblxuICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcbiAgdmFyIHNlc3Npb24gPSBuZXcgU2Vzc2lvbih7XG4gICAgcGF0aDogcGF0aCxcbiAgICB0aW1lOiBEYXRlLm5vdygpLFxuICAgIGRhdGE6IGRhdGEsXG4gICAgaXNVdGY4OiBpc1V0ZjhcbiAgfSk7XG4gIHNlc3Npb25zLnVuc2hpZnQoc2Vzc2lvbik7XG5cbiAgcmV0dXJuIHNlc3Npb247XG59O1xuU2Vzc2lvbnMucHJvdG90eXBlLnJlbW92ZVNlc3Npb24gPSBmdW5jdGlvbihzZXNzaW9uKSB7XG5cbiAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG5cbiAgdmFyIGlkeCA9IHNlc3Npb25zLmluZGV4T2Yoc2Vzc2lvbik7XG4gIGlmIChpZHggIT09IC0xKSB7XG4gICAgc2Vzc2lvbnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZXNzaW9ucy5wcm90b3R5cGUsIHtcbiAgc2Vzc2lvbnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gICAgICByZXR1cm4gc2Vzc2lvbnM7XG4gICAgICAvLyB2YXIgbWFwID0gdGhpcy5fbWFwO1xuICAgICAgLy9cbiAgICAgIC8vIC8vIGNsZWFuIGFueSBmaWxlcyB0aGF0IG1heSBubyBsb25nZXIgZXhpc3RcbiAgICAgIC8vIC8vIHZhciBpID0gc2Vzc2lvbnMubGVuZ3RoO1xuICAgICAgLy8gLy8gd2hpbGUgKGktLSkge1xuICAgICAgLy8gLy8gICBpZiAoIW1hcFtzZXNzaW9uc1tpXS5wYXRoXSkge1xuICAgICAgLy8gLy8gICAgIHNlc3Npb25zLnNwbGljZShpLCAxKTtcbiAgICAgIC8vIC8vICAgfVxuICAgICAgLy8gLy8gfVxuICAgICAgLy9cbiAgICAgIC8vIHJldHVybiBzZXNzaW9ucy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgLy8gICByZXR1cm4gbWFwW2l0ZW0ucGF0aF07XG4gICAgICAvLyB9LCB0aGlzKTtcblxuICAgIH1cbiAgfSxcbiAgZGlydHk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gICAgICByZXR1cm4gdGhpcy5zZXNzaW9ucy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5pc0RpcnR5O1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcblxuXG4vKlxuICogbW9kdWxlIGV4cG9ydHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgc2Vzc2lvbnMgPSBuZXcgU2Vzc2lvbnMoZnN3Lm1hcCk7XG4gIHJldHVybiBzZXNzaW9ucztcblxufTtcbiIsIlxuXG53aW5kb3cuYXBwID0gcmVxdWlyZSgnLi9hcHAnKTtcblxuXG4vL3dpbmRvdy5mcyA9IHJlcXVpcmUoJy4vZnMnKTtcblxuLy8gLy8gKioqKioqKioqKi8vKlxuLy8gLy8gU2hpbXNcbi8vIC8vICoqKioqKioqKioqXG5yZXF1aXJlKCcuL2FycmF5Jyk7XG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIERpcmVjdGl2ZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL25lZ2F0ZScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9mb2N1cycpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9kYi1kaWFncmFtJyk7XG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL3JpZ2h0LWNsaWNrJyk7XG4vLyAvLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL2JlaGF2ZScpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gQ29udHJvbGxlcnNcbi8vIC8vICoqKioqKioqKioqXG4vL1xuLy8gLy8gZGlhbG9nIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2NvbmZpcm0nKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYWxlcnQnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvcHJvbXB0Jyk7XG4vL1xuLy8gLy8gaG9tZSBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2hvbWUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy90cmVlJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvZmlsZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbmRlcicpO1xuLy9cbi8vIC8vIGRiIG1vZGVsIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2tleScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9hcnJheS1kZWYnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvc2NoZW1hJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL21vZGVsJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RiJyk7XG4vL1xuLy9cbi8vIC8vIGFwaSBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYXBpJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9jb250cm9sbGVyJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9oYW5kbGVyJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9yb3V0ZScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWN0aW9uJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9kaWFncmFtJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9hZGQtcmVzb3VyY2UnKTtcbi8vXG4vL1xuLy8gLy8gbWFpbiBhcHAgY29udHJvbGxlclxuLy8gcmVxdWlyZSgnLi9hcHAvY29udHJvbGxlcnMvYXBwJyk7XG4vL1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBTZXJ2aWNlc1xuLy8gLy8gKioqKioqKioqKipcbi8vIHJlcXVpcmUoJy4vc2VydmljZXMvZGlhbG9nJyk7XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxudmFyIEZpbGVTeXN0ZW1PYmplY3QgPSBmdW5jdGlvbihwYXRoLCBzdGF0KSB7XG4gIHRoaXMubmFtZSA9IHAuYmFzZW5hbWUocGF0aCkgfHwgcGF0aDtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5kaXIgPSBwLmRpcm5hbWUocGF0aCk7XG4gIHRoaXMuaXNEaXJlY3RvcnkgPSB0eXBlb2Ygc3RhdCA9PT0gJ2Jvb2xlYW4nID8gc3RhdCA6IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgdGhpcy5leHQgPSBwLmV4dG5hbWUocGF0aCk7XG4gIHRoaXMuc3RhdCA9IHN0YXQ7XG59O1xuRmlsZVN5c3RlbU9iamVjdC5wcm90b3R5cGUgPSB7XG4gIGdldCBpc0ZpbGUoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzRGlyZWN0b3J5O1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlU3lzdGVtT2JqZWN0O1xuIiwiLyogZ2xvYmFsIGRpYWxvZyAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcm5kc3RyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKCtuZXcgRGF0ZSgpKS50b1N0cmluZygzNik7XG4gIH0sXG4gIGdldHVpZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucmFuZG9tKCkgKiAxZTcpKS50b1N0cmluZygpO1xuICB9LFxuICBnZXR1aWRzdHI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbiAgfSxcbiAgdXJsUm9vdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0O1xuICB9LFxuICBlbmNvZGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBidG9hKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKTtcbiAgfSxcbiAgZGVjb2RlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGF0b2Ioc3RyKSk7XG4gIH0sXG4gIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKG9yaWdpbiwgYWRkKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICAgIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gb3JpZ2luO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdpbjtcbiAgfSxcbiAgdWk6IHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfVxufTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJxKzY0ZndcIikpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iXX0=
