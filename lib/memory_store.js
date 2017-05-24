/**!
 * koa-generic-session - lib/memory_store.js
 * Copyright(c) 2014
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('koa-generic-session:memory_store');

var MemoryStore = module.exports = function () {
  this.sessions = {};
};

MemoryStore.prototype.get = async function get(sid) {
  debug('get value %j with key %s', this.sessions[sid], sid);
  return this.sessions[sid];
};

MemoryStore.prototype.set = async function set(sid, val) {
  debug('set value %j for key %s', val, sid);
  this.sessions[sid] = val;
};

MemoryStore.prototype.destroy = async function destroy(sid) {
  delete this.sessions[sid];
};
