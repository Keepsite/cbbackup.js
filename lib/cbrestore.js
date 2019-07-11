const assert = require("assert");
const util = require("util");
const fs = require("fs");

const Bucket = require("./Bucket.js");

const readFileAsync = util.promisify(fs.readFile).bind(fs);

async function cbrestore(options = {}) {
  const {
    // wrap it
    connStr,
    password,
    bucketName,
    source,
    log = () => null
  } = options;

  assert.ok(connStr, "connStr is required.");
  assert.ok(password, "password is required.");
  assert.ok(bucketName, "bucketName is required.");
  assert.ok(source, "source is required.");

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

  const results = await bucket.query(
    `SELECT meta(\`${bucketName}\`).id, meta(\`${bucketName}\`).cas FROM \`${bucketName}\``
  );

  const ids = data.objects.map(o => o.id);

  log(`Getting ${ids.length} documents...`);

  const currentObjects = new Map();

  for (const result of results) {
    const { id, cas } = result;
    const value = await bucket.get(id);
    currentObjects.set(id, { value, cas });
  }

  log("Detecting changes...");
  const toRemoveIds = results
    .filter(({ id }) => !ids.includes(id))
    .map(({ id }) => id);

  const changedObjects = [];

  for (const object of data.objects) {
    const currentObject = currentObjects.get(object.id);
    if (currentObject && currentObject.cas === object.cas) continue;
    changedObjects.push(object);
  }

  log(`Removing ${toRemoveIds.length} documents...`);
  for (const id of toRemoveIds) await bucket.remove(id);

  for (const [index, object] of changedObjects.entries()) {
    log(`Upsert ${object.id}... (${index} / ${changedObjects.length})`);
    await bucket.upsert(object.id, object.value, { cas: object.cas });
  }
  log("Done.");
}

module.exports = cbrestore;
