import { Router } from 'express';

const router = Router();

// Debug endpoint to check KCD_API_KEY status
router.get('/kcd-env-check', (req, res) => {
  const kcdApiKey = process.env.KCD_API_KEY;
  
  res.json({
    kcdApiKeyExists: !!kcdApiKey,
    kcdApiKeyLength: kcdApiKey ? kcdApiKey.length : 0,
    kcdApiKeyPrefix: kcdApiKey ? kcdApiKey.substring(0, 10) + '...' : null,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default router;
