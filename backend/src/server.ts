import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './environments';
import logger from './helpers/logger';
import { connectDB } from './core/config/database';
import { startEventListeners } from './core/services/eventListener';
import { errorHandler, notFoundHandler } from './middlewares';

// Import routes
import assetsRoutes from './modules/assets/routes';
import usersRoutes from './modules/users/routes';
import complianceRoutes from './modules/compliance/routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/assets', assetsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/compliance', complianceRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    await startEventListeners();
    logger.info('Event listeners started');

    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;

