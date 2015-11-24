# pouch-stream-multi-sync

[![By](https://img.shields.io/badge/made%20by-yld!-32bbee.svg?style=flat)](http://yld.io/contact?source=github-pouch-stream-multi-sync)
[![Build Status](https://secure.travis-ci.org/pgte/pouch-stream-multi-sync.svg?branch=master)](http://travis-ci.org/pgte/pouch-stream-multi-sync?branch=master)

Sync several PouchDBs through a stream.

Supports reconnection, negotiation and authentication.

## Install

```
$ npm install pouch-stream-multi-sync --save
```

## Server

```js
var PouchSync = require('pouch-stream-multi-sync');

var server = PouchSync.createServer(onRequest);

function onRequest(credentials, dbName, cb) {
  if (credentials.token == 'some token') {
    cb(null, new PouchDB(dbName));
  } else {
    cb(new Error('not allowed'));
  }
};

// pipe server into and from duplex stream

stream.pipe(server).pipe(stream);
```

## Client

Example of client using a websocket:

```js
var websocket = require('websocket-stream');
var PouchSync = require('pouch-stream-multi-sync');

var db = new PouchDB('todos');
var client = PouchSync.createClient(getStream);
var sync = client.sync(db, {
  remoteName: 'todos-server',
  credentials: { token: 'some token'}
});

client.connect('ws://somehost:someport');

function getStream(address) {
  return websocket(address);
}
```

## API

TODO


## License

ISC
