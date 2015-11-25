var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var PassThrough = require('stream').PassThrough;
var timers = require('timers');
var PouchDB = require('pouchdb');
var PouchSync = require('../');

describe('pouch-stream-multi-sync', function() {
  var connection;
  var db = new PouchDB({
    name: 'noneed',
    db: require('memdown'),
  });
  var sync;

  describe('client', function() {
    var client;
    it('can be immediately canceled', function(done) {
      client = PouchSync.createClient(connectClient);
      var sync = client.sync(db, {
        credentials: { token: 'some token'},
        remoteName: 'remote name'});
      sync.cancel();
      done();
    });

    it('can be created again', function(done) {
      client = PouchSync.createClient(connectClient);
      client.sync(db, {
        credentials: { token: 'some token'},
        remoteName: 'remote name'});
      done();
    });

    it('can propagate stream errors', function(done) {
      client.once('error', function(err) {
        expect(err).to.be.an.object();
        expect(err.message).to.equal('this should have been caught');
        done();
      });
      timers.setImmediate(function() {
        connection.emit('error', new Error('this should have been caught'));
      });
      client.connect();
    });

    it('can be created again', function(done) {
      client = PouchSync.createClient(connectClient);
      client.sync(db, {
        credentials: { token: 'some token'},
        remoteName: 'remote name'});
      done();
    });

    it('can start sync', function(done) {
      sync = client.sync(db, {
        credentials: { token: 'some token'},
        remoteName: 'remote name'});
      done();
    });

    it('can cancel sync', function(done) {
      sync.cancel();
      done();
    });

    it('can be destroyed', function(done) {
      client.destroy();
      done();
    });

    it('waits a bit', function(done) {
      setTimeout(done, 1000);
    });

    function connectClient() {
      connection = new PassThrough();
      timers.setImmediate(function() {
        connection.emit('connect');
      });
      return connection;
    }
  });
});

