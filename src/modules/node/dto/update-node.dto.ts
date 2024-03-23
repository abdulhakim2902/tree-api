import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Gender } from 'src/enums/gender.enum';
import { CreateBirthDto, CreateNameDto } from './create-node.dto';
import { Type } from 'class-transformer';

export class UpdateNodeDto {
  @ApiProperty({
    type: CreateNameDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => CreateNameDto)
  @IsOptional()
  readonly name: Omit<CreateNameDto, 'nicknames'>;

  @ApiProperty({
    type: Gender,
    enum: [Gender.MALE, Gender.FEMALE],
    required: false,
    example: Gender.MALE,
  })
  @IsString()
  @IsEnum(Gender)
  @IsOptional()
  readonly gender: Gender;

  @ApiProperty({
    type: CreateBirthDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBirthDto)
  readonly birth: CreateBirthDto;
}

export class UpdateNodeProfileDto {
  @ApiProperty({
    type: String,
    required: true,
    example: '65d40e9a4bf716711a6fae7e',
  })
  readonly fileId: string;
}
