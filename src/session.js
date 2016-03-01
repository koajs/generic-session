/**!
 * koa-generic-session - lib/session.js
 * Copyright(c) 2013 - 2016
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 *   Marcus Ekwall <marcus.ekwall@gmail.com> (https://github.com/mekwall)
 */

/**
 * Module dependencies.
 */

import MemoryStore from './memory_store';
import {crc32} from 'crc';
import parse from 'parseurl';
import Store from './store';
import copy from 'copy-to';
import uid from 'uid-safe';
import D from 'debug';

const debug = D('koa-generic-session:session');

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
 *     you should `await ctx.session` to get the session if defer is true, default is false
 *   - [`genSid`] you can use your own generator for sid
 *   - [`errorHanlder`] handler for session store get or set error
 *   - [`valid`] valid(ctx, session), valid session value before use it
 *   - [`beforeSave`] beforeSave(ctx, session), hook before save session
 *   - [`sessionIdStore`] object with get, set, reset methods for passing session id throw requests.
 */

export default function (options) {
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
  async function getSession(ctx) {
    if (!matchPath(ctx)) return;
    if (storeStatus === 'pending') {
      debug('store is disconnect and pending');
      await waitStore;
    } else if (storeStatus === 'unavailable') {
      debug('store is unavailable');
      throw new Error('session store is unavailable');
    }

    if (!ctx.sessionId) {
      ctx.sessionId = sessionIdStore.get.call(ctx);
    }

    let session;
    let isNew = false;
    if (!ctx.sessionId) {
      debug('session id not exist, generate a new one');
      session = generateSession();
      ctx.sessionId = genSid.call(ctx, 24);
      isNew = true;
    } else {
      try {
        session = await store.get(ctx.sessionId);
        debug('get session %j with key %s', session, ctx.sessionId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT');
        } else {
          debug('get session error: ', err.message);
          errorHandler(err, 'get', ctx);
        }
      }
    }

    // make sure the session is still valid
    if (!session ||
      !valid(ctx, session)) {
      debug('session is empty or invalid');
      session = generateSession();
      ctx.sessionId = genSid.call(ctx, 24);
      sessionIdStore.reset.call(ctx);
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
  async function refreshSession(ctx, session, originalHash, isNew) {
    //delete session
    if (!session) {
      if (!isNew) {
        debug('session set to null, destroy session: %s', ctx.sessionId);
        sessionIdStore.reset.call(ctx);
        return await store.destroy(ctx.sessionId);
      }
      return debug('a new session and set to null, ignore destroy');
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
    compatMaxage(session.cookie);

    // custom before save hook
    beforeSave(ctx, session);

    //update session
    try {
      await store.set(ctx.sessionId, session);
      sessionIdStore.set.call(ctx, ctx.sessionId, session);
      debug('saved');
    } catch (err) {
      debug('set session error: ', err.message);
      errorHandler(err, 'set', ctx);
    }
  }

  /**
   * common session middleware
   * each request will generate a new session
   *
   * ```
   * let session = ctx.session;
   * ```
   */
  async function session(ctx, next) {
    ctx.sessionStore = store;
    if (ctx._session) {
      return await next;
    }
    let result = await getSession(ctx);
    if (!result) {
      return await next;
    }

    ctx._session = result.session;

    // more flexible
    ctx.__defineGetter__('session', function () {
      return ctx._session;
    });

    ctx.__defineSetter__('session', function (sess) {
      ctx._session = sess;
    });

    ctx.regenerateSession = async function regenerateSession() {
      debug('regenerating session');
      if (!result.isNew) {
        // destroy the old session
        debug('destroying previous session');
        await store.destroy(ctx.sessionId);
      }

      ctx.session = generateSession();
      ctx.sessionId = genSid.call(ctx, 24);
      sessionIdStore.reset.call(ctx);

      debug('created new session: %s', ctx.sessionId);
      result.isNew = true;
    }

    await next;
    await refreshSession(ctx, ctx.session, result.originalHash, result.isNew);
  }

  /**
   * defer session middleware
   * only generate and get session when request use session
   *
   * ```
   * let session = await ctx.session;
   * ```
   */
  async function deferSession(ctx, next) {
    ctx.sessionStore = store;

    if (ctx.session) {
      return await next;
    }
    let isNew = false;
    let originalHash = null;
    let touchSession = false;
    let getter = false;

    // if path not match
    if (!matchPath(ctx)) {
      return await next;
    }

    ctx.__defineGetter__('session', async function () {
      if (touchSession) {
        return ctx._session;
      }
      touchSession = true;
      getter = true;

      let result = await getSession(ctx);
      // if cookie path not match
      // this route's controller should never use session
      if (!result) return;

      originalHash = result.originalHash;
      isNew = result.isNew;
      ctx._session = result.session;
      return ctx._session;
    });

    ctx.__defineSetter__('session', function (value) {
      touchSession = true;
      ctx._session = value;
    });

    ctx.regenerateSession = async function regenerateSession(ctx) {
      debug('regenerating session');
      // make sure that the session has been loaded
      await ctx.session;

      if (!isNew) {
        // destroy the old session
        debug('destroying previous session');
        await store.destroy(ctx.sessionId);
      }

      ctx._session = generateSession();
      ctx.sessionId = genSid.call(ctx, 24);
      sessionIdStore.reset.call(ctx);
      debug('created new session: %s', ctx.sessionId);
      isNew = true;
      return ctx._session;
    }

    await next;

    if (touchSession) {
      // if only ctx.session=, need try to decode and get the sessionID
      if (!getter) {
        ctx.sessionId = sessionIdStore.get(ctx);
      }

      await refreshSession(ctx, ctx._session, originalHash, isNew);
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
