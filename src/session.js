/**!
 * koa-generic-session - lib/session.js
 * Copyright(c) 2013 - 2014
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */



/**
 * Module dependencies.
 */

const debug = require('debug')('koa-generic-session:session')
const MemoryStore = require('./memory_store')
const crc32 = require('crc').crc32
const parse = require('parseurl')
const Store = require('./store')
const copy = require('copy-to')
const uid = require('uid-safe')

/**
 * Warning message for `MemoryStore` usage in production.
 */

const warning = 'Warning: koa-generic-session\'s MemoryStore is not\n' +
  'designed for a production environment, as it will leak\n' +
  'memory, and will not scale past a single process.'

const defaultCookie = {
  httpOnly: true,
  path: '/',
  overwrite: true,
  signed: true,
  maxAge: 24 * 60 * 60 * 1000 //one day in ms
}

/**
 * setup session store with the given `options`
 * @param {Object} options
 *   - [`key`] cookie name, defaulting to `koa.sid`
 *   - [`store`] session store instance, default to MemoryStore
 *   - [`ttl`] store ttl in `ms`, default to oneday
 *   - [`prefix`] session prefix for store, defaulting to `koa:sess:`
 *   - [`cookie`] session cookie settings, defaulting to
 *     {path: '/', httpOnly: true, maxAge: null, overwrite: true, signed: true}
 *   - [`defer`] defer get session,
 *   - [`rolling`]  rolling session, always reset the cookie and sessions, default is false
 *     you should `await ctx.session` to get the session if defer is true, default is false
 *   - [`genSid`] you can use your own generator for sid
 *   - [`errorHandler`] handler for session store get or set error
 *   - [`valid`] valid(ctx, session), valid session value before use it
 *   - [`beforeSave`] beforeSave(ctx, session), hook before save session
 *   - [`sessionIdStore`] object with get, set, reset methods for passing session id throw requests.
 */

module.exports = function(options = {}) {

  const key = options.key || 'koa.sid'
  const client = options.store || new MemoryStore()
  const errorHandler = options.errorHandler || defaultErrorHanlder
  const reconnectTimeout = options.reconnectTimeout || 10000

  const store = new Store(client, {
    ttl: options.ttl,
    prefix: options.prefix
  })

  const genSid = options.genSid || uid.sync
  const valid = options.valid || noop
  const beforeSave = options.beforeSave || noop

  const cookie = options.cookie || {}
  copy(defaultCookie).to(cookie)

  let storeStatus = 'available'
  let waitStore = Promise.resolve()

  // notify user that this store is not
  // meant for a production environment
  if ('production' === process.env.NODE_ENV && client instanceof MemoryStore) {
    // eslint-disable-next-line
    console.warn(warning)
  }

  const sessionIdStore = options.sessionIdStore || {

    get: function() {
      return this.cookies.get(key, cookie)
    },

    set: function(sid, session) {
      this.cookies.set(key, sid, session.cookie)
    },

    reset: function() {
      this.cookies.set(key, null)
    }
  }

  store.on('disconnect', () => {
    if (storeStatus !== 'available') return
    storeStatus = 'pending'
    waitStore = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (storeStatus === 'pending') storeStatus = 'unavailable'
        reject(new Error('session store is unavailable'))
      }, reconnectTimeout)
      store.once('connect', resolve)
    })

  })

  store.on('connect', () => {
    storeStatus = 'available'
    waitStore = Promise.resolve()
  })

  // save empty session hash for compare
  const EMPTY_SESSION_HASH = hash(generateSession())

  return options.defer ? deferSession : session

  function addCommonAPI(ctx) {

    ctx._sessionSave = null

    // more flexible
    Object.defineProperty(ctx, 'sessionSave', {
      get: () => {
        return ctx._sessionSave
      },
      set: (save) => {
        ctx._sessionSave = save
      }
    })

  }

  /**
   * generate a new session
   */
  function generateSession() {
    const session = {}
    //you can alter the cookie options in nexts
    session.cookie = {}
    for (const prop in cookie) {
      session.cookie[prop] = cookie[prop]
    }
    compatMaxage(session.cookie)
    return session
  }

  /**
   * check url match cookie's path
   */
  function matchPath(ctx) {
    const pathname = parse(ctx).pathname
    const cookiePath = cookie.path || '/'
    if (cookiePath === '/') {
      return true
    }
    if (pathname.indexOf(cookiePath) !== 0) {
      debug('cookie path not match')
      return false
    }
    return true
  }

  /**
   * get session from store
   *   get sessionId from cookie
   *   save sessionId into context
   *   get session from store
   */
  async function getSession(ctx) {
    if (!matchPath(ctx)) return
    if (storeStatus === 'pending') {
      debug('store is disconnect and pending')
      await waitStore
    } else if (storeStatus === 'unavailable') {
      debug('store is unavailable')
      throw new Error('session store is unavailable')
    }

    if (!ctx.sessionId) {
      ctx.sessionId = sessionIdStore.get.call(ctx)
    }

    let session
    let isNew = false
    if (!ctx.sessionId) {
      debug('session id not exist, generate a new one')
      session = generateSession()
      ctx.sessionId = genSid.call(ctx, 24)
      isNew = true
    } else {
      try {
        session = await store.get(ctx.sessionId)
        debug('get session %j with key %s', session, ctx.sessionId)
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT')
        } else {
          debug('get session error: ', err && err.message)
          errorHandler(err, 'get', ctx)
        }
      }
    }

    // make sure the session is still valid
    if (!session ||
      !valid(ctx, session)) {
      debug('session is empty or invalid')
      session = generateSession()
      ctx.sessionId = genSid.call(ctx, 24)
      sessionIdStore.reset.call(ctx)
      isNew = true
    }

    // get the originHash
    const originalHash = !isNew && hash(session)

    return {
      originalHash: originalHash,
      session: session,
      isNew: isNew
    }
  }

  /**
   * after everything done, refresh the session
   *   if session === null; delete it from store
   *   if session is modified, update cookie and store
   */
  async function refreshSession (ctx, session, originalHash, isNew) {

    // reject any session changes, and do not update session expiry
    if(ctx._sessionSave === false) {
      return debug('session save disabled')
    }

    //delete session
    if (!session) {
      if (!isNew) {
        debug('session set to null, destroy session: %s', ctx.sessionId)
        sessionIdStore.reset.call(ctx)
        return store.destroy(ctx.sessionId)
      }
      return debug('a new session and set to null, ignore destroy')
    }

    // force saving non-empty session
    if(ctx._sessionSave === true) {
      debug('session save forced')
      return saveNow(ctx, ctx.sessionId, session)
    }

    const newHash = hash(session)
    // if new session and not modified, just ignore
    if (!options.allowEmpty && isNew && newHash === EMPTY_SESSION_HASH) {
      return debug('new session and do not modified')
    }

    // rolling session will always reset cookie and session
    if (!options.rolling && newHash === originalHash) {
      return debug('session not modified')
    }

    debug('session modified')

    await saveNow(ctx, ctx.sessionId, session)

  }

  async function saveNow(ctx, id, session) {
    compatMaxage(session.cookie)

    // custom before save hook
    beforeSave(ctx, session)

    //update session
    try {
      await store.set(id, session)
      sessionIdStore.set.call(ctx, id, session)
      debug('saved')
    } catch (err) {
      debug('set session error: ', err && err.message)
      errorHandler(err, 'set', ctx)
    }
  }

  /**
   * common session middleware
   * each request will generate a new session
   *
   * ```
   * let session = this.session
   * ```
   */
  async function session(ctx, next) {
    ctx.sessionStore = store
    if (ctx.session || ctx._session) {
      return next()
    }
    const result = await getSession(ctx)
    if (!result) {
      return next()
    }

    addCommonAPI(ctx)

    ctx._session = result.session

    // more flexible
    Object.defineProperty(ctx, 'session', {
      get() {
        return this._session
      },
      set(sess) {
        this._session = sess
      }
    })

    ctx.saveSession = async function saveSession() {
      const result = await getSession(ctx)
      if (!result) {
        return next()
      }
      return refreshSession(ctx, ctx.session, result.originalHash, result.isNew)
    }

    ctx.regenerateSession = async function regenerateSession() {
      debug('regenerating session')
      if (!result.isNew) {
        // destroy the old session
        debug('destroying previous session')
        await store.destroy(ctx.sessionId)
      }

      ctx.session = generateSession()
      ctx.sessionId = genSid.call(ctx, 24)
      sessionIdStore.reset.call(ctx)

      debug('created new session: %s', ctx.sessionId)
      result.isNew = true
    }

    // make sure `refreshSession` always called
    let firstError = null
    try {
      await next()
    } catch (err) {
      debug('next logic error: %s', err && err.message)
      firstError = err
    }
    // can't use finally because `refreshSession` is async
    try {
      await refreshSession(ctx, ctx.session, result.originalHash, result.isNew)
    } catch (err) {
      debug('refresh session error: %s', err && err.message)
      if (firstError) ctx.app.emit('error', err, ctx)
      firstError = firstError || err
    }
    if (firstError) throw firstError
  }

  /**
   * defer session middleware
   * only generate and get session when request use session
   *
   * ```
   * let session = yield this.session
   * ```
   */
  async function deferSession(ctx, next) {
    ctx.sessionStore = store

    // TODO:
    // Accessing ctx.session when it's defined is causing problems
    // because it has side effect. So, here we use a flag to determine
    // that session property is already defined.
    if (ctx.__isSessionDefined) {
      return next()
    }
    let isNew = false
    let originalHash = null
    let touchSession = false
    let getter = false

    // if path not match
    if (!matchPath(ctx)) {
      return next()
    }

    addCommonAPI(ctx)

    Object.defineProperty(ctx, 'session', {
      async get() {
        if (touchSession) {
          return this._session
        }
        touchSession = true
        getter = true

        const result = await getSession(this)
        // if cookie path not match
        // this route's controller should never use session
        if (!result) return

        originalHash = result.originalHash
        isNew = result.isNew
        this._session = result.session
        return this._session
      },
      set(value) {
        touchSession = true
        this._session = value
      }
    })

    // internal flag to determine that session is already defined
    ctx.__isSessionDefined = true

    ctx.saveSession = async function saveSession() {
      // make sure that the session has been loaded
      await ctx.session
      
      const result = await getSession(ctx)
      if (!result) {
        return next()
      }
      return refreshSession(ctx, ctx.session, result.originalHash, result.isNew)
    }

    ctx.regenerateSession = async function regenerateSession() {
      debug('regenerating session')
      // make sure that the session has been loaded
      await ctx.session

      if (!isNew) {
        // destroy the old session
        debug('destroying previous session')
        await store.destroy(ctx.sessionId)
      }

      ctx._session = generateSession()
      ctx.sessionId = genSid.call(ctx, 24)
      sessionIdStore.reset.call(ctx)
      debug('created new session: %s', ctx.sessionId)
      isNew = true
      return ctx._session
    }

    await next()

    if (touchSession) {
      // if only this.session=, need try to decode and get the sessionID
      if (!getter) {
        ctx.sessionId = sessionIdStore.get.call(ctx)
      }

      await refreshSession(ctx, ctx._session, originalHash, isNew)
    }
  }
}

/**
 * get the hash of a session include cookie options.
 */
function hash(sess) {
  return crc32.signed(JSON.stringify(sess))
}

/**
 * cookie use maxAge, hack to compat connect type `maxage`
 */
function compatMaxage(opts) {
  if (opts) {
    opts.maxAge = opts.maxage ? opts.maxage : opts.maxAge
    delete opts.maxage
  }
}

module.exports.MemoryStore = MemoryStore

function defaultErrorHanlder (err, type) {
  err.name = 'koa-generic-session ' + type + ' error'
  throw err
}

function noop () {
  return true
}
