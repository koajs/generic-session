
const koa = require('koa')
const session = require('..')
const RedisStore = require('koa-redis')

const app = new koa()
app.keys = ['keys', 'keykeys']
app.use(session({
  store: new RedisStore()
}))

app.use(ctx => {
  switch (ctx.path) {
  case '/get':
    get(ctx)
    break
  case '/remove':
    remove(ctx)
    break
  }
})

function get(ctx) {
  const session = ctx.session
  session.count = session.count || 0
  session.count++
  ctx.body = session.count
}

function remove(ctx) {
  ctx.session = null
  ctx.body = 0
}

app.listen(8080)
