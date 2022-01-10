generic-session
=========

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Coveralls][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![Gittip][gittip-image]][gittip-url]

[npm-image]: https://img.shields.io/npm/v/koa-generic-session.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-generic-session
[travis-image]: https://img.shields.io/travis/koajs/generic-session.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/generic-session
[coveralls-image]: https://img.shields.io/coveralls/koajs/generic-session.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/koajs/generic-session?branch=master
[david-image]: https://img.shields.io/david/koajs/generic-session.svg?style=flat-square
[david-url]: https://david-dm.org/koajs/generic-session
[node-image]: https://img.shields.io/badge/node.js-%3E=_6.0.0-red.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/koa-generic-session.svg?style=flat-square
[download-url]: https://npmjs.org/package/koa-generic-session
[gittip-image]: https://img.shields.io/gittip/dead-horse.svg?style=flat-square
[gittip-url]: https://www.gittip.com/dead-horse/

Generic session middleware for koa, easy use with custom stores such as [redis](https://github.com/koajs/koa-redis) or [mongo](https://github.com/freakycue/koa-generic-session-mongo), supports defer session getter.

This middleware will only set a cookie when a session is manually set. Each time the session is modified (and only when the session is modified), it will reset the cookie and session.

You can use the rolling sessions that will reset the cookie and session for every request which touch the session.  Save behavior can be overridden per request.

**For async/await and Node v6.9.0+ support use v2.x of this package, for older use v1.x**

## Usage

### Example

```js

var session = require('koa-generic-session');
var redisStore = require('koa-redis');
var koa = require('koa');

var app = new koa(); // for koa v1 use `var app = koa();`
app.keys = ['keys', 'keykeys'];
app.use(session({
  store: redisStore()
}));

app.use(function *() {
  switch (this.path) {
  case '/get':
    get.call(this);
    break;
  case '/remove':
    remove.call(this);
    break;
  case '/regenerate':
    yield regenerate.call(this);
    break;
  }
});

function get() {
  var session = this.session;
  session.count = session.count || 0;
  session.count++;
  this.body = session.count;
}

function remove() {
  this.session = null;
  this.body = 0;
}

function *regenerate() {
  get.call(this);
  yield this.regenerateSession();
  get.call(this);
}

app.listen(8080);
```

* After adding session middleware, you can use `this.session` to set or get the sessions.
* Getting session ID via `this.sessionId`.
* Setting `this.session = null;` will destroy this session.
* Altering `this.session.cookie` changes the cookie options of this user. Also you can use the cookie options in session the store. Use for example `cookie.maxAge` as the session store's ttl.
* Calling `this.regenerateSession` will destroy any existing session and generate a new, empty one in its place. The new session will have a different ID.
* Calling `this.saveSession` will save an existing session (this method was added for [koa-redirect-loop](https://github.com/niftylettuce/koa-redirect-loop))
* Setting `this.sessionSave = true` will force saving the session regardless of any other options or conditions.
* Setting `this.sessionSave = false` will prevent saving the session regardless of any other options or conditions.

### Options

 * `key`: cookie name defaulting to `koa.sid`.
 * `prefix`: session prefix for store, defaulting to `koa:sess:`.
 * `ttl`: ttl is for sessionStore's expiration time (not to be confused with cookie expiration which is controlled by `cookie.maxAge`), can be a number or a function that returns a number (for dynamic TTL), default to null (means get ttl from `cookie.maxAge` or `cookie.expires`).
 * `rolling`: rolling session, always reset the cookie and sessions, defaults to `false`.
 * `genSid`: default sid was generated by [uid2](https://github.com/coreh/uid2), you can pass a function to replace it (supports promises/async functions).
 * `defer`: defers get session, only generate a session when you use it through `var session = yield this.session;`, defaults to `false`.
 * `allowEmpty`: allow generation of empty sessions.
 * `errorHandler(err, type, ctx)`: `Store.get` and `Store.set` will throw in some situation, use `errorHandle` to handle these errors by yourself. Default will throw.
 * `reconnectTimeout`: When store is disconnected, don't throw `store unavailable` error immediately, wait `reconnectTimeout` to reconnect, default is `10s`.
 * `sessionIdStore`: object with get, set, reset methods for passing session id throw requests.
 * `valid`: valid(ctx, session), valid session value before use it.
 * `beforeSave`: beforeSave(ctx, session), hook before save session.
 * `store`: session store instance. It can be any Object that has the methods `set`, `get`, `destroy` like [MemoryStore](https://github.com/koajs/koa-session/blob/master/lib/store.js).
 * `cookie`: session cookie settings, defaulting to:
    ```js
    {
      path: '/',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 //one day in ms,
      overwrite: true,
      signed: true
    }
    ```

    For a full list of cookie options see [expressjs/cookies](https://github.com/expressjs/cookies#cookiesset-name--value---options--).

    if you set`cookie.maxAge` to `null`, meaning no "expires" parameter is set so the cookie becomes a browser-session cookie. When the user closes the browser the cookie (and session) will be removed.

    Notice that `ttl` is different from `cookie.maxAge`, `ttl` set the expire time of sessionStore. So if you set `cookie.maxAge = null`, and `ttl=ms('1d')`, the session will expired after one day, but the cookie will destroy when the user closes the browser.
    And mostly you can just ignore `options.ttl`, `koa-generic-session` will parse `cookie.maxAge` as the tll.

    If your application requires dynamic expiration, control `cookie.maxAge` using `ctx.session.cookie.maxAge = dynamicMaxAge`, when you need `ttl` to differ from `cookie.maxAge` (a common example is browser-session cookies having `cookie.maxAge = null`, but you want them to not live indefinitely in the store) specify a function for `ttl`:

    ```js
    {
      ttl: (session) => {
        // Expire browser-session cookies from the store after 1 day
        if (session.cookie?.maxAge === null) {
          return 1000 * 60 * 60 * 24;
        }
      }
    }
    ```

## Hooks

- `valid()`: valid session value before use it
- `beforeSave()`: hook before save session

## Session Store

You can use any other store to replace the default MemoryStore, it just needs to follow this api:

* `get(sid)`: get session object by sid
* `set(sid, sess, ttl)`: set session object for sid, with a ttl (in ms)
* `destroy(sid)`: destroy session for sid

the api needs to return a Promise, Thunk or generator.

And use these events to report the store's status.

* `connect`
* `disconnect`

### Stores Presented

- [koa-redis](https://github.com/koajs/koa-redis) to store your session data with redis.
- [koa-mysql-session](https://github.com/tb01923/koa-mysql-session) to store your session data with MySQL.
- [koa-generic-session-mongo](https://github.com/freakycue/koa-generic-session-mongo) to store your session data with MongoDB.
- [koa-pg-session](https://github.com/TMiguelT/koa-pg-session) to store your session data with PostgreSQL.
- [koa-generic-session-rethinkdb](https://github.com/KualiCo/koa-generic-session-rethinkdb) to store your session data with ReThinkDB.
- [koa-sqlite3-session](https://github.com/chichou/koa-sqlite3-session) to store your session data with SQLite3.
- [koa-generic-session-sequelize](https://github.com/natesilva/koa-generic-session-sequelize) to store your session data with the [Sequelize](http://docs.sequelizejs.com/) ORM.
- [koa-generic-session-knex](https://github.com/EarthlingInteractive/koa-generic-session-knex) to store your session data with the [Knex](http://knexjs.org/) query builder.

## Graceful shutdown

Since this middleware comes with an auto-reconnect feature, it's very likely you can't gracefully shutdown after
closing the client as generic-session will try to recover the connection, in those cases you can disable reconnect feature (https://github.com/koajs/generic-session/blob/49b45612877d1a1b8a42dc61bfeba46b71f9cb52/src/session.js#L103-L112) desactivating the client emitter (do this only when stopping the server)

Example with ioredis
```js
  // ...disconnecting from db
  redisClient.emit = () => true;
  await redisClient.quit();
  // ...stopping the server
```

## Licences
(The MIT License)

Copyright (c) 2013 - 2016 dead-horse and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
