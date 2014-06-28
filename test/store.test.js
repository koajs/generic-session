/**!
 * koa-generic-session - test/store.test.js
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

var Session = require('..');
var koa = require('koa');
var deferApp = require('./support/defer');
var commonApp = require('./support/server');
var request = require('supertest');
var mm = require('mm');
var should = require('should');
var EventEmitter = require('events').EventEmitter;

var cookie;
describe('test/store.test.js', function () {
  afterEach(mm.restore);
  describe('common session middleware', function () {
    afterEach(function () {
      commonApp.store.emit('connect');
      mm.restore();
    });
    var cookie;
    var mockCookie = 'koa.sid=s:dsfdss.PjOnUyhFG5bkeHsZ1UbEY7bDerxBINnZsD5MUguEph8; path=/; httponly';

    it('should get session error when disconnect', function (done) {
      commonApp.store.emit('disconnect');
      request(commonApp)
      .get('/session/get')
      .expect(500)
      .expect('Internal Server Error', done);
    });

    it('should get session ok when store.get error but session not exist', function (done) {
      mm.error(commonApp.store, 'get', 'mock error');
      request(commonApp)
      .get('/session/get')
      .expect(/1/)
      .expect(200, function (err, res) {
        cookie = res.headers['set-cookie'].join(';');
        cookie.indexOf('httponly').should.above(0);
        cookie.indexOf('expires=').should.above(0);
        done(err);
      });
    });

    it('should get session error when store.get error', function (done) {
      mm(commonApp.store, 'get', function *() {
        throw new Error('mock get error');
      });
      request(commonApp)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(500, done);
    });

    it('should get /session/notuse error when store.get error', function (done) {
      mm(commonApp.store, 'get', function *() {
        throw new Error('mock get error');
      });
      request(commonApp)
      .get('/session/notuse')
      .set('cookie', cookie)
      .expect(500, done);
    });

    it('should ignore session error when store.set error', function (done) {
      mm(commonApp.store, 'set', function *() {
        throw new Error('mock set error');
      });
      request(commonApp)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(200)
      .expect(/2/, function () {
        request(commonApp)
        .get('/session/nothing')
        .set('cookie', cookie)
        .expect(200)
        .expect(/1/, done);
      });
    });
  });

  describe('defer session middleware', function () {
    afterEach(function () {
      deferApp.store.emit('connect');
      mm.restore();
    });
    var cookie;
    var mockCookie = 'koa.sid=s:dsfdss.PjOnUyhFG5bkeHsZ1UbEY7bDerxBINnZsD5MUguEph8; path=/; httponly';

    it('should get session error when disconnect', function (done) {
      deferApp.store.emit('disconnect');
      request(deferApp)
      .get('/session/get')
      .expect(500)
      .expect('Internal Server Error', done);
    });

    it('should get session ok when store.get error but session not exist', function (done) {
      mm.error(deferApp.store, 'get', 'mock error');
      request(deferApp)
      .get('/session/get')
      .expect(/1/)
      .expect(200, function (err, res) {
        cookie = res.headers['set-cookie'].join(';');
        cookie.indexOf('httponly').should.above(0);
        cookie.indexOf('expires=').should.above(0);
        done(err);
      });
    });

    it('should get session error when store.get error', function (done) {
      mm(deferApp.store, 'get', function *() {
        throw new Error('mock get error');
      });
      request(deferApp)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(500, done);
    });

    it('should get /session/notuse ok when store.get error', function (done) {
      mm(deferApp.store, 'get', function *() {
        throw new Error('mock get error');
      });
      request(deferApp)
      .get('/session/notuse')
      .set('cookie', cookie)
      .expect(200, done);
    });

    it('should ignore session error when store.set error', function (done) {
      mm(deferApp.store, 'set', function *() {
        throw new Error('mock set error');
      });
      request(deferApp)
      .get('/session/get')
      .set('cookie', cookie)
      .expect(200)
      .expect(/2/, function () {
        request(deferApp)
        .get('/session/nothing')
        .set('cookie', cookie)
        .expect(200)
        .expect(/1/, done);
      });
    });
  });
});
