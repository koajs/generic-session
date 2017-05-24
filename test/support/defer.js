/**!
 * koa-generic-session - test/support/defer.js
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

var app = new koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

app.use(async function(next) {
  try {
    await next;
  } catch (err) {
    this.status = err.status || 500;
    this.body = err.message;
  }
});

var store = new Store();
app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session',
  },
  defer: true,
  store: store,
  reconnectTimeout: 100
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

app.use(async function controllers() {
  switch (this.request.url) {
  case '/favicon.ico':
    this.staus = 404;
    break;
  case '/wrongpath':
    this.body = this.session ? 'has session' : 'no session';
    break;
  case '/session/rewrite':
    this.session = {foo: 'bar'};
    this.body = await this.session;
    break;
  case '/session/notuse':
    nosession(this);
    break;
  case '/session/get':
    await get(this);
    break;
  case '/session/nothing':
    await nothing(this);
    break;
  case '/session/remove':
    await remove(this);
    break;
  case '/session/httponly':
    await switchHttpOnly(this);
    break;
  case '/session/regenerate':
    await regenerate(this);
    break;
  case '/session/regenerateWithData':
    var session = await this.session;
    session.foo = 'bar';
    session = await regenerate(this);
    this.body = { foo : session.foo, hasSession: session !== undefined };
    break;
  default:
    await other(this);
  }
});

function nosession(ctx) {
  ctx.body = ctx._session !== undefined ? 'has session' : 'no session';
}

async function nothing(ctx) {
  ctx.body = String((await ctx.session).count);
}

async function get(ctx) {
  var session = await ctx.session;
  session = await ctx.session;
  session.count = session.count || 0;
  session.count++;
  ctx.body = String(session.count);
}

async function remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

async function switchHttpOnly(ctx) {
  var session = await ctx.session;
  var httpOnly = session.cookie.httpOnly;
  session.cookie.httpOnly = !httpOnly;
  ctx.body = 'httpOnly: ' + !httpOnly;
}

async function other(ctx) {
  ctx.body = ctx.session ? 'has session' : 'no session';
}

async function regenerate(ctx) {
  var session = await ctx.regenerateSession();
  session.data = 'foo';
  ctx.body = ctx.sessionId;
  return session;
}

// app.listen(7001)
var app = module.exports = http.createServer(app.callback());
app.store = store;
