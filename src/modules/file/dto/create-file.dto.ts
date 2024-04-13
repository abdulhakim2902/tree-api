import { ApiProperty } from '@nestjs/swagger';
import { FileType } from 'src/enums/file-type.enum';

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

  @ApiProperty({
    type: String,
    required: true,
  })
  type: FileType;
}
