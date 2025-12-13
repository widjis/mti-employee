import express from 'express';
import loginRouter from './route.js';
import employeeRouter from './employeeRouter.js';
import openProjectRoutes from './routes/openProjectRoutes.js';
import employeeExportRoutes from './routes/employeeExportRoutes.js';
import roleColumnRoutes from './routes/roleColumnRoutes.js';
import userRoutes from './routes/userRoutes.js';
import rbacRoutes from './routes/rbacRoutes.js';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { globalErrorHandler, handleNotFound } from './middleware/errorHandler.js';
import config, { validateConfig, getConfigSummary } from './config/app.js';
import { initializeDatabase, closeDatabase, testConnection } from './config/database.js';

// Validate configuration on startup
const configValidation = validateConfig();
if (!configValidation.isValid) {
    console.error('❌ Configuration validation failed:');
    configValidation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
}

if (configValidation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    configValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration (flexible origin handling)
// Supports:
// - Single origin via CORS_ORIGIN
// - Comma-separated origins via CORS_ORIGINS
// - Reflect mode when CORS_ORIGIN is set to '*' or 'reflect' (allows any port)
const allowedOrigins = (config.server.corsOrigins || [])
  .concat(config.server.corsOrigin ? [config.server.corsOrigin] : [])
  .filter(Boolean);

const isReflectMode = ['*', 'reflect'].includes(config.server.corsOrigin);

const originValidator = (origin, callback) => {
  // Allow non-browser requests or same-origin
  if (!origin) return callback(null, true);

  // Reflect incoming origin (works with credentials)
  if (isReflectMode) return callback(null, true);

  // Exact match against allowed origins
  if (allowedOrigins.includes(origin)) return callback(null, true);

  try {
    const originUrl = new URL(origin);
    const originHost = `${originUrl.protocol}//${originUrl.hostname}`;
    // Host-only match (ignore port differences)
    for (const o of allowedOrigins) {
      try {
        const u = new URL(o);
        const allowedHost = `${u.protocol}//${u.hostname}`;
        if (allowedHost === originHost) {
          return callback(null, true);
        }
      } catch (e) {
        // If an entry is host-only (e.g., http://localhost), compare as-is
        if (o === originHost) {
          return callback(null, true);
        }
      }
    }
  } catch (e) {
    // If origin is malformed, reject
    return callback(new Error('Invalid origin format'));
  }

  return callback(new Error(`Not allowed by CORS: ${origin}`));
};

app.use(cors({
  origin: originValidator,
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await testConnection();
    const status = dbHealthy ? 200 : 503;
    
    res.status(status).json({
      success: dbHealthy,
      message: dbHealthy ? 'Server is running' : 'Database connection failed',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      environment: config.server.nodeEnv,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy test endpoint
app.get('/test', (req, res) => {
  res.send('Server is working');
});

// API routes
app.use('/api', loginRouter);
app.use('/api', employeeRouter);
app.use('/api/openproject', openProjectRoutes);
app.use('/api/employee-export', employeeExportRoutes);
app.use('/api', roleColumnRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rbac', rbacRoutes);

// Handle unmatched routes
app.use(handleNotFound);

// Global error handler
app.use(globalErrorHandler);

// Initialize database before starting server
const startServer = async () => {
    try {
        // Initialize database connection
        await initializeDatabase();
        
        // Start the server
        const server = app.listen(config.server.port, () => {
            console.log('🚀 MTI Employee Management System');
            console.log(`📡 Server running on port ${config.server.port}`);
            console.log(`🌍 Environment: ${config.server.nodeEnv}`);
            console.log(`🔗 CORS Origin: ${config.server.corsOrigin}`);
            console.log('📊 Configuration Summary:', JSON.stringify(getConfigSummary(), null, 2));
            console.log('✅ Server startup completed successfully');
        });
        
        return server;
    } catch (error) {
        console.error('❌ Server startup failed:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    try {
        await closeDatabase();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});