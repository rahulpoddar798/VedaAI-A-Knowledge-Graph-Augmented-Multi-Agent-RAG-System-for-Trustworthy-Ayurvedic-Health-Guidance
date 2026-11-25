const neo4j = require('neo4j-driver');

const PLACEHOLDER_TOKENS = new Set([
  'YOUR_USERNAME',
  'YOUR_PASSWORD',
  'YOUR_INSTANCE_ID',
  'neo4j+s://YOUR_INSTANCE_ID.databases.neo4j.io'
]);

let sharedDriver = null;

/**
 * Validate required Neo4j credentials without insecure hardcoded fallbacks.
 * Returns { uri, username, password }.
 */
function getNeo4jCredentials(env = process.env) {
  const uri = typeof env.NEO4J_URI === 'string' ? env.NEO4J_URI.trim() : '';
  const username = typeof env.NEO4J_USERNAME === 'string' ? env.NEO4J_USERNAME.trim() : '';
  const password = typeof env.NEO4J_PASSWORD === 'string' ? env.NEO4J_PASSWORD : '';

  if (
    !uri ||
    !username ||
    !password ||
    PLACEHOLDER_TOKENS.has(uri) ||
    PLACEHOLDER_TOKENS.has(username) ||
    PLACEHOLDER_TOKENS.has(password) ||
    uri.includes('YOUR_INSTANCE_ID')
  ) {
    throw new Error(
      'Database configuration missing: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must all be explicitly configured.'
    );
  }

  return { uri, username, password };
}

/**
 * Return the shared singleton Neo4j driver instance, creating it lazily.
 */
function getSharedDriver() {
  if (!sharedDriver) {
    const { uri, username, password } = getNeo4jCredentials();
    sharedDriver = neo4j.driver(uri, neo4j.auth.basic(username, password), { connectionTimeout: 5000, connectionAcquisitionTimeout: 7000, maxTransactionRetryTime: 3000 });
  }
  return sharedDriver;
}

/**
 * Verify Neo4j connectivity cleanly without running telemetry queries.
 */
async function verifyNeo4jConnectivity(driver = getSharedDriver()) {
  const session = driver.session();
  try {
    await session.run('RETURN 1 AS ok');
    return true;
  } finally {
    await session.close();
  }
}

/**
 * Gracefully close the shared Neo4j driver instance.
 */
async function closeSharedDriver() {
  if (sharedDriver) {
    const target = sharedDriver;
    sharedDriver = null;
    await target.close();
  }
}

module.exports = {
  getNeo4jCredentials,
  getSharedDriver,
  verifyNeo4jConnectivity,
  closeSharedDriver
};
