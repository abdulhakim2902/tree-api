import { ApiProperty } from '@nestjs/swagger';

export class CreateFileDto {
  @ApiProperty({
    type: String,
    required: true,
  })
  publicId: string;

  @ApiProperty({
    type: String,
    required: true,
  })
  assetId: string;

  @ApiProperty({
    type: String,
    required: true,
  })
  url: string;
}
