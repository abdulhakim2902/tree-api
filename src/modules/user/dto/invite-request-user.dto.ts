import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from 'src/enums/role.enum';

export class InviteRequestUserDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'johndoe@mail.com',
  })
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({
    type: Role,
    enum: [Role.GUEST, Role.EDITOR, Role.CONTRIBUTOR],
    required: true,
    example: Role.GUEST,
  })
  @IsEnum(Role)
  readonly role: Role;
}
