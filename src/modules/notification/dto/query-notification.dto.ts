import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

enum Read {
  TRUE = 'true',
  FALSE = 'false',
}

export class QueryNotificationDto {
  @ApiProperty({
    type: String,
    required: false,
    example: 'false',
    enum: Read,
  })
  @IsString()
  @IsEnum(Read)
  @IsOptional()
  readonly read: string;
}
