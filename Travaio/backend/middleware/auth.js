const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  // Expect: "Bearer <token>"
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // make available to route handlers
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
}

module.exports = auth;