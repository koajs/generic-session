/**!
 * koa-generic-session - test/rolling.test.js
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */

var app = require('./support/rolling');
var request = require('supertest');
var mm = require('mm');
var should = require('should');

describe('test/rolling.test.js', function () {
  var cookie;
  beforeEach(function (done) {
    request(app)
    .get('/session/get')
    .expect(/1/)
    .end(function (err, res) {
      cookie = res.headers['set-cookie'].join(';');
      done(err);
    });
  });

  it('should get session success', function (done) {
    request(app)
    .get('/session/get')
    .set('cookie', cookie)
    .expect(/2/, done);
  });

  it('should remove session success', done => {
    request(app)
    .get('/session/remove')
    .set('cookie', cookie)
    .end(function() {
      request(app)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(/1/, done);
    });
  });

  describe('when not modify session', () => {
    it('and session exists get set-cookie', done => {
      request(app)
      .get('/session/nothing')
      .set('cookie', cookie)
      .end(function(err, res) {
        should.exist(res.headers['set-cookie']);
        done();
      });
    });

    it('and session not exists don\'t get set-cookie', done => {
      request(app)
      .get('/session/nothing')
      .end(function(err, res) {
        should.not.exist(res.headers['set-cookie']);
        done();
      });
    });
  });
});
