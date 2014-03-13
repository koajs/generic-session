/**!
 * koa-session - lib/koa-session.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */


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

  /**
   * generate a new session
   * @param {Context} ctx
   */
  function generateSession(ctx) {
    ctx.sessionId = ctx.sessionId || uid(24);
    var session = {};
    //you can alter the cookie options in nexts
    session.cookie = {};
    for (var prop in cookie) {
      session.cookie[prop] = cookie[prop];
    }
    compatMaxage(session.cookie);
    return session;
  }

  function *getSession() {
    if (!storeAvailable) {
      debug('store is disconnect');
      return this.throw('session store error', 500);
    }

    var originalPath = parse(this.request.originalUrl).pathname;
    if (0 !== originalPath.indexOf(cookie.path || '/')) {
      debug('cookie path not match');
      return null;
    }

    this.sessionId = this.cookies.get(key, {
      signed: cookie.signed
    });
    var isNew = false;
    var session;
    if (!this.sessionId) {
      debug('session id not exist, generate a new one');
      session = generateSession(this);
      isNew = true;
    } else {
      try {
        session = yield store.get(this.sessionId);
        debug('get session %j with key %s', session, this.sessionId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT');
        } else {
          debug('get session error: ', err.message);
          console.error(err.stack);
          return this.throw('get session from store error', 500);
        }
      }
    }

    if (!session) {
      debug('can not get with key:%s from session store, generate a new one', this.sessionId);
      session = generateSession(this);
      isNew = true;
    }

    // get session's hash first
    var originalHash = null;
    if (!isNew) {
      originalHash = hash(session);
    }

    return {
      isNew: isNew,
      originalHash: originalHash,
      session: session
    };
  }

  function *saveSession (session, isNew, originalHash) {
    //delete session
    if (!session) {
      debug('session set to null, destroy session: %s', this.sessionId);
      return yield store.destroy(this.sessionId);
    }

    if (isNew || originalHash !== hash(session)) {
      debug('session modified');
      // session or cookie options modified
      compatMaxage(session.cookie);
      this.cookies.set(key, this.sessionId, session.cookie);
      //update session
      try {
        yield store.set(this.sessionId, session);
      } catch (err) {
        debug('set session error: ', err.message);
        console.error(err.stack);
      }
      debug('saved');
    }
  }

  function *session(next) {
    if (this.session) {
      return yield *next;
    }
    var result = yield getSession.call(this, next);
    if (!result) {
      return yield *next;
    }

    this.session = result.session;
    yield *next;

    yield *saveSession.call(this, this.session, result.isNew, result.originalHash);
  }

  function *deferSession(next) {
    if (this.session) {
      return yield *next;
    }
    var isNew = false;
    var originalHash = null;
    var touchSession = false;
    this.__defineGetter__('session', function *() {
      if (touchSession) {
        return this._session;
      }
      var result = yield getSession.call(this, next, true);
      if (!result) {
        return undefined;
      }
      touchSession = true;
      isNew = result.isNew;
      originalHash = result.originalHash;
      this._session = result.session;
      return this._session;
    });

    this.__defineSetter__('session', function (value) {
      if (!touchSession) {
        this.sessionId = this.cookies.get(key, {
          signed: cookie.signed
        });
        // ignore if no sessionId
        if (!this.sessionId) {
          return;
        }
      }

      debug('session setter invoked');
      touchSession = true;
      this._session = value;
    });

    yield *next;

    if (touchSession) {
      yield *saveSession.call(this, this._session, isNew, originalHash);
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
