import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import routes from './routes';
import { specs } from './config/swagger';
import { xssProtection, mongoSanitize } from './middleware/security';
import path from 'path';

const app: Application = express();

// Security middleware
app.use(helmet());

// Input sanitization middleware
app.use(xssProtection);
app.use(mongoSanitize);

// CORS configuration
import { corsOptions } from './config/cors';

app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply only to API, not auth
app.use('/api/warehouse', limiter);
app.use('/api/admin', limiter);
app.use('/api/customer', limiter);

// Use stricter limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for security
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userId: (req as any).user?._id,
    auth: req.headers.authorization ? 'JWT' : (req.headers['x-api-key'] ? 'API_KEY' : 'NONE'),
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL === '1'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API health check endpoint (alternative)
app.get('/api/health', (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL === '1'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Swagger JSON spec endpoint
app.get('/api-docs', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(specs);
});

// Swagger UI endpoint
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Warehouse Management API Documentation',
  customJs: `
    // Persistent authentication for Swagger UI
    (function() {
      // Storage keys for different auth types
      const STORAGE_KEYS = {
        JWT_TOKEN: 'swagger_jwt_token',
        API_KEY: 'swagger_api_key',
        AUTH_TYPE: 'swagger_auth_type'
      };

      // Save authentication to localStorage
      function saveAuth(authType, token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TYPE, authType);
        if (authType === 'jwt') {
          localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, token);
        } else if (authType === 'apikey') {
          localStorage.setItem(STORAGE_KEYS.API_KEY, token);
        }
      }

      // Load authentication from localStorage
      function loadAuth() {
        const authType = localStorage.getItem(STORAGE_KEYS.AUTH_TYPE);
        const token = authType === 'jwt' 
          ? localStorage.getItem(STORAGE_KEYS.JWT_TOKEN)
          : localStorage.getItem(STORAGE_KEYS.API_KEY);
        return { authType, token };
      }

      // Clear authentication
      function clearAuth() {
        localStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TYPE);
      }

      // Wait for Swagger UI to load
      function initPersistentAuth() {
        if (typeof ui === 'undefined' || !ui.authActions) {
          setTimeout(initPersistentAuth, 100);
          return;
        }

        // Load saved authentication on page load
        const savedAuth = loadAuth();
        if (savedAuth.token) {
          console.log('Restoring authentication from localStorage');
          if (savedAuth.authType === 'jwt') {
            ui.authActions.authorize({
              bearerAuth: new SwaggerUI.BearerAuthSecurityScheme(
                'bearerAuth',
                savedAuth.token
              )
            });
          } else if (savedAuth.authType === 'apikey') {
            ui.authActions.authorize({
              apiKeyAuth: new SwaggerUI.ApiKeyAuthSecurityScheme(
                'apiKeyAuth',
                savedAuth.token
              )
            });
          }
        }

        // Hook into authorization events to save tokens
        const originalAuthorize = ui.authActions.authorize;
        ui.authActions.authorize = function(security) {
          const result = originalAuthorize.call(this, security);
          
          // Save the authorization data
          if (security.bearerAuth) {
            saveAuth('jwt', security.bearerAuth.value);
          } else if (security.apiKeyAuth) {
            saveAuth('apikey', security.apiKeyAuth.value);
          }
          
          return result;
        };

        // Hook into logout events to clear stored tokens
        const originalLogout = ui.authActions.logout;
        ui.authActions.logout = function() {
          clearAuth();
          return originalLogout.call(this);
        };

        // Add custom UI for authentication management
        setTimeout(function() {
          const authContainer = document.querySelector('.swagger-ui .information-container');
          if (authContainer) {
            const authDiv = document.createElement('div');
            authDiv.innerHTML = \`
              <div style="margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">🔐 Authentication Management</h4>
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
                  Tokens are automatically saved and restored across browser sessions.
                </p>
                <button id="clear-auth-btn" style="
                  background: #ff6b6b; 
                  color: white; 
                  border: none; 
                  padding: 5px 10px; 
                  border-radius: 3px; 
                  cursor: pointer;
                  font-size: 12px;
                ">Clear Saved Authentication</button>
              </div>
            \`;
            authContainer.appendChild(authDiv);

            // Add clear button functionality
            document.getElementById('clear-auth-btn').addEventListener('click', function() {
              clearAuth();
              ui.authActions.logout();
              alert('Authentication cleared from localStorage');
              location.reload();
            });
          }
        }, 1000);
      }

      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPersistentAuth);
      } else {
        initPersistentAuth();
      }
    })();
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "none",
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true
  }
}));

// Redirect root to docs
app.get('/', (req: Request, res: Response) => {
  res.redirect('/docs');
});

// Serve Swagger Auth Manager
app.get('/auth-manager', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../scripts/swagger-auth-manager.html'));
});

// API routes
app.use('/api', routes);

// Note: KCD logging middleware is applied in the route handler itself

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      documentation: '/docs',
      health: '/health',
      api: '/api'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;