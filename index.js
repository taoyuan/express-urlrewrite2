
/**
 * Module dependencies.
 */

 var debug = require('debug')('express-urlrewrite2');
 var toRegexp = require('path-to-regexp');
 var URL = require('url');

/**
 * Expose `expose`.
 */

module.exports = rewrite;

/**
 * Rewrite `src` to `dst`.
 *
 * @param {String|RegExp} src source url for two parameters or destination url for one parameter
 * @param {String} [dst] destination url
 * @return {Function}
 * @api public
 */

function rewrite(src, dst) {
  var keys = [], re, map;

  if (dst) {
    re = toRegexp(src, keys);
    map = toMap(keys);
    debug('rewrite %s -> %s    %s', src, dst, re);
  } else {
    debug('rewrite current route -> %s', src);
  }

  return function(req, res, next) {
    var orig = req.url;
    var m;
    if (dst) {
      m = re.exec(orig);
      if (!m) {
        return next();
      }
    }
    var url = dst || src;
    if (/^\/\//.test(url)) {
      req.baseUrl = '';
      url = url.substr(1);
    }
    req.url = url.replace(/\$(\d+)|(?::(\w+))/g, function(_, n, name) {
      if (name) {
        if (m) return m[map[name].index + 1];
        else return req.params[name];
      } else if (m) {
        return m[n];
      } else {
        return req.params[n];
      }
    });
    debug('rewrite %s -> %s', orig, req.url);
    if (req.url.indexOf('?') > 0) {
      req.query = URL.parse(req.url, true).query;
      debug('rewrite updated new query', req.query);
    }
    if (dst) next();
    else next('route');
  }
}

/**
 * Turn params array into a map for quick lookup.
 *
 * @param {Array} params
 * @return {Object}
 * @api private
 */

function toMap(params) {
  var map = {};

  params.forEach(function(param, i) {
    param.index = i;
    map[param.name] = param;
  });

  return map;
}
