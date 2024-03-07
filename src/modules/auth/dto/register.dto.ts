import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { CreateNodeDto } from 'src/modules/node/dto';
import { CreateUserDto } from 'src/modules/user/dto';

export class RegisterDto extends CreateUserDto {
  @ApiProperty({
    type: CreateNodeDto,
    required: true,
  })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => CreateNodeDto)
  profile: CreateNodeDto;
}
