/**!
 * koa-generic-session - test/store.test.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

/**
 * Module dependencies.
 */

const deferApp = require('./support/defer')
const commonApp = require('./support/server')
const request = require('supertest')
const mm = require('mm')

describe('test/store.test.js', () => {
  afterEach(mm.restore)
  describe('common session middleware', () => {
    afterEach(() => {
      commonApp.store.emit('connect')
      mm.restore()
    })
    let cookie

    it('should get session error when disconnect', () => {
      commonApp.store.emit('disconnect')
      return request(commonApp)
        .get('/session/get')
        .expect(500)
        .expect('session store is unavailable')
    })

    it('should get session ok when reconnect', () => {
      commonApp.store.emit('disconnect')
      setTimeout(() => {
        commonApp.store.emit('connect')
      }, 10)
      return request(commonApp)
        .get('/session/get')
        .expect(200)
        .expect('1')
    })

    it('should ignore disconnect event', () => {
      commonApp.store.emit('disconnect')
      commonApp.store.emit('disconnect')
      return request(commonApp)
        .get('/session/get')
        .expect(500)
        .expect('session store is unavailable')
    })

    it('should error when status is unavailable', (done) => {
      commonApp.store.emit('disconnect')
      setTimeout(() => {
        request(commonApp)
          .get('/session/get')
          .expect(500)
          .expect('session store is unavailable', done)
      }, 200)
    })

    it('should get session ok when store.get error but session not exist', async () => {
      mm.error(commonApp.store, 'get', 'mock error')
      const res = await request(commonApp)
        .get('/session/get')
        .expect(/1/)
        .expect(200)
      cookie = res.headers['set-cookie'].join(';')
      cookie.indexOf('httponly').should.above(0)
      cookie.indexOf('expires=').should.above(0)
    })

    it('should get session error when store.get error', () => {
      mm(commonApp.store, 'get', () => {
        throw new Error('mock get error')
      })
      return request(commonApp)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(500)
    })

    it('should get /session/notuse error when store.get error', () => {
      mm(commonApp.store, 'get', () => {
        throw new Error('mock get error')
      })
      return request(commonApp)
        .get('/session/notuse')
        .set('cookie', cookie)
        .expect(500)
    })

    it('should handler session error when store.set error', async () => {
      await request(commonApp)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(200)
        .expect(/2/)
      mm(commonApp.store, 'set', () => {
        throw new Error('mock set error')
      })
      await request(commonApp)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(500)
        .expect('mock set error')

    })

    it('should handler session error when store.set error and logic error', () => {
      mm(commonApp.store, 'set', () => {
        throw new Error('mock set error')
      })
      return request(commonApp)
        .get('/session/get_error')
        .expect(500)
        .expect('oops')
    })
  })

  describe('defer session middleware', () => {
    afterEach(() => {
      deferApp.store.emit('connect')
      mm.restore()
    })
    let cookie
    const mockCookie = 'koa.sid=s:dsfdss.PjOnUyhFG5bkeHsZ1UbEY7bDerxBINnZsD5MUguEph8; path=/; httponly'

    it('should get session error when disconnect', () => {
      deferApp.store.emit('disconnect')
      return request(deferApp)
        .get('/session/get')
        .expect(500)
        .expect('session store is unavailable')
    })

    it('should get session ok when store.get error but session not exist', async () => {
      mm.error(deferApp.store, 'get', 'mock error')
      const res = await request(deferApp)
        .get('/session/get')
        .expect(/1/)
        .expect(200)

      cookie = res.headers['set-cookie'].join(';')
      cookie.indexOf('httponly').should.above(0)
      cookie.indexOf('expires=').should.above(0)

    })

    it('should get session error when store.get error', () => {
      mm(deferApp.store, 'get', () => {
        throw new Error('mock get error')
      })
      return request(deferApp)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(500)
    })

    it('should get /session/notuse ok when store.get error', () => {
      mm(deferApp.store, 'get', () => {
        throw new Error('mock get error')
      })
      return request(deferApp)
        .get('/session/notuse')
        .set('cookie', cookie)
        .expect(200)
    })

    it('should handler session error when store.set error', (done) => {
      cookie = 'koss:test_sid=bGX1r5jcQHX4CqO1Heiy_DLvkTpQvx3M; path=/session; expires=Thu, 13 Apr 2017 17:19:04 GMT; httponly;koss:test_sid.sig=ZvZ8W0x9akbySx-9kEUkVPqAd2g; path=/session; expires=Thu, 13 Apr 2017 17:19:04 GMT; httponly'
      request(commonApp)
        .get('/session/get')
        .set('cookie', cookie)
        .expect(200)
        .expect(/2/, () => {
          mm(commonApp.store, 'set', () => {
            throw new Error('mock set error')
          })
          request(commonApp)
            .get('/session/get')
            .set('cookie', cookie)
            .expect(500)
            .expect('mock set error', done)
        })
    })

  })

})
