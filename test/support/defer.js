/**!
 * koa-session - test/support/defer.js
 * Copyright(c) 2013
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
var session = require('../../');
var Store = require('./store');

var app = koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session',
    store: new Store()
  },
  defer: true
}));

// will ignore repeat session
app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session'
  },
  defer: true
}));

app.use(function *controllers() {
  switch (this.request.url) {
  case '/favicon.ico':
  this.staus = 404;
  break;
  case '/nosession':
    nosession(this);
    break;
  case '/session/get':
    yield get(this);
    break;
  case '/session/nothing':
    yield nothing(this);
    break;
  case '/session/remove':
    yield remove(this);
    break;
  case '/session/httponly':
    yield switchHttpOnly(this);
    break;
  default:
    yield other(this);
  }
});

function nosession(ctx) {
  ctx.body = ctx._session ? 'has session' : 'no session';
}

function *nothing(ctx) {
  ctx.body = (yield ctx.session).count;
}

function *get(ctx) {
  var session = yield ctx.session;
  session.count = session.count || 0;
  session.count++;
  ctx.body = session.count;
}

function *remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

function *switchHttpOnly(ctx) {
  var session = yield ctx.session;
  var httpOnly = session.cookie.httpOnly;
  session.cookie.httpOnly = !httpOnly;
  ctx.body = 'httpOnly: ' + !httpOnly;
}

function *other(ctx) {
  ctx.body = (yield ctx.session) ? 'has session' : 'no session';
}

app.on('error', function (err) {
  console.error(err.stack);
});
// app.listen(7001)
var app = module.exports = http.createServer(app.callback());
