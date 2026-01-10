// src/pages/api/socket.ts
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  // @ts-expect-error - NextApiResponse.socket is not in types but exists at runtime
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io');
    
    // @ts-expect-error - NextApiResponse.socket is not in types but exists at runtime
    const io = new Server(res.socket.server, {
      path: '/api/socket',
    });

    io.on('connection', (socket) => {
      console.log('Client connected');
      
      // Example: Handle real-time events
      socket.on('refresh_stats', (data) => {
        console.log('Refresh stats requested', data);
        // Broadcast to all clients that stats should be refreshed
        io.emit('stats_updated', { timestamp: new Date().toISOString() });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    // @ts-expect-error - NextApiResponse.socket is not in types but exists at runtime
    res.socket.server.io = io;
  } else {
    console.log('Socket.io already running');
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;