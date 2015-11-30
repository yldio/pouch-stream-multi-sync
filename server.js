var debug = require('debug')('pouch-stream-multi-sync:server');
var PipeChannels = require('pipe-channels');
var PouchStreamServer = require('pouch-stream-server');

module.exports = createServer;

function createServer(onDatabase) {
  const channelServer = PipeChannels.createServer();
  const pouchServer = PouchStreamServer();

  if (typeof onDatabase !== 'function') {
    throw new Error('need a request handler as first argument');
  }

  channelServer.on('request', onRequest);

  function onRequest(req) {
    var database = req.payload.database;
    var credentials = req.payload.credentials;

    debug('going to emit database event, credentials = %j, database = %j', credentials, database);

    onDatabase.call(null, credentials, database, callback);

    function callback(err, db) {
      if (err) {
        req.deny(err.message || /* istanbul ignore next */ err);
      } else {
        pouchServer.dbs.add(database, db);
        var channel = req.grant();
        channel.on('error', propagateError);

        var pouchStream = pouchServer.stream();
        pouchStream.on('error', propagateError);

        channel.pipe(pouchStream).pipe(channel);
      }
    }
  }

  return channelServer;

  /* istanbul ignore next */
  function propagateError(err) {
    if (err && err.message !== 'write after end') {
      channelServer.emit('error', err);
    }
  }
}
