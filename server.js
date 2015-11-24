var debug = require('debug')('pouch-stream-multi-sync:server');
var PipeChannels = require('pipe-channels');
var PouchStreamServer = require('pouch-stream-server');

module.exports = createServer;

function createServer(onDatabase) {
  const channelServer = PipeChannels.createServer();
  const pouchServer = PouchStreamServer();

  if (typeof onDatabase != 'function') {
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
        req.deny(err.message || err);
      } else {
        pouchServer.dbs.add(database, db);
        var channel = req.grant();
        channel.on('error', propagateError);
        channel.pipe(pouchServer.stream()).pipe(channel);
      }
    }
  }

  return channelServer;

  function propagateError(err) {
    channelServer.emit('error', err);
  }
}

function warn(err) {
  console.error(err);
}