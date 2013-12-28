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

var app = koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

app.use(session({
  secret: 'koa-session-secret',
  cookie: {
    httpOnly: true,
    maxAge: 86400,
    path: '/session'
  }
}));

// will ignore repeat session
app.use(session({
  secret: 'koa-session-secret',
  cookie: {
    httpOnly: true,
    maxAge: 86400,
    path: '/session'
  }
}));

app.use(function *() {
  switch (this.request.url) {
  case '/session/get':
    get(this);
    break;
  case '/session/remove':
    remove(this);
    break;
  default: other(this);
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

function other(ctx) {
  ctx.body = ctx.session ? 'has session' : 'no session';
}

app.on('error', function (err) {
  console.error(err.stack);
});

var app = module.exports = http.createServer(app.callback());
