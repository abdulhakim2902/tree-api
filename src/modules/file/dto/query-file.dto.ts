import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileType } from 'src/enums/file-type.enum';

export class QueryFileDto {
  @ApiProperty({
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  id: string;

  @ApiProperty({
    type: String,
    required: false,
    example: FileType.USER,
    enum: [FileType.USER, FileType.NODE],
  })
  @IsEnum(FileType)
  @IsOptional()
  @IsString()
  type: FileType;
}
