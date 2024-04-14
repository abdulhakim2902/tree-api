import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { NodeService } from '../node/node.service';
import { UserProfile } from 'src/decorators/user-profile';
import { RedisService } from '../redis/redis.service';
import { parse } from 'src/helper/string';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway {
  constructor(
    private readonly nodeService: NodeService,
    private readonly redisService: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  async sendNotification(
    @MessageBody() data: { to: string; count: number; action?: string },
  ) {
    const { to, count, action } = data;

    this.server.emit(`notification:${to}`, { count, action });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('nodes')
  async nodes(
    @UserProfile('id') id: string,
    @MessageBody() data: { nodeId: string; action: 'add' | 'remove' },
  ) {
    try {
      const { nodeId, action } = data;
      const cache = await this.redisService.get('auth', 'active_users');
      const actives = parse<string[]>(cache) ?? [];
      if (action === 'add') {
        const { node, nodes } = await this.nodeService.relatives(nodeId);

        for (const activeId of actives) {
          if (activeId !== id) {
            this.server.emit(`user:${activeId}:node`, { node, nodes, action });
          }
        }
      } else {
        const { node, nodes } = await this.nodeService.relatives(nodeId);
        if (node.deletedAt) {
          for (const activeId of actives) {
            if (activeId !== id) {
              this.server.emit(`user:${activeId}:node`, {
                node,
                nodes,
                action,
              });
            }

            await this.nodeService.hardDeleteById(nodeId);
          }
        }
      }
    } catch {
      // ignore
    }
  }
}
