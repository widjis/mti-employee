import { executeQuery, executeProcedure, sql } from '../config/database.js';
import config from '../config/app.js';

/**
 * Audit Trail Service
 * Provides comprehensive audit logging functionality
 */
class AuditService {
    /**
     * Log an audit trail entry
     * @param {Object} auditData - Audit information
     * @param {string} auditData.tableName - Name of the affected table
     * @param {string} auditData.recordId - ID of the affected record
     * @param {string} auditData.operationType - Type of operation (INSERT, UPDATE, DELETE)
     * @param {Object} auditData.oldValues - Previous values (for UPDATE/DELETE)
     * @param {Object} auditData.newValues - New values (for INSERT/UPDATE)
     * @param {Array} auditData.changedFields - List of changed field names
     * @param {Object} auditData.userContext - User context information
     * @param {string} auditData.reason - Reason for the change
     */
    static async logAuditTrail(auditData) {
        try {
            const {
                tableName,
                recordId,
                operationType,
                oldValues = null,
                newValues = null,
                changedFields = null,
                userContext = {},
                reason = null
            } = auditData;

            const parameters = {
                table_name: tableName,
                record_id: recordId.toString(),
                operation_type: operationType,
                old_values: oldValues ? JSON.stringify(oldValues) : null,
                new_values: newValues ? JSON.stringify(newValues) : null,
                changed_fields: changedFields ? changedFields.join(',') : null,
                user_id: userContext.userId || null,
                user_role: userContext.userRole || null,
                ip_address: userContext.ipAddress || null,
                user_agent: userContext.userAgent || null,
                session_id: userContext.sessionId || null,
                reason: reason
            };

            await executeProcedure('sp_log_audit_trail', parameters);
            
            // Also log to system logs for critical operations
            if (operationType === 'DELETE' || (operationType === 'UPDATE' && tableName === 'login')) {
                await this.logSystemEvent({
                    level: 'INFO',
                    message: `${operationType} operation on ${tableName} for record ${recordId}`,
                    category: 'AUDIT',
                    userId: userContext.userId,
                    ipAddress: userContext.ipAddress,
                    additionalData: JSON.stringify({ tableName, recordId, operationType })
                });
            }
        } catch (error) {
            console.error('Failed to log audit trail:', error);
            // Don't throw error to avoid breaking the main operation
        }
    }

    /**
     * Log a login attempt
     * @param {Object} loginData - Login attempt information
     */
    static async logLoginAttempt(loginData) {
        try {
            const {
                username,
                ipAddress,
                userAgent = null,
                success,
                failureReason = null,
                sessionId = null
            } = loginData;

            const parameters = {
                username,
                ip_address: ipAddress,
                user_agent: userAgent,
                success: success ? 1 : 0,
                failure_reason: failureReason,
                session_id: sessionId
            };

            await executeProcedure('sp_log_login_attempt', parameters);
        } catch (error) {
            console.error('Failed to log login attempt:', error);
        }
    }

    /**
     * Manage user sessions
     * @param {string} action - Action to perform (CREATE, UPDATE, LOGOUT, CLEANUP)
     * @param {Object} sessionData - Session data
     */
    static async manageUserSession(action, sessionData = {}) {
        try {
            const {
                sessionId = null,
                userId = null,
                username = null,
                ipAddress = null,
                userAgent = null,
                expiresAt = null
            } = sessionData;

            const parameters = {
                action,
                session_id: sessionId,
                user_id: userId,
                username,
                ip_address: ipAddress,
                user_agent: userAgent,
                expires_at: expiresAt
            };

            await executeProcedure('sp_manage_user_session', parameters);
        } catch (error) {
            console.error('Failed to manage user session:', error);
        }
    }

    /**
     * Log system events
     * @param {Object} logData - Log information
     */
    static async logSystemEvent(logData) {
        try {
            const {
                level,
                message,
                category = null,
                userId = null,
                ipAddress = null,
                requestId = null,
                stackTrace = null,
                additionalData = null
            } = logData;

            const parameters = {
                level,
                message,
                category,
                user_id: userId,
                ip_address: ipAddress,
                request_id: requestId,
                stack_trace: stackTrace,
                additional_data: additionalData
            };

            await executeProcedure('sp_log_system_event', parameters);
        } catch (error) {
            console.error('Failed to log system event:', error);
        }
    }

    /**
     * Get audit trail for a specific record
     * @param {string} tableName - Table name
     * @param {string} recordId - Record ID
     * @param {Object} options - Query options
     */
    static async getAuditTrail(tableName, recordId, options = {}) {
        try {
            const { limit = 50, offset = 0 } = options;
            
            const query = `
                SELECT 
                    audit_id,
                    operation_type,
                    old_values,
                    new_values,
                    changed_fields,
                    user_id,
                    user_role,
                    ip_address,
                    timestamp,
                    reason
                FROM dbo.audit_trail 
                WHERE table_name = @tableName AND record_id = @recordId
                ORDER BY timestamp DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `;

            const result = await executeQuery(query, {
                tableName,
                recordId: recordId.toString(),
                limit,
                offset
            });

            return result.recordset.map(record => ({
                ...record,
                old_values: record.old_values ? JSON.parse(record.old_values) : null,
                new_values: record.new_values ? JSON.parse(record.new_values) : null,
                changed_fields: record.changed_fields ? record.changed_fields.split(',') : null
            }));
        } catch (error) {
            console.error('Failed to get audit trail:', error);
            throw error;
        }
    }

    /**
     * Get login attempts for security monitoring
     * @param {Object} filters - Filter options
     */
    static async getLoginAttempts(filters = {}) {
        try {
            const { 
                username = null, 
                ipAddress = null, 
                success = null, 
                hours = 24,
                limit = 100 
            } = filters;

            let whereClause = 'WHERE attempt_time >= DATEADD(HOUR, @hours, GETDATE())';
            const parameters = { hours: -Math.abs(hours), limit };

            if (username) {
                whereClause += ' AND username = @username';
                parameters.username = username;
            }

            if (ipAddress) {
                whereClause += ' AND ip_address = @ipAddress';
                parameters.ipAddress = ipAddress;
            }

            if (success !== null) {
                whereClause += ' AND success = @success';
                parameters.success = success ? 1 : 0;
            }

            const query = `
                SELECT TOP (@limit)
                    username,
                    ip_address,
                    attempt_time,
                    success,
                    failure_reason
                FROM dbo.login_attempts 
                ${whereClause}
                ORDER BY attempt_time DESC
            `;

            const result = await executeQuery(query, parameters);
            return result.recordset;
        } catch (error) {
            console.error('Failed to get login attempts:', error);
            throw error;
        }
    }

    /**
     * Get active user sessions
     */
    static async getActiveSessions() {
        try {
            const query = `
                SELECT 
                    session_id,
                    user_id,
                    username,
                    ip_address,
                    created_at,
                    last_activity,
                    expires_at
                FROM dbo.user_sessions 
                WHERE is_active = 1 AND expires_at > GETDATE()
                ORDER BY last_activity DESC
            `;

            const result = await executeQuery(query);
            return result.recordset;
        } catch (error) {
            console.error('Failed to get active sessions:', error);
            throw error;
        }
    }

    /**
     * Clean up old audit data
     * @param {number} retentionDays - Number of days to retain data
     */
    static async cleanupAuditData(retentionDays = 365) {
        try {
            await executeProcedure('sp_cleanup_audit_data', { retention_days: retentionDays });
            
            await this.logSystemEvent({
                level: 'INFO',
                message: 'Audit data cleanup completed',
                category: 'MAINTENANCE',
                additionalData: JSON.stringify({ retentionDays })
            });
        } catch (error) {
            console.error('Failed to cleanup audit data:', error);
            throw error;
        }
    }

    /**
     * Set user context for audit logging
     * @param {Object} req - Express request object
     * @param {Object} user - User information
     */
    static setUserContext(req, user) {
        return {
            userId: user.user_id || user.id,
            userRole: user.role,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID || req.headers['x-session-id']
        };
    }

    /**
     * Compare objects to find changed fields
     * @param {Object} oldObj - Original object
     * @param {Object} newObj - Updated object
     * @returns {Array} Array of changed field names
     */
    static getChangedFields(oldObj, newObj) {
        const changedFields = [];
        
        // Check for changed or new fields
        for (const key in newObj) {
            if (oldObj[key] !== newObj[key]) {
                changedFields.push(key);
            }
        }
        
        // Check for removed fields
        for (const key in oldObj) {
            if (!(key in newObj)) {
                changedFields.push(key);
            }
        }
        
        return changedFields;
    }

    /**
     * Sanitize sensitive data for logging
     * @param {Object} data - Data to sanitize
     * @returns {Object} Sanitized data
     */
    static sanitizeForLogging(data) {
        const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'key'];
        const sanitized = { ...data };
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }
}

export default AuditService;