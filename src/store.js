/**!
 * koa-generic-session - lib/store.js
 * Copyright(c) 2014-2016
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 *   Marcus Ekwall <marcus.ekwall@gmail.com> (https://github.com/mekwall)
 */

/**
 * Module dependencies.
 */

import util from 'util';
import EventEmitter from 'events';
import copy from 'copy-to';
import D from 'debug';

const debug = D('koa-generic-session:store');
const defaultOptions = {
  prefix: 'koa:sess:'
};

export default class Store extends EventEmitter {

  constructor(client, options = {}) {
    super();
    this.client = client;
    this.options = options;
    copy(options).and(defaultOptions).to(this.options);

    // delegate client connect / disconnect event
    if (typeof client.on === 'function') {
      client.on('disconnect', this.emit.bind(this, 'disconnect'));
      client.on('connect', this.emit.bind(this, 'connect'));
    }
  }

  async get(sid) {
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
  }

  async set(sid, sess={}) {
    var ttl = this.options.ttl;
    if (!ttl) {
      var maxage = sess.cookie && sess.cookie.maxage;
      if (typeof maxage === 'number') {
        ttl = maxage;
      }
      // if has cookie.expires, ignore cookie.maxage
      if (sess.cookie && sess.cookie.expires) {
        ttl = Math.ceil(sess.cookie.expires.getTime() - Date.now());
      }
    }

    sid = this.options.prefix + sid;
    debug('SET key: %s, value: %s, ttl: %d', sid, sess, ttl);

    await this.client.set(sid, sess, ttl);
    debug('SET complete');
  }

  async destroy(sid) {
    sid = this.options.prefix + sid;
    debug('DEL %s', sid);
    await this.client.destroy(sid);
    debug('DEL %s complete', sid);
  }
}