
var koa = require('koa');
var session = require('..');
var RedisStore = require('koa-redis');

var app = koa();
app.keys = ['keys', 'keykeys'];
app.use(session({
  store: new RedisStore()
}));

app.use(function *() {
  switch (this.path) {
  case '/get':
    get.call(this);
    break;
  case '/remove':
    remove.call(this);
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

app.listen(8080);
