import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  CreateNodeDto,
  CreateParentsDto,
  CreateChildDto,
  UpdateNodeDto,
} from './dto';
import { Node } from 'src/modules/node/schemas/node.schema';
import { NodeRepository } from 'src/modules/node/node.repository';
import { RelationType, SpouseRelationType } from 'src/enums/relation-type.enum';
import { NodeRelation } from './schemas/node.relation.schema';
import { intersectionWith } from 'lodash';
import { NodeFamily } from './schemas/node.family.schema';
import { PipelineStage } from 'mongoose';

@Injectable()
export class NodeService {
  constructor(private readonly nodeRepository: NodeRepository) {}

  async createNode(data: CreateNodeDto): Promise<Node> {
    return this.nodeRepository.insert(data);
  }

  async updateById(id: string, data: UpdateNodeDto): Promise<Node> {
    const node = await this.nodeRepository.findById(id);
    if (node.gender !== data.gender && node.spouses.length > 0) {
      throw new UnprocessableEntityException('Gender cannot be changed');
    }

    if (data.name) {
      node.name.first = data.name.first;
      node.name.middle = data.name.middle;
      node.name.last = data.name.last;
    }

    if (data.birth) {
      Object.assign(node.birth, data.birth);
    }

    const updated = await node.save();

    const filter = { 'families.id': id };
    const update = { $set: { 'families.$.name': updated.fullname } };

    await this.nodeRepository.updateMany(filter, update);

    return updated;
  }

  async deleteById(id: string) {
    // TODO: relation check
    const node = await this.nodeRepository.findById(id);
    if (node.children.length > 0) {
      throw new UnprocessableEntityException('Children existed');
    }
    // const marriedSpouses = node.totalSpouses(SpouseRelationType.MARRIED);
  }

  async createParents(id: string, data: CreateParentsDto) {
    const child = await this.nodeRepository.findById(id);
    if (child.parents.length === 2) {
      throw new UnprocessableEntityException('Node parents existed');
    }

    const { father, mother } = data;
    if (father.gender === mother.gender) {
      throw new UnprocessableEntityException('Forbidden same gender parent');
    }

    const parents = [] as Node[];

    // Added parent-child relation
    {
      for (const e of [father, mother]) {
        // Added child to parent
        const parent = await this.nodeRepository.insert(e);
        const parentName = parent.name.nicknames?.[0] ?? parent.name.first;
        const parentChild = { id: child.id, type: RelationType.BLOOD };
        parent.children.push(parentChild as NodeRelation);
        parents.push(parent);

        // Added parent to child
        const childParent = { id: parent.id, type: RelationType.BLOOD };
        const childFamily = { id: parent.id, name: parentName };
        child.parents.push(childParent as NodeRelation);
        child.families.push(childFamily as NodeFamily);
      }
    }

    // Added spouses relation
    {
      const parent0Spouse = {
        id: parents[1].id,
        type: SpouseRelationType.MARRIED,
      };
      parents[0].spouses.push(parent0Spouse as NodeRelation);

      const parent1Spouse = {
        id: parents[0].id,
        type: SpouseRelationType.MARRIED,
      };
      parents[1].spouses.push(parent1Spouse as NodeRelation);
    }

    // Update new root families
    {
      const [{ id: fid, fullname: fn }, { id: mid, fullname: mn }] = parents;

      // Update the previous root families with the new one
      await this.nodeRepository.updateMany(
        {
          'families.id': {
            $in: [child.id],
          },
        },
        {
          $addToSet: {
            families: {
              $each: [
                { id: fid, name: fn },
                { id: mid, name: mn },
              ],
            },
          },
        },
      );
      await this.nodeRepository.updateMany(
        {
          'families.id': {
            $in: [child.id],
          },
        },
        {
          $pull: {
            families: {
              id: child.id,
            },
          },
        },
      );
    }

    return this.nodeRepository.bulkSave([child, ...parents]);
  }

  async createSpouses(id: string, data: CreateNodeDto[]) {
    const node = await this.nodeRepository.findById(id);
    const totalSpouses = node.totalSpouses(SpouseRelationType.MARRIED);
    const maxSpouses = node.maxSpouses();
    if (totalSpouses + data.length > maxSpouses) {
      throw new UnprocessableEntityException(`Max ${maxSpouses} spouses`);
    }

    const isAllowed = data.find((e) => e.gender !== node.gender);
    if (!isAllowed) {
      throw new UnprocessableEntityException('Same gender not allowed');
    }

    const spouses = [];

    // Added spouses relation
    {
      for (const e of data) {
        // Added node to spouse
        const spouse = await this.nodeRepository.insert(e);
        const spouseSpouse = { id: node.id, type: SpouseRelationType.MARRIED };
        spouse.spouses.push(spouseSpouse as NodeRelation);
        spouses.push(spouse);

        // Added spouse to node
        const nodeSpouse = { id: spouse.id, type: SpouseRelationType.MARRIED };
        node.spouses.push(nodeSpouse as NodeRelation);
      }
    }

    return this.nodeRepository.bulkSave([node, ...spouses]);
  }

  async createChild(id: string, data: CreateChildDto) {
    const parents = await this.nodeRepository.find({
      $or: [
        { _id: id, 'spouses.id': data.spouseId },
        { _id: data.spouseId, 'spouses.id': id },
      ],
    });

    if (parents.length !== 2) {
      throw new UnprocessableEntityException('Node not married yet');
    }

    const child = await this.nodeRepository.insert(data.child);

    // Added siblings relation
    {
      const siblings = intersectionWith(
        parents[0].children,
        parents[1].children,
        (a, b) => a.id.toString() === b.id.toString(),
      );
      child.siblings.push(...siblings);

      if (siblings.length > 0) {
        const sibling = { id: child.id, type: RelationType.BLOOD };
        const filter = { _id: { $in: siblings.map((e) => e.id) } };
        const update = { $addToSet: { siblings: sibling } };
        await this.nodeRepository.updateMany(filter, update);
      }
    }

    // Added child-spouse relation
    {
      for (const parent of parents) {
        // Added child to parent
        const parentChild = { id: child.id, type: RelationType.BLOOD };
        parent.children.push(parentChild as NodeRelation);

        // Added parent to child
        const childParent = { id: parent.id, type: RelationType.BLOOD };
        child.parents.push(childParent as NodeRelation);

        // Added families to child
        if (parent.families.length <= 0) {
          const name = parent.fullname;
          child.families.push({ id: parent.id, name } as NodeFamily);
        } else {
          child.families.push(...parent.families);
        }
      }
    }

    return this.nodeRepository.bulkSave([...parents, child]);
  }

  async createSibling(id: string, data: CreateNodeDto) {
    const node = await this.nodeRepository.findById(id);
    if (node.parents.length != 2) {
      throw new UnprocessableEntityException('Node parent not found');
    }
    const createChild = {
      spouseId: node.parents[0].id.toString(),
      child: data,
    };

    return this.createChild(node.parents[1].id.toString(), createChild);
  }

  async search(name: string, tree?: string, isPubic = false) {
    const names = name.replace(/\s\s+/g, '|');
    const filter = {
      $or: [
        {
          'name.first': new RegExp(names.toLowerCase()),
        },
        {
          'name.middle': new RegExp(names.toLowerCase()),
        },
        {
          'name.last': new RegExp(names.toLowerCase()),
        },
        {
          'name.nicknames': new RegExp(names.toLowerCase()),
        },
      ],
    };

    const node = await this.nodeRepository.findOne(filter);
    if (!node) return { data: [], total: 0 };
    return this.findRoot(node, tree, isPubic);
  }

  async findParentsAndChildren(id: string, tree?: string) {
    const node = await this.nodeRepository.findById(id);
    const parentIds = node.parents.map((parent) => parent.id.toString());
    const nodes = await this.nodeRepository.find({
      $or: [{ _id: { $in: parentIds } }, { 'parents.id': { $in: parentIds } }],
    });

    const result = await this.treeNode(nodes, tree);

    return { id: node.id, data: result, total: result.length };
  }

  async findSpouses(id: string, tree?: string) {
    const node = await this.nodeRepository.findById(id);
    const nodes = await this.nodeRepository.find({
      'spouses.id': id,
    });

    const result = await this.treeNode(nodes, tree);

    return { id: node.id, data: result, total: result.length };
  }

  async findRoot(id: string | Node, tree?: string, isPubic = false) {
    let node: Node;
    if (typeof id === 'string') {
      node = await this.nodeRepository.findById(id);
    } else {
      node = id;
    }

    const nodes = await this.nodeRepository.find({
      $or: [
        { _id: id },
        { 'families.id': id },
        { 'spouses.id': id },
        { 'children.id': id },
        { 'siblings.id': id },
        { 'parents.id': id },
      ],
    });

    const result = await this.treeNode(nodes, tree, isPubic);
    const isRoot = node.families.length <= 0;

    return { id: node.id, data: result, total: result.length, isRoot: isRoot };
  }

  async findSpousesAndChildren(id: string, tree?: string) {
    const node = await this.nodeRepository.findById(id);
    const nodes = await this.nodeRepository.find({
      $or: [{ _id: id }, { 'spouses.id': id }, { 'parents.id': id }],
    });

    const result = await this.treeNode(nodes, tree);

    return { id: node.id, data: result, total: result.length };
  }

  async findFamilies() {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          families: { $size: 0 },
        },
      },
      {
        $project: {
          name: {
            $concat: [
              '$name.first',
              ' ',
              { $ifNull: ['$name.middle', ''] },
              ' ',
              { $ifNull: ['$name.last', ''] },
            ],
          },
        },
      },
    ];
    return this.nodeRepository.aggregate(pipeline);
  }

  async findFamiliesById(id: string) {
    const node = await this.nodeRepository.findById(id);
    return { id: node.id, data: node.families, total: node.families.length };
  }

  private async isFamily(id: string, nodeId: string): Promise<boolean> {
    if (id === nodeId) return true;
    const or = [];
    or.push(
      { $and: [{ _id: id }, { 'parents.id': nodeId }] },
      { $and: [{ _id: id }, { 'children.id': nodeId }] },
      { $and: [{ _id: id }, { 'spouses.id': nodeId }] },
      { $and: [{ _id: id }, { 'siblings.id': nodeId }] },
    );
    const filter = { $or: or };
    const related = await this.nodeRepository.findOne(filter);
    if (!related) {
      return false;
    }
    return true;
  }

  private async treeNode(nodes: Node[], tree?: string, isPublic = false) {
    if (isPublic) tree = 'true';
    if (tree !== 'true') return nodes;
    return nodes.map((node) => {
      const data: Record<string, any> = {};
      data.id = node.id;
      data.gender = node.gender;
      data.parents = [];
      data.spouses = [];
      data.children = [];
      data.siblings = [];

      if (node.parents.length > 0) {
        const parents = [] as NodeRelation[];
        for (const parent of node.parents) {
          const parentId = parent.id.toString();
          const found = nodes.find((node) => node.id === parentId);
          if (!found) continue;
          parents.push(parent);
        }

        data.parents = parents;
      }

      if (node.spouses.length > 0) {
        const spouses = [] as NodeRelation[];
        for (const spouse of node.spouses) {
          const spouseId = spouse.id.toString();
          const found = nodes.find((node) => node.id === spouseId);
          if (!found) continue;
          spouses.push(spouse);
        }

        data.spouses = spouses;
      }

      if (node.children.length > 0) {
        const children = [] as NodeRelation[];
        for (const child of node.children) {
          const childId = child.id.toString();
          const found = nodes.find((node) => node.id === childId);
          if (!found) continue;
          children.push(child);
        }

        data.children = children;
      }

      if (node.siblings.length > 0) {
        const siblings = [] as NodeRelation[];
        for (const sibling of node.siblings) {
          const siblingId = sibling.id.toString();
          const found = nodes.find((node) => node.id === siblingId);
          if (!found) continue;
          siblings.push(sibling);
        }

        data.siblings = siblings;
      }

      const nickname = node.name?.nicknames?.[0] ?? node.name.first;
      const name = isPublic ? { first: nickname } : node.name;
      const fullname = isPublic ? nickname : node.fullname;
      const birth = isPublic ? undefined : node.birth;

      data.data = {
        id: node.id,
        name,
        fullname,
        gender: node.gender,
        birth: birth,
        families: node.families,
        metadata: {
          totalSpouses: node.totalSpouses(SpouseRelationType.MARRIED),
          maxSpouses: node.maxSpouses(),
          expandable: {
            parents: node.parents.length != data.parents.length,
            spouses: node.spouses.length != data.spouses.length,
            children: node.children.length != data.children.length,
            siblings: node.siblings.length != data.siblings.length,
          },
        },
      };
      return data;
    });
  }
}
