import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/env';
import {logger} from './utils/logger';

const PORT = config.port || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', error);
  process.exit(1);
});

// Connect to database and start server
const startServer = async () => {
  try {
    // ✅ Always attempt connection, even in Vercel (let middleware handle retries)
    await connectDatabase();
    logger.info('MongoDB connected successfully');

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error: Error) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', error);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated!');
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    // Don't exit in Vercel - let serverless handle it
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
  }
};

// Export app for Vercel serverless deployment
export default app;

// Start server only when not in Vercel environment
if (process.env.VERCEL !== '1') {
  startServer();
}