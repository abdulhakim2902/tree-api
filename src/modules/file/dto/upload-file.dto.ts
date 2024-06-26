import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FileType } from 'src/enums/file-type.enum';

export class UploadFileDto {
  @ApiProperty({ type: String, format: 'binary' })
  file: string;

  @ApiProperty({
    type: String,
    required: true,
    example: '65d40e9a4bf716711a6fae7e',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    type: String,
    required: true,
    example: FileType.USER,
    enum: [FileType.USER, FileType.NODE],
  })
  @IsEnum(FileType)
  @IsNotEmpty()
  @IsString()
  type: FileType;
}
