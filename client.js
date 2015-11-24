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
    var spec = {
      db: db,
      options: options,
      ret: ret,
      canceled: false,
      dbSync: undefined,
    };

    syncs.push(spec);

    return ret;

    function cancel() {
      spec.canceled = true;
      debug('canceled spec');
    }
  }

  function setupSyncs() {
    syncs.forEach(startSync);
  }

  function startSync(spec) {
    debug('startSync: %j', spec.options);
    debug('sync.canceled: %j', spec.canceled);
    var dbSync;

    /* istanbul ignore else */
    if (!spec.canceled) {
      channels.channel({
        database: spec.options.remoteName,
        credentials: spec.options.credentials,
      }, onChannel);
      spec.ret.cancel = cancel;
    }

    function onChannel(err, channel) {
      if (err) {
        spec.ret.emit('error', err);
      } else {
        var remote = PouchRemoteStream();
        var remoteDB = new PouchDB({
          name: spec.options.remoteName,
          adapter: 'remote',
          remote: remote,
        });
        debug('syncing %j to remote %j', spec.db._db_name, remoteDB._db_name);
        dbSync = spec.dbSync = PouchDB.sync(spec.db, remoteDB, {live: true});

        dbSync.on('change', function onChange(change) {
          debug('change:', change.change.docs);
          spec.ret.emit('change', change);
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
    syncs.forEach(function eachSync(spec) {
      spec.canceled = true;

      /* istanbul ignore next */
      if (spec.dbSync) {
        debug('canceling sync');
        spec.dbSync.cancel();
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
