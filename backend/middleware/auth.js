const crypto = require('crypto');

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

  if (validApiKeys.length === 0) {
    global.logger.warn('No API keys configured, allowing request');
    return next();
  }

  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const isValid = validApiKeys.some(key => {
    const hashedValidKey = crypto.createHash('sha256').update(key.trim()).digest('hex');
    return hashedKey === hashedValidKey;
  });

  if (!isValid) {
    global.logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

// Generate new API key
const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  authenticateApiKey,
  generateApiKey
};
