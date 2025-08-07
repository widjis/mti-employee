import { body, param, query, validationResult } from 'express-validator';
import { sql } from '../config/database.js';

/**
 * Generic validation error handler
 * Processes validation results and returns formatted errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export const sanitizeInput = (value) => {
    if (typeof value !== 'string') return value;
    
    return value
        .trim()
        .replace(/[<>"'&]/g, (match) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[match];
        });
};

/**
 * Custom validator to check if employee ID exists
 */
export const employeeExists = async (employeeId) => {
    try {
        const { executeQuery } = await import('../config/database.js');
        const result = await executeQuery(
            'SELECT COUNT(*) as count FROM dbo.employees WHERE employee_id = @employeeId',
            { employeeId }
        );
        return result.recordset[0].count > 0;
    } catch (error) {
        throw new Error('Database error while checking employee existence');
    }
};

/**
 * Custom validator to check if username exists
 */
export const usernameExists = async (username) => {
    try {
        const { executeQuery } = await import('../config/database.js');
        const result = await executeQuery(
            'SELECT COUNT(*) as count FROM dbo.login WHERE username = @username',
            { username }
        );
        return result.recordset[0].count > 0;
    } catch (error) {
        throw new Error('Database error while checking username existence');
    }
};

/**
 * Login validation rules
 */
export const loginValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('Username can only contain letters, numbers, dots, underscores, and hyphens')
        .customSanitizer(sanitizeInput),
    body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required')
        .isLength({ max: 128 })
        .withMessage('Password too long')
];

/**
 * Employee validation rules
 */
export const employeeValidation = [
    body('employee_id')
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage('Employee ID is required and must be max 20 characters')
        .matches(/^[a-zA-Z0-9-_]+$/)
        .withMessage('Employee ID can only contain letters, numbers, hyphens, and underscores')
        .customSanitizer(sanitizeInput),
    body('imip_id')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('IMIP ID must be max 20 characters')
        .customSanitizer(sanitizeInput),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name is required and must be max 100 characters')
        .matches(/^[a-zA-Z\s.'-]+$/)
        .withMessage('Name can only contain letters, spaces, dots, apostrophes, and hyphens')
        .customSanitizer(sanitizeInput),
    body('gender')
        .isIn(['M', 'F'])
        .withMessage('Gender must be M or F'),
    body('place_of_birth')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Place of birth must be max 100 characters')
        .customSanitizer(sanitizeInput),
    body('date_of_birth')
        .isISO8601()
        .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            const age = now.getFullYear() - date.getFullYear();
            if (age < 16 || age > 100) {
                throw new Error('Age must be between 16 and 100 years');
            }
            return true;
        }),
    body('nationality')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Nationality must be max 50 characters')
        .customSanitizer(sanitizeInput),
    body('blood_type')
        .optional()
        .isIn(['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
        .withMessage('Invalid blood type'),
    body('marital_status')
        .optional()
        .isIn(['Single', 'Married', 'Divorced', 'Widowed'])
        .withMessage('Invalid marital status'),
    body('tax_status')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Tax status must be max 50 characters')
        .customSanitizer(sanitizeInput),
    body('religion')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Religion must be max 50 characters')
        .customSanitizer(sanitizeInput),
    body('education')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Education must be max 100 characters')
        .customSanitizer(sanitizeInput),
    body('age')
        .optional()
        .isInt({ min: 16, max: 100 })
        .withMessage('Age must be between 16 and 100'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email must be valid')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email must be max 100 characters'),
    body('phone')
        .optional()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Phone must be valid')
        .isLength({ max: 20 })
        .withMessage('Phone must be max 20 characters'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address must be max 500 characters')
        .customSanitizer(sanitizeInput),
    body('emergency_contact_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Emergency contact name must be max 100 characters')
        .customSanitizer(sanitizeInput),
    body('emergency_contact_phone')
        .optional()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Emergency contact phone must be valid')
        .isLength({ max: 20 })
        .withMessage('Emergency contact phone must be max 20 characters'),
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must be max 100 characters')
        .customSanitizer(sanitizeInput),
    body('position')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Position must be max 100 characters')
        .customSanitizer(sanitizeInput),
    body('hire_date')
        .optional()
        .isISO8601()
        .withMessage('Hire date must be a valid date (YYYY-MM-DD)')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            if (date > now) {
                throw new Error('Hire date cannot be in the future');
            }
            return true;
        }),
    body('salary')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Salary must be a positive number')
        .custom((value) => {
            if (value > 999999999.99) {
                throw new Error('Salary too large');
            }
            return true;
        }),
    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Terminated', 'On Leave'])
        .withMessage('Invalid status')
];

/**
 * Employee update validation (excludes employee_id)
 */
export const employeeUpdateValidation = [
    param('employee_id')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Employee ID is required')
        .customSanitizer(sanitizeInput),
    ...employeeValidation.slice(1) // Skip employee_id validation for updates
];

/**
 * Employee ID parameter validation
 */
export const employeeIdValidation = [
    param('employee_id')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Employee ID is required')
        .customSanitizer(sanitizeInput)
];

/**
 * Query parameter validation for employee list
 */
export const employeeQueryValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search term must be max 100 characters')
        .customSanitizer(sanitizeInput),
    query('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department filter must be max 100 characters')
        .customSanitizer(sanitizeInput),
    query('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Terminated', 'On Leave'])
        .withMessage('Invalid status filter'),
    query('sort')
        .optional()
        .isIn(['name', 'employee_id', 'department', 'hire_date', 'created_at'])
        .withMessage('Invalid sort field'),
    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be asc or desc')
];

/**
 * File upload validation
 */
export const fileUploadValidation = [
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be max 500 characters')
        .customSanitizer(sanitizeInput)
];

/**
 * Rate limiting validation helper
 */
export const validateRateLimit = (windowMs, maxRequests) => {
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        
        // This is a simple in-memory rate limiter
        // In production, use Redis or similar
        if (!req.app.locals.rateLimitStore) {
            req.app.locals.rateLimitStore = new Map();
        }
        
        const store = req.app.locals.rateLimitStore;
        const requests = store.get(key) || [];
        
        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < windowMs);
        
        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        validRequests.push(now);
        store.set(key, validRequests);
        
        next();
    };
};

/**
 * SQL injection prevention helper
 */
export const preventSQLInjection = (req, res, next) => {
    const checkForSQLInjection = (value) => {
        if (typeof value !== 'string') return false;
        
        const sqlPatterns = [
            /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
            /(exec(\s|\+)+(s|x)p\w+)/i,
            /((select|insert|update|delete|drop|create|alter|exec|execute)\s)/i,
            /(union\s+(all\s+)?select)/i,
            /(script|javascript|vbscript|onload|onerror|onclick)/i
        ];
        
        return sqlPatterns.some(pattern => pattern.test(value));
    };
    
    const checkObject = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'string' && checkForSQLInjection(obj[key])) {
                    return true;
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (checkObject(obj[key])) return true;
                }
            }
        }
        return false;
    };
    
    if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid input detected'
        });
    }
    
    next();
};

export default {
    handleValidationErrors,
    sanitizeInput,
    employeeExists,
    usernameExists,
    loginValidation,
    employeeValidation,
    employeeUpdateValidation,
    employeeIdValidation,
    employeeQueryValidation,
    fileUploadValidation,
    validateRateLimit,
    preventSQLInjection
};