/**
 * Module dependencies.
 */

const debug = require('debug')('express-urlrewrite2');
const toRegexp = require('path-to-regexp');
const URL = require('url');

/**
 * Expose `expose`.
 */

module.exports = rewrite;

/**
 * Rewrite `src` to `dst`.
 *
 * @param {String|RegExp} src source url for two parameters or destination url for one parameter
 * @param {String|Object|Function} [dst] destination url
 * @param {Object|Function} [options] options for rewriting
 * @param {String} [options.methods] http methods
 * @param {Function} [options.filter] filter function
 * @return {Function}
 * @api public
 */

function rewrite(src, dst, options) {
  if (dst && typeof dst !== 'string') {
    options = dst;
    dst = src;
    src = null;
  } else if (!dst) {
    dst = src;
    src = null;
  }

  options = options || {};
  if (typeof options === 'function') {
    options = {filter: options}
  }

  let methods = options.methods || '*';
  if (!Array.isArray(methods)) {
    methods = [methods];
  }
  methods = methods.map(m => m.toUpperCase());

  const {filter} = options;

  let keys = [], re, map;

  if (src) {
    re = toRegexp(src, keys);
    map = toMap(keys);
    debug('rewrite %s -> %s    %s', src, dst, re);
  } else {
    debug('rewrite current route -> %s', src);
  }

  return function (req, res, next) {
    if (!methods.includes('*') && (!methods.includes(req.method.toUpperCase()))) {
      return next();
    }

    const orig = req.url;
    let m;
    if (src) {
      m = re.exec(orig);
      if (!m) {
        return next();
      }
    }

    function exec() {
      req.url = dst.replace(/\$(\d+)|(?::(\w+))/g, function (_, n, name) {
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
      if (src) {
        return next('route');
      }
      next();
    }

    if (filter) {
      const result = filter(m);
      if (result && result.then) {
        return result.then(rewrite => rewrite === false ? next() : exec());
      }
    }
    exec();
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
  const map = {};

  params.forEach(function (param, i) {
    param.index = i;
    map[param.name] = param;
  });

  return map;
}
