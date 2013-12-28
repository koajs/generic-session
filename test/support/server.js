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
    path: '/'
  }
}));

app.use(function *() {
  switch (this.request.url) {
  case '/get':
    get(this);
    break;
  case '/remove':
    remove(this);
    break;
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

app.on('error', function (err) {
  logger.error(err);
});

var app = module.exports = http.createServer(app.callback());

app.listen(7001);