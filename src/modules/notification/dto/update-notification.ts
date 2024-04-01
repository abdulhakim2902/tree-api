import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationDto {
  @ApiProperty({
    type: Boolean,
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly action: boolean;
}
