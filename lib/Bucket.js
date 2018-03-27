const couchbase = require("couchbase");
const util = require("util");

class Bucket {
  constructor(options = {}) {
    const { connStr, bucketName, password } = options;
    const cluster = new couchbase.Cluster(connStr);
    const bucket = cluster.openBucket(bucketName, password);

    this.cbQuery = util.promisify(bucket.query).bind(bucket);
    this.cbGet = util.promisify(bucket.get).bind(bucket);
    this.cbGetMulti = util.promisify(bucket.getMulti).bind(bucket);
    this.cbRemove = util.promisify(bucket.remove).bind(bucket);
    this.cbUpsert = util.promisify(bucket.upsert).bind(bucket);
  }

  async query(str, ...args) {
    const n1qlQuery = couchbase.N1qlQuery.fromString(str);
    n1qlQuery.consistency(couchbase.N1qlQuery.Consistency.REQUEST_PLUS);
    const rows = await this.cbQuery(n1qlQuery, args);

    return rows;
  }

  async get(id) {
    const result = await this.cbGet(id);

    return result.value;
  }

  async remove(id) {
    await this.cbRemove(id);
  }

  async upsert(id, value) {
    await this.cbUpsert(id, value);
  }

  async getMulti(ids) {
    const result = await this.cbGetMulti(ids);

    return Object.entries(result).map(([id, { value }]) => ({
      id,
      value
    }));
  }
}

module.exports = Bucket;
