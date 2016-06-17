/**!
 * koa-generic-session - test/override.test.js
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

var app = require('./support/override');
var request = require('supertest');
var mm = require('mm');
var should = require('should');

describe('test/override.test.js', function () {
  var cookie;
  before(function (done) {
    request(app)
    .get('/session/update')
    .expect(/1/)
    .end(function (err, res) {
      cookie = res.headers['set-cookie'].join(';');
      done(err);
    });
  });
  
  function req(path, expectBody, expectCookie, done) {
    request(app)
      .get('/session/' + path)
      .set('cookie', cookie)
      .end(function (err, res) {
        should(res.body).match(expectBody);
        (expectCookie)
          ? should.exist(res.headers['set-cookie'])
          : should.not.exist(res.headers['set-cookie']);
        done(err);
      });
  }

  it('should save modified session', req.bind(null, 'update', /2/, true));
  it('should prevent saving modified session', req.bind(null, 'update/prevent', /3/, false));
  it('should force saving unmodified session', req.bind(null, 'read/force', /2/, true));
  it('should prevent deleting session', req.bind(null, 'remove/prevent', /2/, false));
  it('should not have fresh session', req.bind(null, 'read', /2/, false));
  it('should delete session', req.bind(null, 'remove', /0/, true));
  it('should have fresh session', req.bind(null, 'read', /1/, true));
  
});