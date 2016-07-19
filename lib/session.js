/**!
 * koa-generic-session - lib/session.js
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

const debug = require('debug')('koa-generic-session:session');
const MemoryStore = require('./memory_store');
const crc32 = require('crc').crc32;
const parse = require('parseurl');
const Store = require('./store');
const copy = require('copy-to');
const uid = require('uid-safe');

/**
 * Warning message for `MemoryStore` usage in production.
 */

const warning = 'Warning: koa-generic-session\'s MemoryStore is not\n' +
  'designed for a production environment, as it will leak\n' +
  'memory, and will not scale past a single process.';

const defaultCookie = {
  httpOnly: true,
  path: '/',
  overwrite: true,
  signed: true,
  maxAge: 24 * 60 * 60 * 1000 //one day in ms
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
 *   - [`errorHanlder`] handler for session store get or set error
 *   - [`valid`] valid(ctx, session), valid session value before use it
 *   - [`beforeSave`] beforeSave(ctx, session), hook before save session
 *   - [`sessionIdStore`] object with get, set, reset methods for passing session id throw requests.
 */

module.exports = function (options) {
  options = options || {};
  let key = options.key || 'koa.sid';
  let client = options.store || new MemoryStore();
  let errorHandler = options.errorHandler || defaultErrorHanlder;
  let reconnectTimeout = options.reconnectTimeout || 10000;

  let store = new Store(client, {
    ttl: options.ttl,
    prefix: options.prefix
  });

  let genSid = options.genSid || uid.sync;
  let valid = options.valid || noop;
  let beforeSave = options.beforeSave || noop;

  let cookie = options.cookie || {};
  copy(defaultCookie).to(cookie);

  let storeStatus = 'available';
  let waitStore = Promise.resolve();

  // notify user that this store is not
  // meant for a production environment
  if ('production' === process.env.NODE_ENV
   && client instanceof MemoryStore) console.warn(warning);

  let sessionIdStore = options.sessionIdStore || {

    get: function() {
      return this.cookies.get(key, cookie);
    },

    set: function(sid, session) {
      this.cookies.set(key, sid, session.cookie);
    },

    reset: function() {
      this.cookies.set(key, null);
    }
  };

  store.on('disconnect', function() {
    if (storeStatus !== 'available') return;
    storeStatus = 'pending';
    waitStore = new Promise(function (resolve, reject) {
      setTimeout(function () {
        if (storeStatus === 'pending') storeStatus = 'unavailable';
        reject(new Error('session store is unavailable'));
      }, reconnectTimeout);
      store.once('connect', resolve);
    });

  });

  store.on('connect', function() {
    storeStatus = 'available';
    waitStore = Promise.resolve();
  });

  // save empty session hash for compare
  const EMPTY_SESSION_HASH = hash(generateSession());

  return options.defer ? deferSession : session;

  function addCommonAPI() {

    this._sessionSave = null;

    // more flexible
    this.__defineGetter__('sessionSave', function () {
      return this._sessionSave;
    });

    this.__defineSetter__('sessionSave', function (save) {
      this._sessionSave = save;
    });
  }

  /**
   * generate a new session
   */
  function generateSession() {
    let session = {};
    //you can alter the cookie options in nexts
    session.cookie = {};
    for (let prop in cookie) {
      session.cookie[prop] = cookie[prop];
    }
    compatMaxage(session.cookie);
    return session;
  }

  /**
   * check url match cookie's path
   */
  function matchPath(ctx) {
    let pathname = parse(ctx).pathname;
    let cookiePath = cookie.path || '/';
    if (cookiePath === '/') {
      return true;
    }
    if (pathname.indexOf(cookiePath) !== 0) {
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
    if (!matchPath(this)) return;
    if (storeStatus === 'pending') {
      debug('store is disconnect and pending');
      yield waitStore;
    } else if (storeStatus === 'unavailable') {
      debug('store is unavailable');
      throw new Error('session store is unavailable');
    }

    if (!this.sessionId) {
      this.sessionId = sessionIdStore.get.call(this);
    }

    let session;
    let isNew = false;
    if (!this.sessionId) {
      debug('session id not exist, generate a new one');
      session = generateSession();
      this.sessionId = genSid.call(this, 24);
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
          errorHandler(err, 'get', this);
        }
      }
    }

    // make sure the session is still valid
    if (!session ||
      !valid(this, session)) {
      debug('session is empty or invalid');
      session = generateSession();
      this.sessionId = genSid.call(this, 24);
      sessionIdStore.reset.call(this);
      isNew = true;
    }

    // get the originHash
    let originalHash = !isNew && hash(session);

    return {
      originalHash: originalHash,
      session: session,
      isNew: isNew
    };
  }

  /**
   * after everything done, refresh the session
   *   if session === null; delete it from store
   *   if session is modified, update cookie and store
   */
  function *refreshSession (session, originalHash, isNew) {

    // reject any session changes, and do not update session expiry
    if(this._sessionSave === false) {
      return debug('session save disabled');
    }

    //delete session
    if (!session) {
      if (!isNew) {
        debug('session set to null, destroy session: %s', this.sessionId);
        sessionIdStore.reset.call(this);
        return yield store.destroy(this.sessionId);
      }
      return debug('a new session and set to null, ignore destroy');
    }

    // force saving non-empty session
    if(this._sessionSave === true) {
      debug('session save forced');
      return yield saveNow.call(this, this.sessionId, session);
    }

    let newHash = hash(session);
    // if new session and not modified, just ignore
    if (!options.allowEmpty && isNew && newHash === EMPTY_SESSION_HASH) {
      return debug('new session and do not modified');
    }

    // rolling session will always reset cookie and session
    if (!options.rolling && newHash === originalHash) {
      return debug('session not modified');
    }

    debug('session modified');

    yield saveNow.call(this, this.sessionId, session);

  }

  function *saveNow(id, session) {
    compatMaxage(session.cookie);

    // custom before save hook
    beforeSave(this, session);

    //update session
    try {
      yield store.set(id, session);
      sessionIdStore.set.call(this, id, session);
      debug('saved');
    } catch (err) {
      debug('set session error: ', err.message);
      errorHandler(err, 'set', this);
    }
  }

  /**
   * common session middleware
   * each request will generate a new session
   *
   * ```
   * let session = this.session;
   * ```
   */
  function *session(next) {
    this.sessionStore = store;
    if (this.session || this._session) {
      return yield next;
    }
    let result = yield getSession.call(this);
    if (!result) {
      return yield next;
    }

    addCommonAPI.call(this);

    this._session = result.session;

    // more flexible
    this.__defineGetter__('session', function () {
      return this._session;
    });

    this.__defineSetter__('session', function (sess) {
      this._session = sess;
    });

    this.regenerateSession = function *regenerateSession() {
      debug('regenerating session');
      if (!result.isNew) {
        // destroy the old session
        debug('destroying previous session');
        yield store.destroy(this.sessionId);
      }

      this.session = generateSession();
      this.sessionId = genSid.call(this, 24);
      sessionIdStore.reset.call(this);

      debug('created new session: %s', this.sessionId);
      result.isNew = true;
    }

    // make sure `refreshSession` always called
    var firstError = null;
    try {
      yield next;
    } catch (err) {
      debug('next logic error: %s', err.message);
      firstError = err;
    }
    // can't use finally because `refreshSession` is async
    try {
      yield refreshSession.call(this, this.session, result.originalHash, result.isNew);
    } catch (err) {
      debug('refresh session error: %s', err.message);
      if (firstError) this.app.emit('error', err, this);
      firstError = firstError || err;
    }
    if (firstError) throw firstError;
  }

  /**
   * defer session middleware
   * only generate and get session when request use session
   *
   * ```
   * let session = yield this.session;
   * ```
   */
  function *deferSession(next) {
    this.sessionStore = store;

    if (this.session) {
      return yield next;
    }
    let isNew = false;
    let originalHash = null;
    let touchSession = false;
    let getter = false;

    // if path not match
    if (!matchPath(this)) {
      return yield next;
    }

    addCommonAPI.call(this);

    this.__defineGetter__('session', function *() {
      if (touchSession) {
        return this._session;
      }
      touchSession = true;
      getter = true;

      let result = yield getSession.call(this);
      // if cookie path not match
      // this route's controller should never use session
      if (!result) return;

      originalHash = result.originalHash;
      isNew = result.isNew;
      this._session = result.session;
      return this._session;
    });

    this.__defineSetter__('session', function (value) {
      touchSession = true;
      this._session = value;
    });

    this.regenerateSession = function *regenerateSession() {
      debug('regenerating session');
      // make sure that the session has been loaded
      yield this.session;

      if (!isNew) {
        // destroy the old session
        debug('destroying previous session');
        yield store.destroy(this.sessionId);
      }

      this._session = generateSession();
      this.sessionId = genSid.call(this, 24);
      sessionIdStore.reset.call(this);
      debug('created new session: %s', this.sessionId);
      isNew = true;
      return this._session;
    }

    yield next;

    if (touchSession) {
      // if only this.session=, need try to decode and get the sessionID
      if (!getter) {
        this.sessionId = sessionIdStore.get.call(this);
      }

      yield refreshSession.call(this, this._session, originalHash, isNew);
    }
  }
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
    opts.maxage = opts.maxage === undefined
      ? opts.maxAge
      : opts.maxage;
    delete opts.maxAge;
  }
}

module.exports.MemoryStore = MemoryStore;

function defaultErrorHanlder (err, type, ctx) {
  err.name = 'koa-generic-session ' + type + ' error';
  throw err;
}

function noop () {
  return true;
}
