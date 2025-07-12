import express from 'express';
import cors from 'cors';
import { createServer, IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { getDatabase, closeDatabase } from './database/schema';
import { createTables } from './database/schema';
import { URL } from 'url';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import swapsRoutes from './routes/swaps.routes.js';
import ratingsRoutes from './routes/ratings.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

// Store WebSocket connections with user IDs
const clients = new Map<string, WebSocket>();

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Configure WebSocket server
wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const handleError = (error: unknown, message: string) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${message}: ${errorMessage}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1011, 'Internal server error');
    }
  };

  // Set up ping/pong to detect stale connections
  let isAlive = true;
  const pingInterval = setInterval(() => {
    if (isAlive === false) {
      console.log('Terminating stale connection');
      return ws.terminate();
    }
    
    isAlive = false;
    ws.ping(() => {});
  }, 30000); // 30 seconds

  ws.on('pong', () => {
    isAlive = true;
  });

  try {
    // Ensure we have a URL to parse
    if (!req.url) {
      ws.close(4000, 'Invalid URL');
      return;
    }
    
    const { searchParams } = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const userId = searchParams.get('userId');

    if (!userId) {
      ws.close(4000, 'User ID is required');
      return;
    }

    // Remove any existing connection for this user
    const existingConnection = clients.get(userId);
    if (existingConnection) {
      console.log(`Closing existing connection for user ${userId}`);
      existingConnection.close(1000, 'New connection established');
    }

    // Store the WebSocket connection with the user ID
    clients.set(userId, ws);
    console.log(`User ${userId} connected`);
    
    // Handle client disconnection
    const handleClose = () => {
      clearInterval(pingInterval);
      // Only remove if this is still the current connection
      if (clients.get(userId) === ws) {
        clients.delete(userId);
      }
      console.log(`User ${userId} disconnected`);
    };

    ws.on('close', handleClose);
    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      handleClose();
    });

    // Handle incoming messages
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received:', data);
        
        // Handle different message types
        if (data && typeof data === 'object' && 'type' in data) {
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ 
                type: 'pong', 
                timestamp: Date.now() 
              }));
              break;
            // Add more message types as needed
            default:
              console.warn(`Unknown message type: ${data.type}`);
          }
        } else {
          console.warn('Received invalid message format:', data);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing message from user ${userId}:`, errorMessage);
        
        // Send error response to client if connection is still open
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
            error: errorMessage
          }));
        }
      }
    });

  } catch (error) {
    handleError(error as Error, 'Error handling WebSocket connection:');
  }
});

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add database to request object
declare global {
  namespace Express {
    interface Request {
      db: Awaited<ReturnType<typeof getDatabase>>;
    }
  }
}

// Database middleware
app.use(async (req, res, next) => {
  try {
    const db = await getDatabase();
    req.db = db;
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/swaps', swapsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDatabase();
    // Simple query to verify database connection
    await db.get('SELECT 1 as test');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'Connected',
      clients: 0
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'Error',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error?.message || 'Unknown error occurred'
    });
  }
});

// Function to broadcast notifications to a specific user
export function broadcastNotification(userId: string, notification: any) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
  }
}

// Function to broadcast to all connected clients
export function broadcastToAll(notification: any) {
  const message = JSON.stringify(notification);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection and create tables
    const db = await getDatabase();
    await createTables(db);
    console.log('✅ Database initialized and tables created');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Failed to start server:', errorMessage);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
};

// Start the server
startServer().catch((error: Error) => {
  console.error('Fatal error in server startup:', error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log('Shutting down gracefully...');
  
  try {
    // Close all WebSocket connections
    console.log('Closing WebSocket connections...');
    const closePromises: Promise<void>[] = [];
    
    clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        closePromises.push(new Promise<void>((resolve) => {
          client.once('close', () => {
            console.log(`Closed WebSocket connection for user ${userId}`);
            resolve();
          });
          client.close(1001, 'Server shutting down'); // Close with status code 1001 (going away)
        }));
      }
    });
    
    // Wait for all WebSocket connections to close
    await Promise.all(closePromises);
    
    // Close database connection
    console.log('Closing database connection...');
    await closeDatabase();
    console.log('Database connection closed successfully');
    
    // Close HTTP server
    console.log('Closing HTTP server...');
    await new Promise<void>((resolve) => {
      server.close((error) => {
        if (error) {
          console.error('Error closing HTTP server:', error);
        } else {
          console.log('HTTP server closed');
        }
        resolve();
      });
    });
    
    console.log('Server shut down successfully');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during shutdown';
    console.error('Error during shutdown:', errorMessage);
    process.exit(1);
  }
};

// Handle process termination signals
const handleSignal = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  shutdown().catch((error: Error) => {
    console.error('Error during shutdown:', error);
    process.exit(1);
  });
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error('Unhandled Rejection:', error);
  // Consider logging to an external service here
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Consider logging to an external service here
  process.exit(1);
});

// 404 handler for unmatched routes
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorDetails: Record<string, unknown> | undefined;

  // Handle different types of errors
  if (err instanceof Error) {
    message = err.message;
    
    // Include error details in development
    if (process.env.NODE_ENV === 'development') {
      errorDetails = {
        name: err.name,
        message: err.message,
        ...(err.stack && { stack: err.stack })
      };
    }
    
    // Handle specific error types
    if ('status' in err && typeof (err as { status?: unknown }).status === 'number') {
      statusCode = (err as { status: number }).status;
    } else if ('statusCode' in err && typeof (err as { statusCode?: unknown }).statusCode === 'number') {
      statusCode = (err as { statusCode: number }).statusCode;
    }
  } else if (typeof err === 'string') {
    message = err;
  }

  // Log the error
  console.error(`[${new Date().toISOString()}] Error:`, err);

  // Prepare error response
  const errorResponse: Record<string, unknown> = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };

  // Add error details if available
  if (errorDetails) {
    errorResponse.error = errorDetails;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
});

// Export WebSocket server and clients for use in other modules
export { wss, clients };