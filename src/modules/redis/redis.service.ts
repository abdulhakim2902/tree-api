import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('RedisClient') private readonly redisClient: Redis) {}

  onModuleDestroy(): void {
    this.redisClient.disconnect();
  }

  async get(prefix: string, key: string): Promise<string | null> {
    try {
      const result = await this.redisClient.get(`${prefix}:${key}`);
      return result;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async set(
    prefix: string,
    key: string,
    value: string,
    expiry?: number,
  ): Promise<void> {
    try {
      if (!expiry) {
        await this.redisClient.set(`${prefix}:${key}`, value);
      } else {
        await this.redisClient.set(`${prefix}:${key}`, value, 'EX', expiry);
      }
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async del(prefix: string, key: string): Promise<void> {
    try {
      await this.redisClient.del(`${prefix}:${key}`);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
