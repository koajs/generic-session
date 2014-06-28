/**!
 * koa-session - lib/koa-session.js
 * Copyright(c) 2013 - 2014
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
var copy = require('copy-to');
var uid = require('uid-safe');
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

/**
 * setup session store with the given `options`
 * @param {Object} options
 *   - [`key`] cookie name, defaulting to `koa.sid`
 *   - [`store`] session store instance, default to MemoryStore
 *   - [`ttl`] store ttl in `ms`, default to oneday
 *   - [`prefix`] session prefix for store, defaulting to `koa:sess:`
 *   - [`cookie`] session cookie settings, defaulting to
 *     {path: '/', httpOnly: true, maxAge: null, rewrite: true, signed: true}
 *   - [`defer`] defer get session,
 *   - [`rolling`]  rolling session, always reset the cookie and sessions, default is false
 *     you should `yield this.session` to get the session if defer is true, default is false
 *   - [`genSid`] you can use your own generator for sid
 */
module.exports = function (options) {
  console.warn('This module renamed to koa-generic-session in npm now, please update');

  options = options || {};
  var key = options.key || 'koa.sid';
  var client = options.store || new MemoryStore();

  var store = new Store(client, {
    ttl: options.ttl,
    prefix: options.prefix
  });

  var genSid = options.genSid || uid.sync;

  var cookie = options.cookie || {};
  copy(defaultCookie).to(cookie);

  var storeAvailable = true;
  // notify user that this store is not
  // meant for a production environment
  if ('production' === process.env.NODE_ENV && client instanceof MemoryStore) {
    console.warn(warning);
  }

  store.on('disconnect', function() { storeAvailable = false; });
  store.on('connect', function() { storeAvailable = true; });

  // save empty session hash for compare
  var EMPTY_SESSION_HASH = hash(generateSession());

  /**
   * generate a new session
   */
  function generateSession() {
    var session = {};
    //you can alter the cookie options in nexts
    session.cookie = {};
    for (var prop in cookie) {
      session.cookie[prop] = cookie[prop];
    }
    compatMaxage(session.cookie);
    return session;
  }

  function matchPath(ctx) {
    var pathname = ctx.path;
    if (pathname.indexOf(cookie.path || '/') !== 0) {
      debug('cookie path not match');
      return false;
    }
    return true;
  }

  /**
   * get session from store
   *   get sessionId from cookie
   *   save sessionId into context
   *   get session from store
   */
  function *getSession() {
    if (!storeAvailable) {
      debug('store is disconnect');
      return {
        status: 500,
        message: 'session store error'
      };
    }

    if (!matchPath(this)) {
      return {
        status: 400,
        message: 'cookie path not match'
      };
    }

    this.sessionId = this.cookies.get(key, {
      signed: cookie.signed
    });

    var session;
    if (!this.sessionId) {
      debug('session id not exist, generate a new one');
      session = generateSession();
    } else {
      try {
        session = yield store.get(this.sessionId);
        debug('get session %j with key %s', session, this.sessionId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT');
        } else {
          debug('get session error: ', err.message);
          return {
            status: 500,
            message: 'get session from store error'
          };
        }
      }
    }

    if (!session) {
      debug('can not get with key:%s from session store, generate a new one', this.sessionId);
      session = generateSession();
      // remove session id if no session
      this.sessionId = null;
    }

    // get the originHash
    var originalHash = this.sessionId ? hash(session) : null;

    return {
      status: 200,
      originalHash: originalHash,
      session: session
    };
  }

  /**
   * after everything done, refresh the session
   *   if session === null; delete it from store
   *   if session is modified, update cookie and store
   */
  function *refreshSession (session, originalHash) {
    //delete session
    if (!session) {
      if (this.sessionId) {
        debug('session set to null, destroy session: %s', this.sessionId);
        return yield store.destroy(this.sessionId);
      } else {
        return debug('a new session and set to null, ignore destroy');
      }
    }

    var newHash = hash(session);
    // if new session and not modified, just ignore
    if (!this.sessionId && newHash === EMPTY_SESSION_HASH) {
      return debug('new session and do not modified');
    }

    // rolling session will always reset cookie and session
    if (!options.rolling && newHash === originalHash) {
      return debug('session not modified');
    }

    this.sessionId = this.sessionId || genSid(24);
    debug('session modified');
    compatMaxage(session.cookie);

    //update session
    try {
      yield store.set(this.sessionId, session);
      this.cookies.set(key, this.sessionId, session.cookie);
      debug('saved');
    } catch (err) {
      debug('set session error: ', err.message);
    }
  }

  /**
   * common session middleware
   * each request will generate a new session
   *
   * ```
   * var session = this.session;
   * ```
   */
  function *session(next) {
    if (this.session) {
      return yield *next;
    }
    var result = yield *getSession.call(this);
    if (result.status === 500) {
      return this.throw(result.message);
    }
    if (result.status === 400) {
      return yield *next;
    }

    this.session = result.session;
    yield *next;

    yield *refreshSession.call(this, this.session, result.originalHash);
  }

  /**
   * defer session middleware
   * only generate and get session when request use session
   *
   * ```
   * var session = yield this.session;
   * ```
   */
  function *deferSession(next) {
    if (this.session) {
      return yield *next;
    }
    var isNew = false;
    var originalHash = null;
    var touchSession = false;
    var getter = false;

    // if path not match
    if (!matchPath(this)) {
      return yield *next;
    }

    this.__defineGetter__('session', function *() {
      if (touchSession) {
        return this._session;
      }
      touchSession = true;
      getter = true;

      var result = yield *getSession.call(this);
      // if 500, just throw
      if (result.status === 500) {
        throw new Error(result.message);
      }
      // if cookie path not match
      // this route's controller should never use session
      if (result.status === 400) {
        return undefined;
      }

      originalHash = result.originalHash;
      this._session = result.session;
      return this._session;
    });

    this.__defineSetter__('session', function (value) {
      touchSession = true;
      this._session = value;
    });

    yield *next;

    if (touchSession) {
      // if only this.session=, need try to decode and get the sessionID
      if (!getter) {
        this.sessionId = this.cookies.get(key, {signed: cookie.signed});
      }

      yield *refreshSession.call(this, this._session, originalHash);
    }
  }

  return options.defer ? deferSession : session;
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

