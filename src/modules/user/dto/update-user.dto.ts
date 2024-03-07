import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
    type: String,
    required: false,
    example: 'password',
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password: string;
}
