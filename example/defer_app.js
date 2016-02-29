
var koa = require('koa');
var session = require('..');
var RedisStore = require('koa-redis');

var app = koa();
app.keys = ['keys', 'keykeys'];
app.use(session({
  defer: true,
  store: new RedisStore()
}));

app.use(async (ctx) => {
  switch (this.path) {
  case '/get':
    await get(ctx);
    break;
  case '/remove':
    remove(ctx);
    break;
  }
});

async function get(ctx) {
  var session = yield ctx.session;
  session.count = session.count || 0;
  session.count++;
  ctx.body = session.count;
}

function remove(ctx) {
  ctx.session = null;
  ctx.body = 0;
}

app.listen(8080);
