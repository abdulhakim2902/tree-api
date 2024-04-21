import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  current: string;

  @ApiProperty({
    type: String,
    required: true,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  new: string;
}

export class UpdateUserDto {
  @ApiProperty({
    type: String,
    required: false,
    example: 'abdulhakim@gmail.com',
  })
  @IsString()
  @IsEmail()
  @MinLength(6)
  @IsOptional()
  email: string;

  @ApiProperty({
    type: UpdatePasswordDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => UpdatePasswordDto)
  @IsOptional()
  password: UpdatePasswordDto;

  @ApiProperty({
    type: String,
    required: false,
    example: 'john doe',
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    type: String,
    required: false,
    example: '65e1db14709176c98629fe9c',
  })
  @IsString()
  @IsOptional()
  profileImage: string;
}
