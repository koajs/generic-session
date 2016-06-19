/**!
 * koa-generic-session - test/support/override.js
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   Evan King <evan.king@bluespurs.com> (http://honoredsoft.com)
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
  rolling: false,
}));

app.use(function *controllers() {
  switch (this.request.path) {
  case '/session/read/force':
    this.sessionSave = true;
  case '/session/read':
    read(this);
    break;

  case '/session/update/prevent':
    this.sessionSave = false;
  case '/session/update':
    update(this);
    break;

  case '/session/remove/prevent':
    this.sessionSave = false;
    remove(this);
    break;
    
  case '/session/remove/force':
    this.sessionSave = true;
    remove(this);
    break;
  }

  this.body = this.body + ', ' + this.sessionSave;
});

function read(ctx) {
  ctx.session.count = ctx.session.count || 0;
  ctx.body = ctx.session.count;
}

function update(ctx) {
  ctx.session.count = ctx.session.count || 0;
  ctx.session.count++;
  ctx.body = ctx.session.count;
}

function remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

var app = module.exports = http.createServer(app.callback());
