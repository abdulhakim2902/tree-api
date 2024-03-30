import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
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
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  readonly token: string;
}
