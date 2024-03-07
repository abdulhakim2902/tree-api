import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { CreateNodeDto } from './create-node.dto';
import { Type } from 'class-transformer';

export class CreateParentsDto {
  @ApiProperty({
    type: CreateNodeDto,
    required: true,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateNodeDto)
  father: CreateNodeDto;

  @ApiProperty({
    type: CreateNodeDto,
    required: true,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateNodeDto)
  mother: CreateNodeDto;
}
