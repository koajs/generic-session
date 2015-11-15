/**!
 * koa-generic-session - test/support/server.js
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
var uid = require('uid-safe').sync;
var session = require('../../');
var Store = require('./store');

var app = koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

var store = new Store();

app.use(function*(next) {
  if (this.request.query.force_session_id) {
    this.sessionId = this.request.query.force_session_id;
  }
  return yield next;
});

app.use(session({
  key: 'koss:test_sid',
  prefix: 'koss:test',
  ttl: 1000,
  cookie: {
    maxAge: 86400,
    path: '/session'
  },
  store: store,
  genSid: function(len) {
    return uid(len) + this.request.query.test_sid_append;
  },
  beforeSave: function (ctx, session) {
    session.path = ctx.path;
  },
  valid: function (ctx, session) {
    return ctx.query.valid !== 'false';
  },
  reconnectTimeout: 100
}));

// will ignore repeat session
app.use(session({
  key: 'koss:test_sid',
  cookie: {
    maxAge: 86400,
    path: '/session'
  },
  genSid: function(len) {
    return uid(len) + this.request.query.test_sid_append;
  }
}));

app.use(function *controllers() {
  switch (this.request.path) {
  case '/favicon.ico':
    this.status = 404;
    break;
  case '/wrongpath':
    this.body = !this.session ? 'no session' : 'has session';
    break;
  case '/session/rewrite':
    this.session = {foo: 'bar'};
    this.body = this.session;
    break;
  case '/session/notuse':
    this.body = 'not touch session';
    break;
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
  case '/session/id':
    getId(this);
    break;
  case '/session/regenerate':
    yield regenerate(this);
    break;
  case '/session/regenerateWithData':
    this.session.foo = 'bar';
    yield regenerate(this);
    this.body = { foo: this.session.foo, hasSession: this.session !== undefined };
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
  ctx.body = ctx.session !== undefined ? 'has session' : 'no session';
}

function getId(ctx) {
  ctx.body = ctx.sessionId;
}

function *regenerate(ctx) {
  yield ctx.regenerateSession();
  ctx.session.data = 'foo';
  getId(ctx);
}

var app = module.exports = http.createServer(app.callback());
app.store = store;
