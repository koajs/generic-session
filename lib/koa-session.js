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

var debug = require('debug')('koa:sess');
var uid = require('uid2');
var signature = require('cookie-signature');
var parse = require('url').parse;
var MemoryStore = require('./store');
var EventEmitter = require('events').EventEmitter;

exports.MemoryStore = MemoryStore;

/**
 * Warning message for `MemoryStore` usage in production.
 */

var warning = 'Warning: connect.session() MemoryStore is not\n' + 
  'designed for a production environment, as it will leak\n' + 
  'memory, and will not scale past a single process.';

/**
 * setup session store with the given `options`
 * @param {Object} options 
 *   - `key` cookie name defaulting to `connect.sid`
 *   - `store` session store instance
 *   - `secret` session cookie is signed with this secret to prevent tampering
 *   - `cookie` session cookie settings, defaulting to `{ path: '/', httpOnly: true, maxAge: null }`
 */
module.exports = function (options) {
  options = options || {};
  var key = options.key || 'koa.sid';
  var store = options.store || new MemoryStore();
  var cookie = options.cookie || {};
  var storeReady = true;
  var secret = options.secret;
  
  if (!secret) {
    throw new Error('`secret` option required for sessions');
  }

  // notify user that this store is not
  // meant for a production environment
  if ('production' === process.env.NODE_ENV && store instanceof MemoryStore) {
    console.warn(warning);
  }

  if (store instanceof EventEmitter) {
    store.on('disconnect', function() { storeReady = false; });
    store.on('connect', function() { storeReady = true; });
  }

  return function *(next) {
    if (this.session) {
      return yield next;
    }
    if (!storeReady) {
      debug('store is disconnect');
      // avoid session undefined
      // not so sure really need this
      this.session = {};
      return yield next;
    }

    var originalPath = parse(this.request.originalUrl).pathname;
    if (0 !== originalPath.indexOf(cookie.path || '/')) {
      return yield next;
    }

    this.sessionId = parseSignedCookie(this, key, secret);
    if (!this.sessionId) {
      debug('session id not exist, generate a new one');
      this.sessionId = uid(24);
      this.session = {};
    } else {
      try {
        this.session = yield store.get(this.sessionId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT');
        } else {
          console.error(err.stack);
          return yield next(err);
        }
      }
    }

    if (!this.session) {
      debug('can not get with key:%s from session store, generate a new one', this.sessionId);
      this.session = {};
    }
    yield next;

    //delete session
    if (!this.session) {
      return yield store.destroy(this.sessionId);
    }

    //update session
    try {
      yield store.set(this.sessionId, this.session);
    } catch (err) {
      console.error(err.stack);
    }
    debug('saved');

    //update cookie
    //TODO: some situation no need to set cookie again
    this.cookies.set(key, 's:' + signature.sign(this.sessionId, secret), options.cookie);
  };
};

function parseSignedCookie(ctx, key, secret) {
  var val = ctx.cookies.get(key);
  if (!val) {
    debug('can not get session cookie');
    return '';
  }
  val = signature.unsign(val.slice(2), secret);
  return val;
}
