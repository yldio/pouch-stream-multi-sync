var debug = require('debug')('pouch-stream-multi-sync:client');
var extend = require('xtend');
var EventEmitter = require('events').EventEmitter;
var Reconnect = require('reconnect-core');
var PipeChannels = require('pipe-channels');
var PouchRemoteStream = require('pouch-remote-stream');

module.exports = createClient;

function createClient(createStream) {
  var reconnect = Reconnect(createStream);

  var PouchDB;
  var channels;
  var syncs = [];
  var r = reconnect(handleStream);
  r.on('error', propagateError);

  var client = new EventEmitter();
  client.connect = connect;
  client.sync = sync;
  client.destroy = client.end = destroy;

  return client;

  // -----------------

  function connect() {
    debug('connect, args = %j', arguments);
    r.reconnect = true;
    r.connect.apply(r, arguments);
    return client;
  }

  function handleStream(stream) {
    debug('handleStream');
    channels = PipeChannels.createClient();
    stream.on('error', propagateError);
    stream.pipe(channels).pipe(stream);
    setupSyncs();
  }

  function sync(db, _options) {
    var options = extend({}, {
      remoteName: db._db_name,
    }, _options);

    debug('sync for db %s, options = %j', db._db_name, options);

    /* istanbul ignore next */
    if (! options.remoteName) {
      throw new Error('need options.remoteName');
    }

    /* istanbul ignore next */
    PouchDB = db.constructor || options.PouchDB;

    /* istanbul ignore next */
    if (! PouchDB) {
      throw new Error('need options.PouchDB');
    }

    PouchDB.adapter('remote', PouchRemoteStream.adapter);

    var ret = new EventEmitter();
    ret.cancel = cancel;
    var sync = {
      db: db,
      options: options,
      ret: ret,
      canceled: false,
      dbSync: undefined,
    };

    syncs.push(sync);

    return ret;

    function cancel() {
      sync.canceled = true;
      debug('canceled sync');
    }
  }

  function setupSyncs() {
    syncs.forEach(startSync);
  }

  function startSync(sync) {
    debug('startSync: %j', sync.options);
    debug('sync.canceled: %j', sync.canceled);
    var channel;
    var dbSync;

    /* istanbul ignore else */
    if (!sync.canceled) {
      channels.channel({
        database: sync.options.remoteName,
        credentials: sync.options.credentials
      }, onChannel);
      sync.ret.cancel = cancel;
    }

    function onChannel(err, channel) {
      if (err) {
        sync.ret.emit('error', err);
      } else {
        var remote = PouchRemoteStream();
        var remoteDB = new PouchDB({
          name: sync.options.remoteName,
          adapter: 'remote',
          remote: remote,
        });
        debug('syncing %j to remote %j', sync.db._db_name, remoteDB._db_name);
        dbSync = sync.dbSync = PouchDB.sync(sync.db, remoteDB, {live: true});

        dbSync.on('change', function(change) {
          debug('change:', change.change.docs);
          sync.ret.emit('change', change);
        });

        channel.pipe(remote.stream).pipe(channel);
      }
    }

    function cancel() {
      if (dbSync) {
        dbSync.cancel();
      }
    }
  }

  function cancelAll() {
    debug('cancelAll');
    syncs.forEach(function(sync) {
      sync.canceled = true;

      /* istanbul ignore next */
      if (sync.dbSync) {
        debug('canceling sync');
        sync.dbSync.cancel();
      }

    });
  }

  function destroy() {
    /* istanbul ignore else */
    if (channels) {
      channels.destroy();
    }
    cancelAll();
    r.reconnect = false;
    r.disconnect();
  }

  function propagateError(err) {
    client.emit('error', err);
  }
}