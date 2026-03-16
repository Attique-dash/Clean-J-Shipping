import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import {
  generateKCDApiKey,
  listApiKeys,
  deactivateApiKey,
  activateApiKey,
  deleteApiKey,
  getKCDConnectionInfo,
} from '../../controllers/admin/kcdApiKeyController';

const router = Router();

// All routes here require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

/**
 * POST /api/admin/api-keys/kcd
 * Generate a new KCD API key
 */
router.post('/kcd', 
  asyncHandler(generateKCDApiKey)
);

/**
 * POST /api/admin/api-keys/generate
 * Generate a new KCD API key (alias for /kcd)
 */
router.post('/generate', 
  asyncHandler(generateKCDApiKey)
);

/**
 * GET /api/admin/api-keys
 * List all API keys (matches Swagger spec)
 */
router.get('/', 
  asyncHandler(listApiKeys)
);

/**
 * GET /api/admin/api-keys/list
 * List all API keys (alias for backward compatibility)
 */
router.get('/list', 
  asyncHandler(listApiKeys)
);

/**
 * GET /api/admin/api-keys/kcd-info
 * Get KCD connection information
 */
router.get('/kcd-info', 
  asyncHandler(getKCDConnectionInfo)
);

/**
 * GET /api/admin/api-keys/info
 * Get KCD connection information (alias for backward compatibility)
 */
router.get('/info', 
  asyncHandler(getKCDConnectionInfo)
);

/**
 * PUT /api/admin/api-keys/:keyId/deactivate
 * Deactivate an API key
 */
router.put('/:keyId/deactivate', 
  asyncHandler(deactivateApiKey)
);

/**
 * PUT /api/admin/api-keys/:keyId/activate
 * Activate an API key
 */
router.put('/:keyId/activate', 
  asyncHandler(activateApiKey)
);

/**
 * DELETE /api/admin/api-keys/:keyId
 * Delete an API key
 */
router.delete('/:keyId', 
  asyncHandler(deleteApiKey)
);

export default router;