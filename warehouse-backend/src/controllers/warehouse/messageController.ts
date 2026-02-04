import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Message } from '../../models/Message';
import { successResponse, errorResponse, getPaginationData } from '../../utils/helpers';
import { PAGINATION } from '../../utils/constants';
import { logger } from '../../utils/logger';

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';

    const messages = await Message.find(filter)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(filter);

    successResponse(res, {
      messages,
      pagination: getPaginationData(page, limit, total)
    });
  } catch (error) {
    logger.error('Error getting messages:', error);
    errorResponse(res, 'Failed to get messages');
  }
};

export const getMessageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .populate('replyTo');

    if (!message) {
      errorResponse(res, 'Message not found', 404);
      return;
    }

    successResponse(res, message);
  } catch (error) {
    logger.error('Error getting message:', error);
    errorResponse(res, 'Failed to get message');
  }
};

export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messageData = {
      ...req.body,
      senderId: req.user._id
    };

    const message = await Message.create(messageData);
    await message.populate('senderId recipientId', 'name email');

    logger.info(`Message created: ${message._id}`);
    successResponse(res, message, 'Message created successfully', 201);
  } catch (error) {
    logger.error('Error creating message:', error);
    errorResponse(res, 'Failed to create message');
  }
};

export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('senderId recipientId', 'name email');

    if (!message) {
      errorResponse(res, 'Message not found', 404);
      return;
    }

    logger.info(`Message updated: ${message._id}`);
    successResponse(res, message, 'Message updated successfully');
  } catch (error) {
    logger.error('Error updating message:', error);
    errorResponse(res, 'Failed to update message');
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      errorResponse(res, 'Message not found', 404);
      return;
    }

    logger.info(`Message deleted: ${message._id}`);
    successResponse(res, null, 'Message deleted successfully');
  } catch (error) {
    logger.error('Error deleting message:', error);
    errorResponse(res, 'Failed to delete message');
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    ).populate('senderId recipientId', 'name email');

    if (!message) {
      errorResponse(res, 'Message not found', 404);
      return;
    }

    successResponse(res, message, 'Message marked as read');
  } catch (error) {
    logger.error('Error marking message as read:', error);
    errorResponse(res, 'Failed to mark message as read');
  }
};

export const replyToMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;

    const originalMessage = await Message.findById(req.params.id);
    if (!originalMessage) {
      errorResponse(res, 'Original message not found', 404);
      return;
    }

    const replyData = {
      senderId: req.user._id,
      recipientId: originalMessage.senderId,
      content,
      replyTo: originalMessage._id,
      type: originalMessage.type
    };

    const reply = await Message.create(replyData);
    await reply.populate('senderId recipientId', 'name email');

    logger.info(`Reply created: ${reply._id}`);
    successResponse(res, reply, 'Reply created successfully', 201);
  } catch (error) {
    logger.error('Error creating reply:', error);
    errorResponse(res, 'Failed to create reply');
  }
};
