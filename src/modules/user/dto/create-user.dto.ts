import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'abdulhakim@gmail.com',
  })
  @IsString()
  @IsEmail()
  @MinLength(6)
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'abdulhakim',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'password',
  })
  @MinLength(6)
  @IsString()
  @IsNotEmpty()
  readonly password: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'john doe',
  })
  readonly name: string;
}
