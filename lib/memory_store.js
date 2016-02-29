'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

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

class MemoryStore {

  constructor() {
    this.sessions = {};
  }

  get(sid) {
    var _this = this;

    return _asyncToGenerator(function* () {
      debug('get value %j with key %s', _this.sessions[sid], sid);
      return _this.sessions[sid];
    })();
  }

  set(sid) {
    var _this2 = this;

    let val = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    return _asyncToGenerator(function* () {
      debug('set value %j for key %s', val, sid);
      _this2.sessions[sid] = val;
    })();
  }

  destroy(sid) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      delete _this3.sessions[sid];
    })();
  }
}
exports.default = MemoryStore;
//# sourceMappingURL=memory_store.js.map