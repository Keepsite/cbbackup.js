const assert = require('assert');
const util = require('util');
const fs = require('fs');
const _ = require('lodash');

const Bucket = require('./Bucket.js');

const readFileAsync = util.promisify(fs.readFile).bind(fs);

async function cbrestore(options = {}) {
  const {
    // wrap it
    connStr,
    password,
    bucketName,
    source,
    log = () => null,
  } = options;

  assert.ok(connStr, 'connStr is required.');
  assert.ok(password, 'password is required.');
  assert.ok(bucketName, 'bucketName is required.');
  assert.ok(source, 'source is required.');

  let backup;
  const backupMap = new Map();
  try {
    const backupJSON = await readFileAsync(source, 'utf8');
    backup = JSON.parse(backupJSON);

    assert.ok(backup.objects);
    assert.equal(backup.objects.constructor, Array);
    for (const { id, value } of backup.objects) {
      assert.ok(id);
      assert.ok(value);
      assert.equal(value.constructor, Object);
      backupMap.set(id, value);
    }
  } catch (error) {
    throw new Error(`source is not a valid backup: ${error.message}`);
  }
  const bucket = new Bucket({ connStr, password, bucketName });

  log('Listing documents...');
  const queryResults = await bucket.query(
    `SELECT meta(\`${bucketName}\`).id FROM \`${bucketName}\``
  );

  log(`Getting ${backup.objects.length} documents...`);
  const currentObjects = new Map();
  const currentIds = queryResults.map(({ id }) => id);
  if (currentIds.length)
    await bucket
      .getMulti(currentIds)
      .then(objects =>
        objects.forEach(({ id, value }) => currentObjects.set(id, { value }))
      );

  log('Detecting changes...');
  const toRemoveIds = [];
  for (const id of currentIds) {
    if (!backupMap.has(id)) toRemoveIds.push(id);
  }

  const changedObjects = [];
  for (const { id, value } of backup.objects) {
    const currentObject = currentObjects.get(id);
    if (currentObject && _.isEqual(currentObject.value, value)) continue;
    changedObjects.push({ id, value });
  }

  log(`Removing ${toRemoveIds.length} documents...`);
  for (const id of toRemoveIds) await bucket.remove(id);

  log(`Upserting ${changedObjects.length} documents...`);
  await Promise.all(
    changedObjects.map(object => bucket.upsert(object.id, object.value))
  );
  log('Done.');
}

module.exports = cbrestore;
