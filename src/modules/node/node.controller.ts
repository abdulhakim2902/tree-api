import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { NodeService } from './node.service';
import { CreateNodeDto, UpdateNodeDto, UpdateNodeProfileDto } from './dto';
import { CreateParentsDto } from './dto/create-parents.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { NodeRelative } from 'src/interfaces/tree-node.interface';
import { Roles } from 'src/decorators/role';
import { CREATE, DELETE, READ, UPDATE } from 'src/constants/permission';
import { Public } from 'src/decorators/public';

@ApiBearerAuth()
@ApiTags(Tag.NODE)
@Controller(Prefix.NODE)
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Public()
  @Get('/samples')
  async samples() {
    return this.nodeService.samples();
  }

  @Roles(READ)
  @Get('/families')
  async rootFamilies() {
    return this.nodeService.rootFamilies();
  }

  @Roles(READ)
  @Get('/search/:name')
  async search(@Param('name') name: string) {
    return this.nodeService.search(name);
  }

  @Roles(READ)
  @Get('/:id')
  async node(@Param('id') id: string) {
    return this.nodeService.findNode(id);
  }

  @Roles(READ)
  @Get('/:id/root')
  async root(@Param('id') id: string) {
    return this.nodeService.root(id);
  }

  @Roles(READ)
  @Get('/:id/families')
  async families(@Param('id') id: string) {
    return this.nodeService.families(id);
  }

  @Roles(READ)
  @Get('/:id/:relative')
  async relative(
    @Param('id') id: string,
    @Param('relative') relative: NodeRelative,
  ) {
    return this.nodeService.relative(id, relative);
  }

  @ApiBody({ type: CreateParentsDto, isArray: false })
  @Roles(CREATE)
  @Post('/:id/parents')
  async createParents(@Param('id') id: string, @Body() data: CreateParentsDto) {
    return this.nodeService.createNodeRelatives(id, 'parents', data);
  }

  @ApiBody({ type: CreateNodeDto, isArray: true })
  @Roles(CREATE)
  @Post('/:id/spouses')
  async createSpouses(@Param('id') id: string, @Body() data: CreateNodeDto[]) {
    return this.nodeService.createNodeRelatives(id, 'spouses', data);
  }

  @ApiBody({ type: CreateChildDto, isArray: false })
  @Roles(CREATE)
  @Post('/:id/child')
  async createChild(@Param('id') id: string, @Body() data: CreateChildDto) {
    return this.nodeService.createNodeRelatives(id, 'children', data);
  }

  @ApiBody({ type: CreateNodeDto, isArray: false })
  @Roles(CREATE)
  @Post('/:id/sibling')
  async createSibling(@Param('id') id: string, @Body() data: CreateNodeDto) {
    return this.nodeService.createNodeRelatives(id, 'siblings', data);
  }

  @ApiBody({ type: UpdateNodeDto, isArray: false })
  @Roles(UPDATE)
  @Patch('/:id')
  async updateById(@Param('id') id: string, @Body() data: UpdateNodeDto) {
    return this.nodeService.updateNode(id, data);
  }

  @ApiBody({ type: UpdateNodeProfileDto, isArray: false })
  @Roles(UPDATE)
  @Patch('/:id/profile')
  async updateProfileById(
    @Param('id') id: string,
    @Body() data: UpdateNodeProfileDto,
  ) {
    return this.nodeService.updateNodeProfile(id, data);
  }

  @Delete('/:id')
  @Roles(DELETE)
  async deleteById(@Param('id') id: string) {
    return this.nodeService.deleteNode(id);
  }
}
