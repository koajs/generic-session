/*!
 * koa-generic-session - test/support/store.js
 * Copyright(c) 2014 dead_horse <dead_horse@qq.com>
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;

class Store extends EventEmitter {
  constructor(...args) {
    super(...args);
    this.sessions = {};
  }

  get(sid) {
    const session = this.sessions[sid];
    if (!session) {
      return null;
    }
    const r = {};
    for (const key in session) {
      r[key] = session[key];
    }
    return r;
  }

  set(sid, val) {
    this.sessions[sid] = val;
  }

  destroy(sid) {
    delete this.sessions[sid];
  }
}

module.exports = Store;
