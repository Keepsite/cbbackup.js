const assert = require('assert');
const util = require('util');
const fs = require('fs');
const filesize = require('filesize');

const Bucket = require('./Bucket.js');

const writeFileAsync = util.promisify(fs.writeFile).bind(fs);

async function cbbackup(options = {}) {
  const {
    // wrap it
    connStr,
    password,
    bucketName,
    destination,
    log = () => null,
  } = options;

  assert.ok(connStr, 'connStr is required');
  assert.ok(password, 'password is required');
  assert.ok(bucketName, 'bucketName is required');
  assert.ok(destination, 'destination is required');

  const bucket = new Bucket({ connStr, password, bucketName });

  log('Listing documents...');
  const results = await bucket.query(
    `SELECT meta(\`${bucketName}\`).id FROM \`${bucketName}\``
  );

  log(`Getting ${results.length} documents...`);
  const objects = await bucket.getMulti(results.map(r => r.id));
  const dataJSON = JSON.stringify({ objects });

  log(`Writing to file... (backup size: ${filesize(dataJSON.length)})`);
  await writeFileAsync(destination, dataJSON, 'utf8');

  log('Done.');
}

module.exports = cbbackup;
