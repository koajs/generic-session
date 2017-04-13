/**!
 * koa-generic-session - test/support/override.js
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   Evan King <evan.king@bluespurs.com> (http://honoredsoft.com)
 */



/**
 * Module dependencies.
 */
const koa = require('koa')
const http = require('http')
const session = require('../..')
const Store = require('./store')

const app = new koa()

app.name = 'koa-session-test'
app.outputErrors = true
app.keys = ['keys', 'keykeys']
app.proxy = true // to support `X-Forwarded-*` header

const store = new Store()

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
}))

app.use(function controllers(ctx) {
  switch (ctx.request.path) {
    case '/session/read/force':
      ctx.sessionSave = true // eslint-disable-next-line
    case '/session/read':
      read(ctx)
      break

    case '/session/update/prevent':
      ctx.sessionSave = false // eslint-disable-next-line
    case '/session/update':
      update(ctx)
      break

    case '/session/remove/prevent':
      ctx.sessionSave = false
      remove(ctx)
      break

    case '/session/remove/force':
      ctx.sessionSave = true
      remove(ctx)
      break
  }

  ctx.body = ctx.body + ', ' + ctx.sessionSave
})

function read(ctx) {
  ctx.session.count = ctx.session.count || 0
  ctx.body = String(ctx.session.count)
}

function update(ctx) {
  ctx.session.count = ctx.session.count || 0
  ctx.session.count++
  ctx.body = String(ctx.session.count)
}

function remove(ctx) {
  ctx.session = null
  ctx.body = '0'
}

module.exports = http.createServer(app.callback())
