import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Database configuration object
 */
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
    }
};

/**
 * Database connection pool
 */
let pool = null;
let isConnecting = false;

/**
 * Initialize database connection pool
 * @returns {Promise<sql.ConnectionPool>} Database connection pool
 */
export const initializeDatabase = async () => {
    if (pool && pool.connected) {
        return pool;
    }

    if (isConnecting) {
        // Wait for existing connection attempt
        while (isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return pool;
    }

    try {
        isConnecting = true;
        console.log('🔄 Initializing database connection...');
        
        // Validate required environment variables
        const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        pool = new sql.ConnectionPool(dbConfig);
        
        // Set up event handlers
        pool.on('connect', () => {
            console.log('✅ Database connected successfully');
        });
        
        pool.on('error', (err) => {
            console.error('❌ Database pool error:', err);
        });
        
        pool.on('close', () => {
            console.log('🔌 Database connection closed');
        });

        await pool.connect();
        
        console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.server}:${dbConfig.port}`);
        console.log(`🏊 Connection pool: max=${dbConfig.pool.max}, min=${dbConfig.pool.min}`);
        
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        pool = null;
        throw error;
    } finally {
        isConnecting = false;
    }
};

/**
 * Get database connection pool
 * @returns {Promise<sql.ConnectionPool>} Database connection pool
 */
export const getPool = async () => {
    if (!pool || !pool.connected) {
        return await initializeDatabase();
    }
    return pool;
};

/**
 * Execute a SQL query with parameters
 * @param {string} query - SQL query string
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export const executeQuery = async (query, params = {}) => {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Add parameters to the request
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        
        const result = await request.query(query);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw new Error(`Database query failed: ${error.message}`);
    }
};

/**
 * Execute a stored procedure with parameters
 * @param {string} procedureName - Name of the stored procedure
 * @param {Object} params - Procedure parameters
 * @returns {Promise<Object>} Procedure result
 */
export const executeProcedure = async (procedureName, params = {}) => {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Add parameters to the request
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        
        const result = await request.execute(procedureName);
        return result;
    } catch (error) {
        console.error('Database procedure error:', error);
        throw new Error(`Database procedure failed: ${error.message}`);
    }
};



/**
 * Close database connection pool gracefully
 * @returns {Promise<void>}
 */
export const closeDatabase = async () => {
    if (pool) {
        try {
            console.log('🔄 Closing database connection...');
            await pool.close();
            pool = null;
            console.log('✅ Database connection closed successfully');
        } catch (error) {
            console.error('❌ Error closing database connection:', error.message);
            throw error;
        }
    }
};

/**
 * Test database connectivity
 * @returns {Promise<boolean>} Connection test result
 */
export const testConnection = async () => {
    try {
        const result = await executeQuery('SELECT 1 as test');
        return result.recordset[0].test === 1;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
    }
};

/**
 * Get database connection status
 * @returns {Object} Connection status information
 */
export const getConnectionStatus = () => {
    return {
        connected: pool ? pool.connected : false,
        connecting: pool ? pool.connecting : false,
        healthy: pool ? pool.healthy : false,
        size: pool ? pool.size : 0,
        available: pool ? pool.available : 0,
        pending: pool ? pool.pending : 0,
        borrowed: pool ? pool.borrowed : 0
    };
};

// Export sql for direct access when needed
export { sql };

// Export default configuration
export default {
    initializeDatabase,
    getPool,
    executeQuery,
    executeProcedure,
    closeDatabase,
    testConnection,
    getConnectionStatus,
    sql
};