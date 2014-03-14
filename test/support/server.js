/**!
 * koa-session - test/support/server.js
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
    path: '/session'
  },
  store: new Store()
}));

// will ignore repeat session
app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session'
  }
}));

app.use(function *controllers() {
  switch (this.request.url) {
  case '/session/get':
    get(this);
    break;
  case '/session/nothing':
    nothing(this);
    break;
  case '/session/remove':
    remove(this);
    break;
  case '/session/httponly':
    switchHttpOnly(this);
    break;
  default:
    other(this);
  }
});

function nothing(ctx) {
  ctx.body = ctx.session.count;
}

function get(ctx) {
  ctx.session.count = ctx.session.count || 0;
  ctx.session.count++;
  ctx.body = ctx.session.count;
}

function remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

function switchHttpOnly(ctx) {
  var httpOnly = ctx.session.cookie.httpOnly;
  ctx.session.cookie.httpOnly = !httpOnly;
  ctx.body = 'httpOnly: ' + !httpOnly;
}

function other(ctx) {
  ctx.body = ctx.session ? 'has session' : 'no session';
}

app.on('error', function (err) {
  console.error(err.stack);
});

var app = module.exports = http.createServer(app.callback());
