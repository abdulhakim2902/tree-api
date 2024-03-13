import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Gender } from 'src/enums/gender.enum';

export class CreateNameDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'muhammad',
  })
  @IsString()
  @MinLength(1)
  @IsNotEmpty()
  readonly first: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'abdul Hakim',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  readonly middle: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'shibghatallah',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  readonly last: string;

  @ApiProperty({
    type: String,
    isArray: true,
    required: false,
    example: ['hakim'],
  })
  @IsString({ each: true })
  @IsOptional()
  readonly nicknames: string[];
}

export class CreateBirthPlaceDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'jakarta',
  })
  @IsString()
  @IsOptional()
  readonly city: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'indonesia',
  })
  @IsString()
  @IsOptional()
  readonly country: string;
}

export class CreateBirthDto {
  @ApiProperty({
    type: Number,
    required: true,
    example: 1989,
  })
  @IsInt()
  @IsNumber()
  @IsOptional()
  readonly year: number;

  @ApiProperty({
    type: Number,
    required: true,
    example: 10,
  })
  @Max(12)
  @IsInt()
  @IsNumber()
  @IsOptional()
  readonly month: number;

  @ApiProperty({
    type: Number,
    required: true,
    example: 1,
  })
  @Max(31)
  @IsInt()
  @IsNumber()
  @IsOptional()
  readonly day: number;

  @ApiProperty({
    type: CreateBirthPlaceDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => CreateBirthPlaceDto)
  @IsOptional()
  readonly place: CreateBirthPlaceDto;
}

export class CreateNodeDto {
  @ApiProperty({
    type: CreateNameDto,
    required: true,
  })
  @ValidateNested()
  @Type(() => CreateNameDto)
  @IsNotEmpty()
  readonly name: CreateNameDto;

  @ApiProperty({
    type: Gender,
    enum: [Gender.MALE, Gender.FEMALE],
    required: true,
    example: Gender.MALE,
  })
  @IsString()
  @IsEnum(Gender)
  @IsNotEmpty()
  readonly gender: Gender;

  @ApiProperty({
    type: CreateBirthDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => CreateBirthDto)
  @IsOptional()
  readonly birth: CreateBirthDto;
}
