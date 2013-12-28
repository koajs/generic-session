koa-session [![Build Status](https://secure.travis-ci.org/dead-horse/koa-session.png)](http://travis-ci.org/dead-horse/koa-session) [![Coverage Status](https://coveralls.io/repos/dead-horse/koa-session/badge.png)](https://coveralls.io/r/dead-horse/koa-session) [![Dependency Status](https://gemnasium.com/dead-horse/koa-session.png)](https://gemnasium.com/dead-horse/koa-session)
=========

koa session with redis

[![NPM](https://nodei.co/npm/koa-sess.png?downloads=true)](https://nodei.co/npm/koa-sess/)

## Usage  

### Example

```javascript
var koa = require('koa');
var http = require('http');
var session = require('koa-sess');

var app = koa();

app.name = 'koa-session-test';
app.outputErrors = true;
app.keys = ['keys', 'keykeys'];
app.proxy = true; // to support `X-Forwarded-*` header

app.use(session());

app.use(function *() {
  switch (this.request.url) {
  case '/get':
    get(this);
    break;
  case '/remove':
    remove(this);
    break;
  }
});

function get(ctx) {
  ctx.session.count = ctx.session.count || 0;
  ctx.session.count++;
  ctx.body = ctx.session.count;
}

function remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

app.on('error', function (err) {
  console.error(err.stack);
});

var app = module.exports = http.createServer(app.callback());
app.listen(8080);
```

* After add session middlware, you can use `this.session` to set or get the sessions. 
* set `this.session = null;` will destroy this session.
* Alter `this.session.cookie` can handle the cookie options of this user. Also you can use cookie options in session store, for example use `cookie.maxAge` as session store's ttl.

### Options

```
 *`key` cookie name defaulting to `koa.sid`
 *`store` session store instance
 *`cookie` session cookie settings, defaulting to
    {path: '/', httpOnly: true, maxAge: null, rewrite: true, signed: true}
 ```

* Store can be any Object have `set`, `get`, `destroy` like [MemoryStore](https://github.com/dead-horse/koa-session/blob/master/lib/store.js).
* cookie defaulting to

```
{
  path: '/',
  httpOnly: true,
  maxAge: null,
  rewrite: true,
  signed: true
}
```

full list of cookie options, see [jed/cookies](https://github.com/jed/cookies#cookiesset-name--value---options--).

## Session Store

You can use any other store to replace the default MemoryStore, just need these public api:

* `get(sid)`: get session data by sid
* `set(sid, val)`: set session data for sid
* `destroy(sid)`: destory session for sid

all these api need return a Promise, Thunk or generator.

You can use [koa-redis](https://github.com/dead-horse/koa-redis) to store your session data with redis.

## Licences
(The MIT License)

Copyright (c) 2013 dead-horse and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
