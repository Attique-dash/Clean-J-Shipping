// my-app/src/lib/websocket-server.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verify } from 'jsonwebtoken';

export interface WebSocketMessage {
  type: 'package_update' | 'payment_received' | 'alert' | 'broadcast';
  data: any;
  timestamp: Date;
}

class WebSocketManager {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/api/socket',
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        socket.data.userId = decoded._id || decoded.id;
        socket.data.role = decoded.role;
        socket.data.email = decoded.email;
        
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      console.log(`Client connected: ${socket.id} (User: ${userId})`);

      // Track connected clients
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)?.add(socket.id);

      // Join user-specific room
      socket.join(`user:${userId}`);
      
      // Join role-specific room
      if (socket.data.role === 'admin') {
        socket.join('admin');
      }

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.get(userId)?.delete(socket.id);
        if (this.connectedClients.get(userId)?.size === 0) {
          this.connectedClients.delete(userId);
        }
      });

      // Handle custom events
      socket.on('subscribe:packages', (data) => {
        socket.join('packages');
      });

      socket.on('subscribe:transactions', () => {
        socket.join('transactions');
      });

      socket.on('track:package', (data: { trackingNumber: string }) => {
        // Join room for specific package tracking
        socket.join(`package:${data.trackingNumber}`);
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });

    console.log('WebSocket server initialized');
  }

  /**
   * Broadcast to all admin users
   */
  broadcastToAdmins(message: WebSocketMessage) {
    if (!this.io) return;
    this.io.to('admin').emit('message', message);
  }

  /**
   * Send to specific user
   */
  sendToUser(userId: string, message: WebSocketMessage) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('message', message);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(message: WebSocketMessage) {
    if (!this.io) return;
    this.io.emit('message', message);
  }

  /**
   * Send to specific room
   */
  sendToRoom(room: string, message: WebSocketMessage) {
    if (!this.io) return;
    this.io.to(room).emit('message', message);
  }

  /**
   * Package status update notification
   */
  notifyPackageUpdate(data: {
    trackingNumber: string;
    userId?: string;
    status: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }) {
    const message: WebSocketMessage = {
      type: 'package_update',
      data: {
        ...data,
        location: data.location ? {
          address: data.address || data.location,
          latitude: data.latitude,
          longitude: data.longitude,
        } : undefined,
      },
      timestamp: new Date(),
    };

    // Notify admins
    this.broadcastToAdmins(message);

    // Notify specific user if provided
    if (data.userId) {
      this.sendToUser(data.userId, message);
    }

    // Notify packages room
    this.sendToRoom('packages', message);
    
    // Notify package-specific room
    this.sendToRoom(`package:${data.trackingNumber}`, message);
    
    // Also emit location update event
    if (data.latitude && data.longitude) {
      const locationMessage: WebSocketMessage = {
        type: 'package_update',
        data: {
          trackingNumber: data.trackingNumber,
          status: data.status,
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address || data.location,
            timestamp: new Date(),
          },
        },
        timestamp: new Date(),
      };
      this.sendToRoom(`package:${data.trackingNumber}`, locationMessage);
      if (data.userId) {
        this.sendToUser(data.userId, locationMessage);
      }
    }
  }

  /**
   * Payment received notification
   */
  notifyPaymentReceived(data: {
    userId: string;
    amount: number;
    transactionId: string;
  }) {
    const message: WebSocketMessage = {
      type: 'payment_received',
      data,
      timestamp: new Date(),
    };

    this.broadcastToAdmins(message);
    this.sendToUser(data.userId, message);
    this.sendToRoom('transactions', message);
  }

  /**
   * Send alert notification
   */
  sendAlert(data: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    userId?: string;
  }) {
    const message: WebSocketMessage = {
      type: 'alert',
      data,
      timestamp: new Date(),
    };

    if (data.userId) {
      this.sendToUser(data.userId, message);
    } else {
      this.broadcastToAdmins(message);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedClients.has(userId) && 
           (this.connectedClients.get(userId)?.size || 0) > 0;
  }
}

export const wsManager = new WebSocketManager();