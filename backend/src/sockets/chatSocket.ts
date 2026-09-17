import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a specific squad room (e.g. 3 friends)
    socket.on('join_squad', (squadId: string) => {
      socket.join(squadId);
      console.log(`[Socket.io] Socket ${socket.id} joined squad room ${squadId}`);
    });

    // Leave a squad room
    socket.on('leave_squad', (squadId: string) => {
      socket.leave(squadId);
      console.log(`[Socket.io] Socket ${socket.id} left squad room ${squadId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}
