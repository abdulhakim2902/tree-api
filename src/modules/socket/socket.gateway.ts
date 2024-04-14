import {
  MessageBody,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  async sendNotification(
    @MessageBody() data: { to: string; count: number; action?: string },
  ) {
    const { to, count, action } = data;

    this.server.emit(`notification:${to}`, { count, action });
  }
}
