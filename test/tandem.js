var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var PouchDB = require('pouchdb');
var http = require('http');

var PouchSync = require('../');

describe('pouch-stream-multi-sync', function() {
  var db = new PouchDB({
    name: 'todos',
    db: require('memdown'),
  });
  var serverDB = new PouchDB({
    name: 'todos-server',
    db: require('memdown'),
  });
  var server;
  var client;
  var handler;

  describe('server', function() {

    it('can be created', function(done) {
      server = PouchSync.createServer(function(creds, db, cb) {
        if (! handler) {
          cb(new Error('no database event listener on server'));
        } else {
          handler.apply(null, arguments);
        }
      });
      server.setMaxListeners(Infinity);
      done();
    });

  });

  describe('client', function() {
    it('can be created', function(done) {
      client = PouchSync.createClient(connectClient);
      client.setMax
      client.connect();
      done();
    });

    it('can be made to sync', function(done) {
      var sync = client.sync(db, { credentials: { token: 'some token'}});
      sync.once('error', function(err) {
        expect(err).to.be.an.object();
        expect(err.message).to.equal('no database event listener on server');
        sync.cancel();
        done();
      });
    });
  });

  describe('server', function() {
    it('can deny database requests', function(done) {
      handler = function(credentials, database, callback) {
        expect(credentials).to.deep.equal({token: 'some token'});
        callback(new Error('go away'));
      };

      client = PouchSync.createClient(connectClient);
      client.connect();
      var sync = client.sync(db, { credentials: { token: 'some token'}});

      sync.once('error', function(err) {
        expect(err).to.be.an.object();
        expect(err.message).to.equal('go away');
        sync.cancel();
        done();
      });
    });

    it('can accept database requests', function(done) {
      handler = function(credentials, database, callback) {
        expect(credentials).to.deep.equal({token: 'some other token'});
        callback(null, serverDB);
      };

      client = PouchSync.createClient(connectClient);
      client.connect();
      var sync = client.sync(db, {
        credentials: { token: 'some other token'},
        remoteName: 'todos-server',
      });

      db.put({_id: 'A', a:1, b: 2}, function(err, reply) {
        if (err) throw err;
        sync.once('change', function() {
          serverDB.get('A', function(err, doc) {
            expect(err).to.equal(null);
            expect(doc).to.deep.equal({
              _id: 'A',
              a: 1,
              b: 2,
              _rev: reply.rev,
            });
            sync.cancel();
            done();
          });
        });
      });

    });
  });

  function connectClient() {
    setTimeout(function() {
      server.emit('connect');
    }, 100);
    return server;
  }
});
