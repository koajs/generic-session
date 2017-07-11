/**!
 * koa-generic-session - test/override.test.js
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   Evan King <evan.king@bluespurs.com> (http://honoredsoft.com)
 */

/**
 * Module dependencies.
 */

const app = require('./support/override')
const request = require('supertest')
const should = require('should')

describe('test/override.test.js', () => {
  let cookie

  before(async () => {

    const res = await request(app)
      .get('/session/update')
      .expect(/1/)

    cookie = res.headers['set-cookie'].join(';')
  })


  async function req(path, expectBody, expectCookie) {

    const res = await request(app)
      .get('/session/' + path)
      .set('cookie', cookie)

    should(res.text).match(expectBody)

    return expectCookie
      ? should.exist(res.headers['set-cookie'])
      : should.not.exist(res.headers['set-cookie'])

  }

  it('should save modified session', req.bind(null, 'update', /2, null/, true))
  it('should prevent saving modified session', req.bind(null, 'update/prevent', /3, false/, false))
  it('should force saving unmodified session', req.bind(null, 'read/force', /2, true/, true))
  it('should prevent deleting session', req.bind(null, 'remove/prevent', /0, false/, false))
  it('should not have fresh session', req.bind(null, 'read', /2, null/, false))
  it('should delete session on force-save', req.bind(null, 'remove/force', /0, true/, true))
  it('should have fresh session', req.bind(null, 'read', /0, null/, true))

})
