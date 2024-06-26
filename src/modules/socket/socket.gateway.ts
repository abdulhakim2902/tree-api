import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { TreeNode } from 'src/interfaces/tree-node.interface';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway {
  constructor(private readonly redisService: RedisService) {}

  @WebSocketServer()
  server: Server;

  async sendNotification(to: string, count: number, action?: string) {
    this.server.emit(`notification:${to}`, { count, action });
  }

  async sendNode(id: string, nodes: TreeNode[], action: 'add' | 'remove') {
    const [prefix, key] = ['auth', 'active_users'];
    const actives = await this.redisService
      .get<string[]>(prefix, key)
      .then((res) => res ?? []);

    for (const activeId of actives) {
      this.server.emit(`user:${activeId}:node:${action}`, { id, nodes });
    }
  }
}
