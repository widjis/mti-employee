/**
 * Custom Application Error Class
 */
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Error Handling Middleware
 * Handles all errors in a consistent format
 */
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production error response
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong!'
  });
};

/**
 * Async Error Wrapper
 * Catches async errors and passes them to error handler
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle Unhandled Routes
 */
export const handleNotFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

/**
 * Database Error Handler
 * Converts database errors to operational errors
 */
export const handleDatabaseError = (err) => {
  if (err.code === 'EREQUEST') {
    // SQL Server request error
    return new AppError('Database request failed', 400);
  }
  
  if (err.code === 'ELOGIN') {
    // SQL Server login error
    return new AppError('Database connection failed', 500);
  }
  
  if (err.code === 'ETIMEOUT') {
    // SQL Server timeout error
    return new AppError('Database operation timed out', 408);
  }
  
  if (err.number === 2627) {
    // Unique constraint violation
    return new AppError('Duplicate entry found', 409);
  }
  
  if (err.number === 547) {
    // Foreign key constraint violation
    return new AppError('Referenced record not found', 400);
  }
  
  // Generic database error
  return new AppError('Database operation failed', 500);
};

/**
 * Validation Error Handler
 * Converts validation errors to operational errors
 */
export const handleValidationError = (errors) => {
  const message = errors.map(err => err.msg).join('. ');
  return new AppError(`Invalid input data: ${message}`, 400);
};