/**!
 * koa-session - lib/koa-session.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var parse = require('url').parse;
var debug = require('debug')('koa:sess');
var uid = require('uid2');
var crc32 = require('buffer-crc32');
var MemoryStore = require('./memory_store');
var Store = require('./store');

exports.MemoryStore = MemoryStore;

/**
 * Warning message for `MemoryStore` usage in production.
 */

var warning = 'Warning: koa.sess() MemoryStore is not\n' +
  'designed for a production environment, as it will leak\n' +
  'memory, and will not scale past a single process.';

var defaultCookie = {
  httpOnly: true,
  path: '/',
  overwrite: true,
  signed: true
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * setup session store with the given `options`
 * @param {Object} options
 *   - [`key`] cookie name, defaulting to `koa.sid`
 *   - [`store`] session store instance, default to MemoryStore
 *   - [`ttl`] store ttl in `ms`, default to oneday
 *   - [`prefix`] session prefix for store, defaulting to `koa:sess:`
 *   - [`cookie`] session cookie settings, defaulting to
 *     {path: '/', httpOnly: true, maxAge: null, rewrite: true, signed: true}
 */
module.exports = function (options) {
  options = options || {};
  var key = options.key || 'koa.sid';
  var client = options.store || new MemoryStore();

  var store = new Store(client, {
    ttl: options.ttl,
    prefix: options.prefix
  });

  var cookie = options.cookie || {};
  for (var prop in defaultCookie) {
    if (!hasOwnProperty(cookie, prop)) {
      cookie[prop] = defaultCookie[prop];
    }
  }

  var storeAvailable = true;
  // notify user that this store is not
  // meant for a production environment
  if ('production' === process.env.NODE_ENV && client instanceof MemoryStore) {
    console.warn(warning);
  }

  store.on('disconnect', function() { storeAvailable = false; });
  store.on('connect', function() { storeAvailable = true; });

  function generateSession(ctx) {
    ctx.sessionId = ctx.sessionId || uid(24);
    ctx.session = {};
    //you can alter the cookie options in nexts
    ctx.session.cookie = {};
    for (var prop in cookie) {
      ctx.session.cookie[prop] = cookie[prop];
    }
    compatMaxage(ctx.session.cookie);
  }

  return function *session(next) {
    if (this.session) {
      return yield next;
    }
    if (!storeAvailable) {
      debug('store is disconnect');
      return this.throw('session store error', 500);
    }

    var originalPath = parse(this.request.originalUrl).pathname;
    if (0 !== originalPath.indexOf(cookie.path || '/')) {
      debug('cookie path not match');
      return yield next;
    }

    this.sessionId = this.cookies.get(key, {
      signed: cookie.signed
    });
    var isNew = false;
    if (!this.sessionId) {
      debug('session id not exist, generate a new one');
      generateSession(this);
      isNew = true;
    } else {
      try {
        this.session = yield store.get(this.sessionId);
        debug('get session %j with key %s', this.session, this.sessionId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT');
        } else {
          console.error(err.stack);
          return this.throw('get session from store error', 500);
        }
      }
    }

    if (!this.session) {
      debug('can not get with key:%s from session store, generate a new one', this.sessionId);
      generateSession(this);
      isNew = true;
    }

    // get session's hash first
    var originalHash = null;
    if (!isNew) {
      originalHash = hash(this.session);
    }

    yield next;

    //delete session
    if (!this.session) {
      return yield store.destroy(this.sessionId);
    }

    if (isNew || originalHash !== hash(this.session)) {
      debug('session modified');
      // session or cookie options modified
      compatMaxage(this.session.cookie);
      this.cookies.set(key, this.sessionId, this.session.cookie);
      //update session
      try {
        yield store.set(this.sessionId, this.session);
      } catch (err) {
        console.error(err.stack);
      }
      debug('saved');
    }
  };
};

/**
 * get the hash of a session include cookie options.
 */
function hash(sess) {
  return crc32.signed(JSON.stringify(sess));
}

/**
 * cookie use maxage, hack to compat connect type `maxAge`
 */
function compatMaxage(opts) {
  if (opts) {
    opts.maxage = opts.maxage || opts.maxAge;
  }
}
