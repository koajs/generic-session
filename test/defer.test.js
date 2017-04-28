/**!
 * koa-generic-session - test/defer.test.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

/**
 * Module dependencies.
 */

const app = require('./support/defer')
const request = require('supertest')

describe('test/defer.test.js', () => {

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

      await request(app)
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

    it('should GET /session/notuse response no session', () => {
      return request(app)
        .get('/session/notuse')
        .set('cookie', cookie)
        .expect(/no session/)
    })

    it('should GET /wrongpath response no session', () => {
      return request(app)
        .get('/wrongpath')
        .set('cookie', cookie)
        .expect(/no session/)
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

    it('should GET /session/remove before get ok', () => {
      return request(app)
        .get('/session/remove')
        .expect(/0/)
    })

    it('should rewrite session before get ok', () => {
      return request(app)
        .get('/session/rewrite')
        .expect({ foo: 'bar' })
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

    it('should regenerate new sessions', () => {
      return request(app)
        .get('/session/regenerateWithData')
        .expect({ /* foo: undefined, */ hasSession: true })
    })
  })
})
