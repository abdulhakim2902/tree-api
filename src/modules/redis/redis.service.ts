import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { parse } from 'src/helper/string';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('RedisClient') private readonly redisClient: Redis) {}

  onModuleDestroy(): void {
    this.redisClient.disconnect();
  }

  async get<T>(prefix: string, key: string): Promise<T | null> {
    try {
      const result = await this.redisClient.get(`${prefix}:${key}`);
      return parse<T>(result);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async set<T>(
    prefix: string,
    key: string,
    value: T,
    expiry?: number,
  ): Promise<void> {
    try {
      if (!value) {
        throw new Error('Invalid value');
      }

      const str = JSON.stringify(value);
      if (!expiry) {
        await this.redisClient.set(`${prefix}:${key}`, str);
      } else {
        await this.redisClient.set(`${prefix}:${key}`, str, 'EX', expiry);
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
