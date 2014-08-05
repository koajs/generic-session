var koa = require('koa');
var couchbaseClient = require('couchbase-co'),
var session = require('..');
var couchbaseStore = require('../lib/couchbase-store.js');

var couchbase = new couchbaseClient(
    ['host'], 'user', 'password'
).on('connected', function(){
    console.log('Connected and authenticated is ok');
}).on('error', function(p_Error){
    console.error('An error occured:', p_Error);
});

var app = koa();
app.keys = ['keys', 'keykeys'];
app.use(session({
  store: new couchbaseStore(couchbase)
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
