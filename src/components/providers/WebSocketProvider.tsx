"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: any;
  emitEvent: (event: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  lastMessage: null,
  emitEvent: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    // Get auth token from session
    const token = (session as any)?.accessToken || (session as any)?.token;
    
    // Initialize WebSocket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: token,
      },
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      
      // Subscribe to packages room
      socketInstance.emit('subscribe:packages');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('message', (data) => {
      console.log('Received message:', data);
      setLastMessage(data);
    });

    socketInstance.on('package:location', (data) => {
      console.log('Package location update:', data);
      setLastMessage({ type: 'package:location', data });
    });

    socketInstance.on('package:update', (data) => {
      console.log('Package update:', data);
      setLastMessage({ type: 'package:update', data });
    });

    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [session]);

  const emitEvent = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const value = {
    socket,
    isConnected,
    lastMessage,
    emitEvent,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

