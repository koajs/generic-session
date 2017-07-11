/**!
 * koa-generic-session - test/rolling.test.js
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

/**
 * Module dependencies.
 */

const app = require('./support/rolling')
const request = require('supertest')
const should = require('should')

describe('test/rolling.test.js', () => {
  let cookie

  beforeEach(async () => {

    const res = await request(app)
      .get('/session/get')
      .expect(/1/)

    cookie = res.headers['set-cookie'].join(';')
  })

  it('should get session success', () => {
    return request(app)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(/2/)
  })

  it('should remove session success', async () => {

    await request(app)
      .get('/session/remove')
      .set('cookie', cookie)

    await request(app)
    .get('/session/get')
    .set('cookie', cookie)
    .expect(/1/)
  })

  describe('when not modify session', () => {

    it('and session exists get set-cookie', async () => {

      const res = await request(app)
        .get('/session/nothing')
        .set('cookie', cookie)

      should.exist(res.headers['set-cookie'])
    })

    it('and session not exists don\'t get set-cookie', async () => {

      const res = await request(app)
        .get('/session/nothing')

      should.not.exist(res.headers['set-cookie'])

    })
  })
})
