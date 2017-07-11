/**!
 * koa-generic-session - lib/memory_store.js
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

const debug = require('debug')('koa-generic-session:memory_store')

class MemoryStore {
  constructor() {
    this.sessions = {}
  }

  get(sid) {
    debug('get value %j with key %s', this.sessions[sid], sid)
    return this.sessions[sid]
  }

  set(sid, val) {
    debug('set value %j for key %s', val, sid)
    this.sessions[sid] = val
  }

  destroy(sid) {
    delete this.sessions[sid]
  }
}

module.exports = MemoryStore
