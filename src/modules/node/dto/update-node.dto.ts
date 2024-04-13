import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Gender } from 'src/enums/gender.enum';
import { CreateBirthDto, CreateNameDto } from './create-node.dto';
import { Type } from 'class-transformer';

export class UpdateNodeNicknameDto {
  @ApiProperty({
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly selected: boolean;
}

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
    type: UpdateNodeNicknameDto,
    isArray: true,
  })
  @IsOptional()
  readonly nicknames: UpdateNodeNicknameDto[];

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

  @ApiProperty({
    type: CreateBirthDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBirthDto)
  readonly death: CreateBirthDto;
}

export class UpdateNodeProfileDto {
  @ApiProperty({
    type: String,
    example: '65d40e9a4bf716711a6fae7e',
  })
  @IsOptional()
  readonly fileId: string;
}
