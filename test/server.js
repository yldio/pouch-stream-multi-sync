var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var PouchSync = require('../');

describe('pouch-stream-multi-sync', function() {
  describe('server', function() {
    it('throws if no request handler', function(done) {
      expect(function() {
        PouchSync.createServer();
      }).to.throw('need a request handler as first argument');
      done();
    });
  });
});

