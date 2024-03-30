import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'src/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'abdulhakim@gmail.com',
  })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'abdulhakim',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'password',
  })
  @MinLength(6)
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'john doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: String,
    required: true,
    example: Role.GUEST,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
