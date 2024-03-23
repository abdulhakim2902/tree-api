import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ type: String, format: 'binary' })
  file: string;

  @ApiProperty({
    type: String,
    required: true,
    example: '65d40e9a4bf716711a6fae7e',
  })
  @IsNotEmpty()
  nodeId: string;
}
