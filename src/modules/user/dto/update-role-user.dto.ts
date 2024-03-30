import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({
    type: String,
    required: true,
  })
  token: string;
}
