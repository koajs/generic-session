/**!
 * koa-generic-session - lib/store.js
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

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('koa-generic-session:store');
var copy = require('copy-to');

var defaultOptions = {
  prefix: 'koa:sess:'
};

function Store(client, options) {
  this.client = client;
  this.options = {};
  copy(options).and(defaultOptions).to(this.options);
  EventEmitter.call(this);

  // delegate client connect / disconnect event
  if (typeof client.on === 'function') {
    client.on('disconnect', this.emit.bind(this, 'disconnect'));
    client.on('connect', this.emit.bind(this, 'connect'));
  }
}

util.inherits(Store, EventEmitter);

Store.prototype.get = async function get(sid) {
  var data;
  sid = this.options.prefix + sid;
  debug('GET %s', sid);
  data = await this.client.get(sid);
  if (!data) {
    debug('GET empty');
    return null;
  }
  if (data && data.cookie && typeof data.cookie.expires === 'string') {
    // make sure data.cookie.expires is a Date
    data.cookie.expires = new Date(data.cookie.expires);
  }
  debug('GOT %j', data);
  return data;
};

Store.prototype.set = async function set(sid, sess) {
  var ttl = this.options.ttl;
  if (!ttl) {
    var maxAge = sess.cookie && sess.cookie.maxAge;
    if (typeof maxAge === 'number') {
      ttl = maxAge;
    }
    // if has cookie.expires, ignore cookie.maxAge
    if (sess.cookie && sess.cookie.expires) {
      ttl = Math.ceil(sess.cookie.expires.getTime() - Date.now());
    }
  }

  sid = this.options.prefix + sid;
  debug('SET key: %s, value: %s, ttl: %d', sid, sess, ttl);
  await this.client.set(sid, sess, ttl);
  debug('SET complete');
};

Store.prototype.destroy = async function destroy(sid) {
  sid = this.options.prefix + sid;
  debug('DEL %s', sid);
  await this.client.destroy(sid);
  debug('DEL %s complete', sid);
};

module.exports = Store;
