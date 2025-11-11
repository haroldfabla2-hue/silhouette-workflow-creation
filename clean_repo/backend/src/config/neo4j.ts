// Neo4j Configuration and Setup
import { Driver } from 'neo4j-driver';

let driver: Driver;

export const setupNeo4j = async (): Promise<void> => {
  try {
    const neo4jUrl = process.env.NEO4J_URL || 'bolt://localhost:7687';
    const neo4jUser = process.env.NEO4J_USER || 'neo4j';
    const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

    driver = require('neo4j-driver').default.driver(
      neo4jUrl,
      require('neo4j-driver').auth.basic(neo4jUser, neo4jPassword)
    );

    // Test the connection
    const session = driver.session();
    const result = await session.run('RETURN 1 as result');
    console.log('✅ Neo4j connection established');
    
    await session.close();
  } catch (error) {
    console.error('❌ Neo4j setup failed:', error);
    console.warn('⚠️  Neo4j connection failed - some features may be limited');
    // Don't throw error to allow server to start without Neo4j
  }
};

export const getNeo4jDriver = (): Driver | null => {
  return driver || null;
};

export const closeNeo4j = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    console.log('🔒 Neo4j connection closed');
  }
};