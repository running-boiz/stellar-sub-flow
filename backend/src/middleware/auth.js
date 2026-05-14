const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory blocklist for invalidated access tokens
const tokenBlocklist = new Set();

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (tokenBlocklist.has(token)) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lazy-require to avoid circular dependency; blocklist lives in auth routes
    const { tokenBlocklist } = require('../routes/auth');
    if (decoded.jti && tokenBlocklist.has(decoded.jti)) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    req.tokenJti = decoded.jti;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
module.exports.tokenBlocklist = tokenBlocklist;
