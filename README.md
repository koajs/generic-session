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

app.use(session({
  secret: 'koa-session-secret',
  cookie: {
    httpOnly: true,
    maxAge: 86400,
    path: '/session'
  }
}));

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

```

* After add session middlware, you can use `this.session` to set or get the sessions. 
* set `this.session = null;` will destroy this session.

### Options
