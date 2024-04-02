import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('RedisClient') private readonly redisClient: Redis) {}

  onModuleDestroy(): void {
    this.redisClient.disconnect();
  }

  async get(prefix: string, key: string): Promise<string | null> {
    return this.redisClient.get(`${prefix}:${key}`);
  }

  async set(
    prefix: string,
    key: string,
    value: string,
    expiry?: number,
  ): Promise<void> {
    if (!expiry) {
      await this.redisClient.set(`${prefix}:${key}`, value);
    } else {
      await this.redisClient.set(`${prefix}:${key}`, value, 'EX', expiry);
    }
  }

  async del(prefix: string, key: string): Promise<void> {
    await this.redisClient.del(`${prefix}:${key}`);
  }
}
