import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteNodeRequestDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  readonly nodeId: string;

  @ApiProperty({ type: String, required: false })
  @IsString()
  @IsOptional()
  readonly reason: string;
}
