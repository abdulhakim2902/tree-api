import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { NodeService } from './node.service';
import { CreateNodeDto, UpdateNodeDto } from './dto';
import { CreateParentsDto } from './dto/create-parents.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { Public } from 'src/decorators/public';

@ApiBearerAuth()
@ApiTags(Tag.NODE)
@Controller(Prefix.NODE)
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Public()
  @Get('/search/:name/public')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async searchPublic(
    @Param('name') name: string,
    @Query('tree') tree?: string,
  ) {
    return this.nodeService.search(name, tree, true);
  }

  @Public()
  @Get('/:id/root/public')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async rootPublic(@Param('id') id: string, @Query('tree') tree?: string) {
    return this.nodeService.findRoot(id, tree, true);
  }

  @Public()
  @Get('/search/:name')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async search(@Param('name') name: string, @Query('tree') tree?: string) {
    return this.nodeService.search(name, tree);
  }

  @Public()
  @Get('/families')
  async findFamilies() {
    return this.nodeService.findFamilies();
  }

  @Get('/:id/root')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async root(@Param('id') id: string, @Query('tree') tree?: string) {
    return this.nodeService.findRoot(id, tree);
  }

  @Get('/:id/parents-and-children')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async findParents(@Param('id') id: string, @Query('tree') tree?: string) {
    return this.nodeService.findParentsAndChildren(id, tree);
  }

  @Get('/:id/spouses-and-children')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async findSpousesAndChildren(
    @Param('id') id: string,
    @Query('tree') tree?: string,
  ) {
    return this.nodeService.findSpousesAndChildren(id, tree);
  }

  @Get('/:id/spouses')
  @ApiQuery({ name: 'tree', type: Boolean, required: false })
  async findSpouses(@Param('id') id: string, @Query('tree') tree?: string) {
    return this.nodeService.findSpouses(id, tree);
  }

  @Get('/:id/families')
  async findFamiliesById(@Param('id') id: string) {
    return this.nodeService.findFamiliesById(id);
  }

  @ApiBody({ type: CreateParentsDto, isArray: false })
  @Post('/:id/parents')
  async createParents(@Param('id') id: string, @Body() data: CreateParentsDto) {
    return this.nodeService.createParents(id, data);
  }

  @ApiBody({ type: CreateNodeDto, isArray: true })
  @Post('/:id/spouses')
  async createSpouses(@Param('id') id: string, @Body() data: CreateNodeDto[]) {
    return this.nodeService.createSpouses(id, data);
  }

  @ApiBody({ type: CreateChildDto, isArray: false })
  @Post('/:id/child')
  async child(@Param('id') id: string, @Body() data: CreateChildDto) {
    return this.nodeService.createChild(id, data);
  }

  @ApiBody({ type: CreateNodeDto, isArray: false })
  @Post('/:id/sibling')
  async sibling(@Param('id') id: string, @Body() data: CreateNodeDto) {
    return this.nodeService.createSibling(id, data);
  }

  @ApiBody({ type: UpdateNodeDto, isArray: false })
  @Put('/:id')
  async updateById(@Param('id') id: string, @Body() data: UpdateNodeDto) {
    return this.nodeService.updateById(id, data);
  }
}
