const assert = require("assert");
const runAsync = require("./runAsync.js");
const cbbackup = require("./cbbackup.js");
const cbrestore = require("./cbrestore.js");

function cli(command) {
  runAsync(async () => {
    const log =
      // eslint-disable-next-line no-console
      console.log.bind(console);

    if (command === "cbbackup") {
      assert.ok(
        process.argv.length === 6,
        "Usage: cbbackup [connStr] [password] [bucket] [destination]"
      );

      const [, , connStr, password, bucketName, destination] = process.argv;
      return cbbackup({
        connStr,
        password,
        bucketName,
        destination,
        log
      });
    }

    if (command === "cbrestore") {
      assert.ok(
        process.argv.length === 6,
        "Usage: cbrestore [connStr] [password] [bucket] [source]"
      );

      const [, , connStr, password, bucketName, source] = process.argv;
      return cbrestore({
        connStr,
        password,
        bucketName,
        source,
        log
      });
    }

    throw new Error(`Unkown command: ${command}`);
  });
}

module.exports = cli;
