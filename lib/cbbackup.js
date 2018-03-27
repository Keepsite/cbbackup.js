const assert = require("assert");
const util = require("util");
const fs = require("fs");
const filesize = require("filesize");

const Bucket = require("./Bucket.js");

const writeFileAsync = util.promisify(fs.writeFile).bind(fs);

async function cbbackup({
  connStr,
  password,
  bucketName,
  destination,
  log = () => null
}) {
  assert.ok(connStr);
  assert.ok(password);
  assert.ok(bucketName);
  assert.ok(destination);
  assert.ok(log);

  const bucket = new Bucket({ connStr, password, bucketName });

  log("Listing documents...");

  const ids = (await bucket.query(
    `SELECT meta(\`${bucketName}\`).id FROM \`${bucketName}\``
  )).map(r => r.id);

  log(`Getting ${ids.length} documents...`);

  const objects = await bucket.getMulti(ids);

  const data = { objects };

  const dataJSON = JSON.stringify(data);

  log(`Writing to file... (backup size: ${filesize(dataJSON.length)})`);

  await writeFileAsync(destination, dataJSON, "utf8");

  log("Done.");
}

module.exports = cbbackup;
