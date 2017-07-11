
var koa = require('koa');
var session = require('..');
var RedisStore = require('koa-redis');

var app = new koa();
app.keys = ['keys', 'keykeys'];
app.use(session({
  store: new RedisStore()
}));

app.use(ctx => {
  switch (ctx.path) {
  case '/get':
    get(ctx);
    break;
  case '/remove':
    remove(ctx);
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
