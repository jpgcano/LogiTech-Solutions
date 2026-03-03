/**
 * Global error handler middleware
 * Captures any errors thrown in routes and returns structured JSON response
 */

export const errorHandler = (err, req, res, next) => {
    console.error('[ERROR]', err.message || err);

    // Default error status and message
    let status = 500;
    let message = 'Internal Server Error';
    let details = null;

    // Handle different error types
    if (err.name === 'ValidationError') {
        status = 400;
        message = 'Validation Error';
        details = err.details || err.message;
    } else if (err.name === 'NotFoundError') {
        status = 404;
        message = 'Resource Not Found';
        details = err.message;
    } else if (err.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized';
        details = err.message;
    } else if (err.name === 'ForbiddenError') {
        status = 403;
        message = 'Forbidden';
        details = err.message;
    } else if (err.code === '23505') {
        // PostgreSQL unique constraint violation
        status = 409;
        message = 'Conflict: Resource already exists';
        details = err.message;
    } else if (err.code === '23503') {
        // PostgreSQL foreign key violation
        status = 409;
        message = 'Conflict: Cannot delete or modify due to related records';
        details = err.message;
    } else if (err.statusCode) {
        status = err.statusCode;
        message = err.message;
    } else if (err.message) {
        // Custom error message from thrown Error()
        status = err.status || 500;
        message = err.message;
    }

    // Send structured error response
    res.status(status).json({
        ok: false,
        error: message,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Wrapper for async route handlers to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found middleware - must be last
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        ok: false,
        error: 'Not Found',
        details: `Route ${req.method} ${req.path} does not exist`
    });
};
