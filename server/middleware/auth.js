const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'school_cluster_secret_key_2024';

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Role-based access control middleware factory.
 * Returns middleware that checks if req.user.role matches the required role.
 * @param {string} role - The required role (e.g., 'cluster' or 'hm')
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. '${role}' role required.` });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
