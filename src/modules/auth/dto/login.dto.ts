import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'abdulhakim',
    description: 'email can also be used as username',
  })
  @IsString()
  @MinLength(1)
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'password',
  })
  @IsString()
  @MinLength(1)
  @IsNotEmpty()
  readonly password: string;
}
