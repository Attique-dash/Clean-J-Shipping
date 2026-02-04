import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validateCreateMessage, validateMongoId, validatePagination } from '../../utils/validators';
import { asyncHandler } from '../../middleware/errorHandler';
import * as messageController from '../../controllers/warehouse/messageController';

const router = Router();

// All message routes require authentication
router.use(authenticate);

// Message CRUD operations
router.get('/', validatePagination, asyncHandler(messageController.getMessages));
router.get('/:id', validateMongoId, asyncHandler(messageController.getMessageById));
router.post('/', validateCreateMessage, asyncHandler(messageController.createMessage));
router.put('/:id', validateMongoId, asyncHandler(messageController.updateMessage));
router.delete('/:id', validateMongoId, asyncHandler(messageController.deleteMessage));

// Message operations
router.patch('/:id/read', validateMongoId, asyncHandler(messageController.markAsRead));
router.post('/:id/reply', validateMongoId, asyncHandler(messageController.replyToMessage));

export default router;
