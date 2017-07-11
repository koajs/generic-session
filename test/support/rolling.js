/**!
 * koa-generic-session - test/support/rolling.js
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */
var koa = require('koa');
var http = require('http');
var session = require('../../lib/session');
var Store = require('./store');

var app = new koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

var store = new Store();

app.use(session({
  key: 'koss:test_sid',
  prefix: 'koss:test',
  ttl: 1000,
  cookie: {
    maxAge: 86400,
    path: '/session'
  },
  store: store,
  rolling: true,
}));

app.use(function controllers(ctx) {
  switch (ctx.request.path) {
    case '/session/get':
      get(ctx);
      break;
    case '/session/remove':
      remove(ctx);
      break;
    case '/session/nothing':
      nothing(ctx);
  }
});

function get(ctx) {
  ctx.session.count = ctx.session.count || 0;
  ctx.session.count++;
  ctx.body = ctx.session.count;
}

function remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

function nothing(ctx) {
  ctx.body = 'do not touch session';
}

var app = module.exports = http.createServer(app.callback());
