/**!
 * koa-generic-session - lib/memory_store.js
 * Copyright(c) 2013-2016
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 *   Marcus Ekwall <marcus.ekwall@gmail.com> <https://github.com/mekwall>
 */

/**
 * Module dependencies.
 */
 
const debug = require('debug')('koa-generic-session:memory_store');

export default class MemoryStore {

  constructor() {
    this.sessions = {};
  }

  async get(sid) {
    debug('get value %j with key %s', this.sessions[sid], sid);
    return this.sessions[sid];
  }

  async set(sid, val={}) {
    debug('set value %j for key %s', val, sid);
    this.sessions[sid] = val;
  }

  async destroy(sid) {
    delete this.sessions[sid];
  }
}