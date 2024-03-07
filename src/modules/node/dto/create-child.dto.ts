import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { CreateNodeDto } from './create-node.dto';
import { Type } from 'class-transformer';

export class CreateChildDto {
  @ApiProperty({
    type: String,
    required: true,
    example: '65d40e9a4bf716711a6fae7e',
  })
  @IsString()
  @IsNotEmpty()
  readonly spouseId: string;

  @ApiProperty({
    type: CreateNodeDto,
    required: true,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateNodeDto)
  readonly child: CreateNodeDto;
}
