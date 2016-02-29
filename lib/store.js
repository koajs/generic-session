'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _copyTo = require('copy-to');

var _copyTo2 = _interopRequireDefault(_copyTo);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; } /**!
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

const debug = (0, _debug2.default)('koa-generic-session:store');
const defaultOptions = {
  prefix: 'koa:sess:'
};

class Store extends _events2.default {

  constructor(client) {
    let options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    super();
    this.client = client;
    this.options = options;
    (0, _copyTo2.default)(options).and(defaultOptions).to(this.options);

    // delegate client connect / disconnect event
    if (typeof client.on === 'function') {
      client.on('disconnect', this.emit.bind(this, 'disconnect'));
      client.on('connect', this.emit.bind(this, 'connect'));
    }
  }

  get(sid) {
    var _this = this;

    return _asyncToGenerator(function* () {
      var data;
      sid = _this.options.prefix + sid;
      debug('GET %s', sid);
      data = yield _this.client.get(sid);
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
    })();
  }

  set(sid) {
    var _this2 = this;

    let sess = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    return _asyncToGenerator(function* () {
      var ttl = _this2.options.ttl;
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

      sid = _this2.options.prefix + sid;
      debug('SET key: %s, value: %s, ttl: %d', sid, sess, ttl);

      yield _this2.client.set(sid, sess, ttl);
      debug('SET complete');
    })();
  }

  destroy(sid) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      sid = _this3.options.prefix + sid;
      debug('DEL %s', sid);
      yield _this3.client.destroy(sid);
      debug('DEL %s complete', sid);
    })();
  }
}
exports.default = Store;
//# sourceMappingURL=store.js.map