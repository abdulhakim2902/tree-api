import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { NodeService } from './node.service';
import { CreateNodeDto, UpdateNodeDto, UpdateNodeProfileDto } from './dto';
import { CreateParentsDto } from './dto/create-parents.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { Request as Req } from 'src/interfaces/request.interface';
import { NodeRelative } from 'src/interfaces/tree-node.interface';
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';

@ApiBearerAuth()
@ApiTags(Tag.NODE)
@Controller(Prefix.NODE)
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Get('/families')
  async rootFamilies(@Request() req: Req) {
    return this.nodeService.rootFamilies(!Boolean(req?.user));
  }

  @Get('/search/:name')
  async search(@Param('name') name: string, @Request() req: Req) {
    return this.nodeService.search(name, !Boolean(req?.user));
  }

  @Get('/:id/root')
  async root(@Param('id') id: string, @Request() req: Req) {
    return this.nodeService.root(id, !Boolean(req?.user));
  }

  @Get('/:id/families')
  @Roles([Role.GUEST, Role.CONTRIBUTOR, Role.EDITOR])
  async families(@Param('id') id: string) {
    return this.nodeService.families(id);
  }

  @Get('/:id/:relative')
  @Roles([Role.GUEST, Role.CONTRIBUTOR, Role.EDITOR])
  async relative(
    @Param('id') id: string,
    @Param('relative') relative: NodeRelative,
  ) {
    return this.nodeService.relative(id, relative);
  }

  @ApiBody({ type: CreateParentsDto, isArray: false })
  @Roles([Role.EDITOR])
  @Post('/:id/parents')
  async createParents(@Param('id') id: string, @Body() data: CreateParentsDto) {
    return this.nodeService.createParents(id, data);
  }

  @ApiBody({ type: CreateNodeDto, isArray: true })
  @Roles([Role.EDITOR])
  @Post('/:id/spouses')
  async createSpouses(@Param('id') id: string, @Body() data: CreateNodeDto[]) {
    return this.nodeService.createSpouses(id, data);
  }

  @ApiBody({ type: CreateChildDto, isArray: false })
  @Roles([Role.EDITOR])
  @Post('/:id/child')
  async createChild(@Param('id') id: string, @Body() data: CreateChildDto) {
    return this.nodeService.createChild(id, data);
  }

  @ApiBody({ type: CreateNodeDto, isArray: false })
  @Roles([Role.EDITOR])
  @Post('/:id/sibling')
  async createSibling(@Param('id') id: string, @Body() data: CreateNodeDto) {
    return this.nodeService.createSibling(id, data);
  }

  @ApiBody({ type: UpdateNodeDto, isArray: false })
  @Roles([Role.CONTRIBUTOR, Role.EDITOR])
  @Patch('/:id')
  async updateById(@Param('id') id: string, @Body() data: UpdateNodeDto) {
    return this.nodeService.updateById(id, data);
  }

  @Delete('/:id')
  @Roles([Role.EDITOR])
  async deleteById(@Param('id') id: string) {
    return this.nodeService.deleteById(id);
  }

  @ApiBody({ type: UpdateNodeProfileDto, isArray: false })
  @Roles([Role.CONTRIBUTOR, Role.EDITOR])
  @Patch('/:id/profile')
  async updateProfileById(
    @Param('id') id: string,
    @Body() data: UpdateNodeProfileDto,
  ) {
    return this.nodeService.updateProfileById(id, data);
  }
}
