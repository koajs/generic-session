/**!
 * koa-session - lib/store.js
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
var debug = require('debug')('koa:sess:store');

var defaultOptions = {
  prefix: 'koa:sess:',
  ttl: 24 * 60 * 60 * 1000 //one day in ms
};

/**
 * merge extend and source into a new object
 * @param {Object} target
 * @param {Object} source
 * @return {Object}
 */
function merge(source, extend) {
  source = source || {};
  extend = extend || {};
  var res = {};
  for (var key in source) {
    res[key] = source[key];
  }
  for (var key in extend) {
    res[key] = res[key] === undefined
    ? extend[key]
    : res[key];
  }
  return res;
}

function Store(client, options) {
  this.client = client;
  this.options = merge(this.client.options, defaultOptions);
  EventEmitter.call(this);

  // delegate client connect / disconnect event
  if (typeof client.on === 'function') {
    client.on('disconnect', this.emit.bind(this, 'disconnect'));
    client.on('connect', this.emit.bind(this, 'connect'));
  }
}

util.inherits(Store, EventEmitter);

Store.prototype.get = function *(sid) {
  var data;
  sid = this.options.prefix + sid;
  debug('GET %s', sid);
  data = yield this.client.get(sid);
  if (!data) {
    debug('GET empty');
    return null;
  }
  if (data && data.cookie && data.cookie.expires) {
    data.cookie.expires = new Date(data.cookie.expires);
  }
  debug('GOT %j', data);
  return data;
};

Store.prototype.set = function *(sid, sess) {
  var ttl = this.options.ttl;
  //compat connect-redis type `maxAge`
  var maxage = sess.cookie && (sess.cookie.maxage || sess.cookie.maxAge);
  if (typeof maxage === 'number') {
    ttl = maxage;
  }
  sid = this.options.prefix + sid;
  debug('SET key: %s, value: %s, ttl: %d', sid, sess, ttl);
  yield this.client.set(sid, sess, ttl);
  debug('SET complete');
};

Store.prototype.destroy = function *(sid) {
  sid = this.options.prefix + sid;
  debug('DEL %s', sid);
  yield this.client.destroy(sid);
  debug('DEL %s complete', sid);
};

module.exports = Store;
