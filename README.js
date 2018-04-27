# cbbackup.js

Simplified Couchbase backup tool in JavaScript which only deal with documents.

## Using via CLI

```
npm i -g cbbackup
cbbackup [connStr] [password] [bucket] [destination]
cbrestore [connStr] [password] [bucket] [source]
```

## Using via JavaScript

```
const { cbbackup, restore } = require('cbbackup');
cbbackup({
  connStr: 'couchbase://localhost',
  password: 'p@sswOrd',
  bucket: 'myBucket',
  destination: './dump.json',
  log: message => console.log(message)
}) // return a Promise

cbrestore({
  connStr: 'couchbase://localhost',
  password: 'p@sswOrd',
  bucket: 'myBucket',
  source: './dump.json',
  log: message => console.log(message)
}); // return a Promise
```
