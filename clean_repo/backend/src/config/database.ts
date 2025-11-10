import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export const databaseConfig: DatabaseConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'haas',
  password: process.env.POSTGRES_PASSWORD || 'haaspass',
  database: process.env.POSTGRES_DB || 'haasdb',
  ssl: process.env.POSTGRES_SSL === 'true',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
};

let pool: Pool;

export const getDatabasePool = (): Pool => {
  if (!pool) {
    pool = new Pool(databaseConfig);
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('💥 Unexpected error on idle client', err);
      process.exit(-1);
    });
    
    // Log pool connections
    pool.on('connect', (client) => {
      console.log('🔗 New database client connected');
    });
    
    pool.on('acquire', (client) => {
      console.log('🔄 Client acquired from pool');
    });
    
    pool.on('release', (err, client) => {
      if (err) {
        console.error('❌ Error releasing client back to pool:', err);
      } else {
        console.log('🔄 Client released back to pool');
      }
    });
  }
  
  return pool;
};

export const setupDatabase = async (): Promise<void> => {
  try {
    const pool = getDatabasePool();
    
    // Test the connection
    const client = await pool.connect();
    console.log('🔗 Database connection established');
    
    // Run basic health check
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log(`📅 Database current time: ${result.rows[0].current_time}`);
    console.log(`🗄️ Database version: ${result.rows[0].version}`);
    
    // Check if migrations are needed
    const migrations = await checkMigrations();
    if (migrations.needed) {
      console.log(`🔄 Found ${migrations.count} pending migrations`);
    } else {
      console.log('✅ Database schema is up to date');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
};

const checkMigrations = async (): Promise<{ needed: boolean; count: number }> => {
  try {
    const pool = getDatabasePool();
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Check for pending migrations
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_name NOT IN (
        SELECT name FROM migrations
      )
    `);
    
    const count = parseInt(result.rows[0].count);
    return { needed: count > 0, count };
    
  } catch (error) {
    console.error('Error checking migrations:', error);
    return { needed: false, count: 0 };
  }
};

export const getClient = async (): Promise<PoolClient> => {
  const pool = getDatabasePool();
  return await pool.connect();
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  const pool = getDatabasePool();
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(`🐌 Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
};

export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Database utility functions
export const batchInsert = async (
  table: string,
  data: Record<string, any>[],
  options: {
    onConflict?: string;
    returning?: string;
  } = {}
): Promise<any[]> => {
  if (data.length === 0) return [];
  
  const columns = Object.keys(data[0]);
  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;
  
  for (const row of data) {
    const rowPlaceholders = columns.map(() => `$${paramIndex++}`).join(', ');
    placeholders.push(`(${rowPlaceholders})`);
    values.push(...columns.map(col => row[col]));
  }
  
  let query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholders.join(', ')}
  `;
  
  if (options.onConflict) {
    query += ` ON CONFLICT (${options.onConflict}) DO NOTHING`;
  }
  
  if (options.returning) {
    query += ` RETURNING ${options.returning}`;
  }
  
  const result = await query(query, values);
  return result.rows;
};

export const paginate = async (
  queryText: string,
  params: any[],
  page: number = 1,
  limit: number = 20
): Promise<{ data: any[]; total: number; page: number; totalPages: number }> => {
  const offset = (page - 1) * limit;
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM (${queryText}) as subquery`;
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);
  
  // Get paginated data
  const paginatedQuery = `${queryText} LIMIT ${limit} OFFSET ${offset}`;
  const dataResult = await query(paginatedQuery, params);
  
  return {
    data: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Health check function
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  responseTime: number;
  details: any;
}> => {
  const start = Date.now();
  const pool = getDatabasePool();
  
  try {
    const result = await query('SELECT 1 as health_check');
    const responseTime = Date.now() - start;
    
    return {
      healthy: true,
      responseTime,
      details: {
        connection_count: pool.totalCount,
        idle_count: pool.idleCount,
        waiting_count: pool.waitingCount,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - start,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
};

// Cleanup function
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    console.log('🔒 Database pool closed');
  }
};