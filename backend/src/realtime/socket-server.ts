import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt.js';

let socketManager: SocketManager | null = null;

export class SocketManager {
  private io: SocketServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
    });

    // JWT authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth['token'] as string | undefined;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const payload = verifyAccessToken(token);
        socket.data['user'] = payload;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      // Join terminal room
      socket.on('terminal:join', (terminalId: string) => {
        socket.join(`terminal:${terminalId}`);
      });

      // Leave terminal room
      socket.on('terminal:leave', (terminalId: string) => {
        socket.leave(`terminal:${terminalId}`);
      });
    });
  }

  emitToTerminal(terminalId: string, event: string, payload: unknown): void {
    this.io.to(`terminal:${terminalId}`).emit(event, payload);
  }

  getIO(): SocketServer {
    return this.io;
  }
}

export function initSocketManager(httpServer: HttpServer): SocketManager {
  socketManager = new SocketManager(httpServer);
  return socketManager;
}

export function getSocketManager(): SocketManager | null {
  return socketManager;
}
