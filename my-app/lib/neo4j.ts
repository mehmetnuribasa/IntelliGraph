import neo4j, { Driver } from 'neo4j-driver';

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !user || !password) {
  throw new Error(
    'Please define NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD environment variables.'
  );
}

// Global type declaration for caching the driver in development
declare global {
  var neo4jDriver: Driver | undefined;
}

// In development, hot-reload may cause unnecessary connections
let driver: Driver;

if (process.env.NODE_ENV === 'production') {
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
} else {
  if (!global.neo4jDriver) {
    global.neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  driver = global.neo4jDriver;
}

export default driver;