const assert = require("assert");
const util = require("util");
const fs = require("fs");
const _ = require("lodash");

const Bucket = require("./Bucket.js");

const readFileAsync = util.promisify(fs.readFile).bind(fs);

async function cbrestore({
  connStr,
  password,
  bucketName,
  source,
  log = () => null
}) {
  assert.ok(connStr);
  assert.ok(password);
  assert.ok(bucketName);
  assert.ok(source);
  assert.ok(log);

  let data;
  try {
    const dataJSON = await readFileAsync(source, "utf8");
    data = JSON.parse(dataJSON);

    assert.ok(data.objects);
    assert.equal(data.objects.constructor, Array);
    for (const object of data.objects) {
      assert.ok(object.id);
      assert.ok(object.value);
      assert.equal(object.value.constructor, Object);
    }
  } catch (error) {
    throw new Error(`source is not a valid backup: ${error.message}`);
  }

  const bucket = new Bucket({ connStr, password, bucketName });

  log("Listing documents...");

  const currentIds = (await bucket.query(
    `SELECT meta(\`${bucketName}\`).id FROM \`${bucketName}\``
  )).map(r => r.id);

  const ids = data.objects.map(o => o.id);

  log(`Getting ${ids.length} documents...`);

  const currentObjects = [];

  for (const id of currentIds) {
    const value = await bucket.get(id);
    currentObjects.push({
      value,
      id
    });
  }

  log("Detecting changes...");
  const toRemoveIds = currentIds.filter(i => !ids.includes(i));

  const changedObjects = [];

  for (const object of data.objects) {
    const currentObject = currentObjects.find(o => o.id === object.id);
    if (_.isEqual(currentObject, object)) continue;
    changedObjects.push(object);
  }

  log(`Removing ${toRemoveIds.length} documents...`);
  for (const id of toRemoveIds) await bucket.remove(id);

  for (const [index, object] of changedObjects.entries()) {
    log(`Upsert ${object.id}... (${index} / ${changedObjects.length})`);
    await bucket.upsert(object.id, object.value);
  }

  log("Done.");
}

module.exports = cbrestore;
