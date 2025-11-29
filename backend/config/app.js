import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Application configuration object
 * Centralizes all environment variables and provides defaults
 */
const config = {
    // Server Configuration
    server: {
        port: parseInt(process.env.PORT) || 8080,
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development',
        // CORS configuration
        // CORS_ORIGIN:
        //  - single origin (e.g., http://localhost:5173)
        //  - 'reflect' or '*' to reflect the request origin (dev convenience)
        // CORS_ORIGINS: comma-separated list of additional allowed origins
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        corsOrigins: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [],
        bodyLimit: process.env.BODY_LIMIT || '10mb'
    },

    // Database Configuration
    database: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        port: parseInt(process.env.DB_PORT) || 1433,
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS256'
    },

    // Security Configuration
    security: {
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
        sessionSecret: process.env.SESSION_SECRET || 'fallback-session-secret'
    },

    // File Upload Configuration
    upload: {
        maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760, // 10MB
        allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        destination: process.env.UPLOAD_DESTINATION || 'uploads/'
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE_ENABLED === 'true'
    },

    // OpenProject Configuration
    openProject: {
        baseUrl: process.env.OPENPROJECT_BASE_URL,
        apiKey: process.env.OPENPROJECT_API_KEY,
        projectId: process.env.OPENPROJECT_PROJECT_ID,
        timeout: parseInt(process.env.OPENPROJECT_TIMEOUT) || 30000
    },

    // Email Configuration (for future use)
    email: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@mti-employee.com'
    }
};

/**
 * Validate required configuration
 * @returns {Object} Validation result
 */
export const validateConfig = () => {
    const errors = [];
    const warnings = [];

    // Required database configuration
    const requiredDbFields = ['user', 'password', 'server', 'database'];
    requiredDbFields.forEach(field => {
        if (!config.database[field]) {
            errors.push(`Missing required database configuration: DB_${field.toUpperCase()}`);
        }
    });

    // JWT secret validation
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret-change-in-production') {
        if (config.server.nodeEnv === 'production') {
            errors.push('JWT_SECRET must be set in production environment');
        } else {
            warnings.push('Using fallback JWT_SECRET - change this in production');
        }
    }

    // Production environment checks
    if (config.server.nodeEnv === 'production') {
        if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'fallback-session-secret') {
            errors.push('SESSION_SECRET must be set in production environment');
        }
        
        if (config.security.bcryptSaltRounds < 12) {
            warnings.push('Consider using at least 12 salt rounds for bcrypt in production');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Get configuration for specific module
 * @param {string} module - Module name (server, database, jwt, etc.)
 * @returns {Object} Module configuration
 */
export const getConfig = (module = null) => {
    if (module && config[module]) {
        return config[module];
    }
    return config;
};

/**
 * Check if running in development mode
 * @returns {boolean}
 */
export const isDevelopment = () => {
    return config.server.nodeEnv === 'development';
};

/**
 * Check if running in production mode
 * @returns {boolean}
 */
export const isProduction = () => {
    return config.server.nodeEnv === 'production';
};

/**
 * Check if running in test mode
 * @returns {boolean}
 */
export const isTest = () => {
    return config.server.nodeEnv === 'test';
};

/**
 * Print configuration summary (without sensitive data)
 * @returns {Object} Safe configuration summary
 */
export const getConfigSummary = () => {
    return {
        server: {
            port: config.server.port,
            host: config.server.host,
            nodeEnv: config.server.nodeEnv,
            corsOrigin: config.server.corsOrigin
        },
        database: {
            server: config.database.server,
            database: config.database.database,
            port: config.database.port,
            encrypt: config.database.encrypt
        },
        security: {
            rateLimitWindowMs: config.security.rateLimitWindowMs,
            rateLimitMaxRequests: config.security.rateLimitMaxRequests,
            bcryptSaltRounds: config.security.bcryptSaltRounds
        },
        upload: {
            maxSize: config.upload.maxSize,
            allowedTypes: config.upload.allowedTypes.length
        },
        logging: {
            level: config.logging.level,
            enableConsole: config.logging.enableConsole,
            enableFile: config.logging.enableFile
        }
    };
};

export default config;