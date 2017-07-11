/**!
 * koa-generic-session - test/session.test.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

/**
 * Module dependencies.
 */

const Session = require('..')
const app = require('./support/server')
const request = require('supertest')
const mm = require('mm')
const should = require('should')
const EventEmitter = require('events').EventEmitter

describe('test/koa-session.test.js', () => {
  describe('init', () => {
    afterEach(mm.restore)

    beforeEach(() => {
      return request(app)
      .get('/session/remive')
      .expect(200)
    })

    it('should warn when in production', (done) => {
      mm(process.env, 'NODE_ENV', 'production')
      mm(console, 'warn', (message) => {
        message.should.equal('Warning: koa-generic-session\'s MemoryStore is not\n' +
        'designed for a production environment, as it will leak\n' +
        'memory, and will not scale past a single process.')
        done()
      })

      Session({ secret: 'secret' })
    })

    it('should listen disconnect and connect', () => {
      const store = new EventEmitter()
      Session({
        secret: 'secret',
        store: store
      })
      store._events.disconnect.should.be.Function
      store._events.connect.should.be.Function
    })
  })

  describe('use', () => {
    let cookie
    const mockCookie = 'koa.sid=s:dsfdss.PjOnUyhFG5bkeHsZ1UbEY7bDerxBINnZsD5MUguEph8; path=/; httponly'

    it('should GET /session/get ok', async () => {

      const res = await request(app)
        .get('/session/get')
        .expect(/1/)
      cookie = res.headers['set-cookie'].join(';')

    })

    it('should GET /session/get second ok', () => {
      return request(app)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(/2/)
    })

    it('should GET /session/httponly ok', async () => {

      const res = await request(app)
        .get('/session/httponly')
        .set('cookie', cookie)
        .expect(/httpOnly: false/)

      cookie = res.headers['set-cookie'].join(';')
      cookie.indexOf('httponly').should.equal(-1)
      cookie.indexOf('expires=').should.above(0)
      return request(app)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(/3/)
    })

    it('should GET /session/httponly twice ok', async () => {

      const res = await request(app)
        .get('/session/httponly')
        .set('cookie', cookie)
        .expect(/httpOnly: true/)

      cookie = res.headers['set-cookie'].join(';')
      cookie.indexOf('httponly').should.above(0)
      cookie.indexOf('expires=').should.above(0)

    })

    it('should another user GET /session/get ok', () => {
      return request(app)
        .get('/session/get')
        .expect(/1/)
    })

    it('should GET /session/nothing ok', () => {
      return request(app)
        .get('/session/nothing')
        .set('cookie', cookie)
        .expect(/3/)
    })

    it('should wrong cookie GET /session/get ok', () => {
      return request(app)
      .get('/session/get')
      .set('cookie', mockCookie)
      .expect(/1/)
    })

    it('should wrong cookie GET /session/get twice ok', () => {
      return request(app)
        .get('/session/get')
        .set('cookie', mockCookie)
        .expect(/1/)
    })

    it('should GET /wrongpath response no session', () => {
      return request(app)
        .get('/wrongpath')
        .set('cookie', cookie)
        .expect(/no session/)
    })

    it('should GET /session/remove ok', async () => {
      await request(app)
        .get('/session/remove')
        .set('cookie', cookie)
        .expect(/0/)

      await request(app)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(/1/)
    })

    it('should GET / error by session ok', () => {
      return request(app)
        .get('/')
        .expect(/no session/)
    })

    it('should GET /session ok', () => {
      return request(app)
        .get('/session')
        .expect(/has session/)
    })

    it('should rewrite session before get ok', () => {
      return request(app)
        .get('/session/rewrite')
        .expect({ foo: 'bar', path: '/session/rewrite' })
    })

    it('should regenerate a new session when session invalid', async () => {

      await request(app)
        .get('/session/get')
        .expect('1')

      await request(app)
        .get('/session/nothing?valid=false')
        .expect('')

      await request(app)
        .get('/session/get')
        .expect('1')

    })

    it('should GET /session ok', () => {
      return request(app)
        .get('/session/id?test_sid_append=test')
        .expect(/test$/)
    })

    it('should force a session id ok', async () => {
      const res = await request(app)
        .get('/session/get')
        .expect(/.*/)

      cookie = res.headers['set-cookie'][0].split(';')
      const val = cookie[0].split('=').pop()

      await request(app)
        .get('/session/id?force_session_id=' + val)
        .expect(new RegExp(val))
    })

    it('should regenerate existing sessions', async () => {

      const agent = request.agent(app)
      const res1 = await agent
        .get('/session/get')
        .expect(/.+/)

      const firstId = res1.body
      const res2 = await agent
        .get('/session/regenerate')
        .expect(/.+/)

      const secondId = res2.body
      secondId.should.not.equal(firstId)
    })

    it('should regenerate a new session', () => {
      return request(app)
        .get('/session/regenerateWithData')
        .expect({ /* foo: undefined, */ hasSession: true })
    })

    it('should always refreshSession', async () => {

      const res = await request(app)
        .get('/session/get_error')
        .expect(500)

      const cookie = res.headers['set-cookie'].join(';')
      should.exist(cookie)
      await request(app)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(/2/)

    })
  })
})
