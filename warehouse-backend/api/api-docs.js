const { specs } = require('../dist/config/swagger');

module.exports = async (req, res) => {
  try {
    // Set proper headers for JSON response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Send the Swagger specification
    res.status(200).send(specs);
  } catch (error) {
    console.error('Error serving Swagger spec:', error);
    res.status(500).json({ error: 'Failed to load API documentation' });
  }
};
