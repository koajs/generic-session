/**!
 * koa-generic-session - lib/store.js
 * Copyright(c) 2014
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict'

/**
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter
const debug = require('debug')('koa-generic-session:store')
const copy = require('copy-to')

const defaultOptions = {
  prefix: 'koa:sess:'
}

class Store extends EventEmitter {
  constructor(client, options) {
    super()
    this.client = client
    this.options = options
    copy(options).and(defaultOptions).to(this.options)

    // delegate client connect / disconnect event
    if (typeof client.on === 'function') {
      client.on('disconnect', this.emit.bind(this, 'disconnect'))
      client.on('connect', this.emit.bind(this, 'connect'))
    }
  }

  async get(sid) {
    sid = this.options.prefix + sid
    debug('GET %s', sid)
    const data = await this.client.get(sid)
    if (!data) {
      debug('GET empty')
      return null
    }
    if (data && data.cookie && typeof data.cookie.expires === 'string') {
      // make sure data.cookie.expires is a Date
      data.cookie.expires = new Date(data.cookie.expires)
    }
    debug('GOT %j', data)
    return data
  }

  async set(sid, sess) {
    let ttl = this.options.ttl
    if (!ttl) {
      const maxAge = sess.cookie && sess.cookie.maxAge
      if (typeof maxAge === 'number') {
        ttl = maxAge
      }
      // if has cookie.expires, ignore cookie.maxAge
      if (sess.cookie && sess.cookie.expires) {
        ttl = Math.ceil(sess.cookie.expires.getTime() - Date.now())
      }
    }

    sid = this.options.prefix + sid
    debug('SET key: %s, value: %s, ttl: %d', sid, sess, ttl)
    await this.client.set(sid, sess, ttl)
    debug('SET complete')
  }

  async destroy(sid) {
    sid = this.options.prefix + sid
    debug('DEL %s', sid)
    await this.client.destroy(sid)
    debug('DEL %s complete', sid)
  }
}

module.exports = Store
