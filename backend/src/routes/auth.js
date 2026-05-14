const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const auth = require('../middleware/auth');
const { tokenBlocklist } = require('../middleware/auth');
const router = express.Router();

// In-memory blocklist for invalidated access tokens (jti-based)
const tokenBlocklist = new Set();

const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const generateAccessToken = (userId) => {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ userId, jti }, process.env.JWT_SECRET, { expiresIn: '15m' });
  return { token, jti };
};

const issueRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await RefreshToken.create({ token, userId, expiresAt });
  return token;
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: '/api/auth',
  });
};

// Export blocklist so auth middleware can check it
module.exports.tokenBlocklist = tokenBlocklist;

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ email, password, firstName, lastName });
    await user.save();

    const { token } = generateAccessToken(user._id);
    const refreshToken = await issueRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    const { token } = generateAccessToken(user._id);
    const refreshToken = await issueRefreshToken(user._id);
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', auth, async (req, res) => {
  try {
    // Blocklist the current access token by its jti
    if (req.tokenJti) {
      tokenBlocklist.add(req.tokenJti);
    }

    // Revoke the refresh token from the cookie
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await RefreshToken.updateOne({ token: refreshToken }, { revoked: true });
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(stored.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Rotate refresh token
    await RefreshToken.updateOne({ token: refreshToken }, { revoked: true });
    const newRefreshToken = await issueRefreshToken(user._id);
    setRefreshCookie(res, newRefreshToken);

    const { token } = generateAccessToken(user._id);
    res.json({ token });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        stripeCustomerId: req.user.stripeCustomerId,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout — invalidate access token and refresh token
router.post('/logout', auth, (req, res) => {
  const accessToken = req.header('Authorization')?.replace('Bearer ', '');
  if (accessToken) {
    tokenBlocklist.add(accessToken);
  }

  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    refreshTokenStore.delete(refreshToken);
  }

  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/refresh — issue new access token from refresh token cookie
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken || !refreshTokenStore.has(refreshToken)) {
    return res.status(401).json({ message: 'Invalid or missing refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
    const newAccessToken = generateAccessToken(decoded.userId);
    res.json({ token: newAccessToken });
  } catch (error) {
    refreshTokenStore.delete(refreshToken);
    res.clearCookie('refreshToken');
    res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
});

module.exports = router;
module.exports.refreshTokenStore = refreshTokenStore;
