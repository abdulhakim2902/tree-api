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
import { intersectionWith, omit, startCase } from 'lodash';
import { NodeFamily } from './schemas/node.family.schema';
import { PipelineStage } from 'mongoose';
import { TreeNode, TreeNodeFamily } from 'src/interfaces/tree-node.interface';
import { Gender } from 'src/enums/gender.enum';

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

  async search(name: string, isPublic = false) {
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
    return this.root(node, isPublic);
  }

  async root(id: string | Node, isPublic = false) {
    let node: Node;
    if (typeof id === 'string') {
      node = await this.nodeRepository.findById(id);
    } else {
      node = id;
    }

    const match: PipelineStage.Match = {
      $match: {
        $or: [
          { _id: node._id },
          { 'families.id': node._id },
          { 'spouses.id': node._id },
          { 'children.id': node._id },
          { 'siblings.id': node._id },
          { 'parents.id': node._id },
        ],
      },
    };

    const result = await this.treeNode(match, isPublic);
    const isRoot = node.families.length <= 0;

    return { id: node.id, data: result, total: result.length, isRoot: isRoot };
  }

  async parentsAndChildren(id: string) {
    const node = await this.nodeRepository.findById(id);
    const parentIds = node.parents.map((parent) => parent.id);
    const match: PipelineStage.Match = {
      $match: {
        $or: [
          { _id: { $in: parentIds } },
          { 'parents.id': { $in: parentIds } },
        ],
      },
    };

    const nodes = await this.treeNode(match);

    return { id: node.id, data: nodes, total: nodes.length };
  }

  async spousesAndChildren(id: string) {
    const node = await this.nodeRepository.findById(id);
    const match: PipelineStage.Match = {
      $match: {
        $or: [
          { _id: node._id },
          { 'spouses.id': node._id },
          { 'parents.id': node._id },
        ],
      },
    };

    const nodes = await this.treeNode(match);

    return { id: node.id, data: nodes, total: nodes.length };
  }

  async spouses(id: string) {
    const node = await this.nodeRepository.findById(id);
    const nodes = await this.nodeRepository.find({
      $or: [{ 'spouses.id': id }],
    });

    return { id: node.id, data: nodes, total: nodes.length };
  }

  async nodeFamilies(id: string) {
    const node = await this.nodeRepository.findById(id);
    return { id: node.id, data: node.families, total: node.families.length };
  }

  async families(isPublic = false) {
    const project: PipelineStage.Project = {
      $project: {
        id: { $toString: '$_id' },
      },
    };

    if (isPublic) {
      Object.assign(project.$project, {
        name: {
          $ifNull: [{ $arrayElemAt: ['$name.nicknames', 0] }, '$name.first'],
        },
      });
    } else {
      Object.assign(project.$project, {
        name: {
          $concat: [
            '$name.first',
            ' ',
            { $ifNull: ['$name.middle', ''] },
            ' ',
            { $ifNull: ['$name.last', ''] },
          ],
        },
      });
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          families: { $size: 0 },
        },
      },
      project,
      {
        $sort: {
          name: 1,
        },
      },
    ];

    return this.nodeRepository.aggregate<TreeNodeFamily>(pipeline);
  }

  private async treeNode(match: PipelineStage.Match, isPublic = false) {
    const pipeline: PipelineStage[] = [
      match,
      {
        $project: {
          id: { $toString: '$_id' },
          gender: '$gender',
          parents: '$parents',
          siblings: '$siblings',
          children: '$children',
          spouses: '$spouses',
          data: {
            id: { $toString: '$_id' },
            name: '$name',
            fullname: {
              $concat: [
                '$name.first',
                ' ',
                { $ifNull: ['$name.middle', ''] },
                ' ',
                { $ifNull: ['$name.last', ''] },
              ],
            },
            gender: '$gender',
            birth: '$birth',
          },
        },
      },
    ];

    const nodes = await this.nodeRepository.aggregate<TreeNode>(pipeline);
    return nodes.map((node) => {
      const { name } = node.data;
      const { first, nicknames } = name;
      const nickname = nicknames?.[0] ?? first;
      const fullname = isPublic ? nickname : node.data.fullname;
      const totalSpouses = node.spouses.filter(
        (e) => e.type === SpouseRelationType.MARRIED,
      ).length;

      const parents = node.parents.filter((parent) => {
        const parentId = parent.id.toString();
        return nodes.find((node) => node.id === parentId);
      });

      const spouses = node.spouses.filter((spouse) => {
        const spouseId = spouse.id.toString();
        return nodes.find((node) => node.id === spouseId);
      });

      const children = node.children.filter((child) => {
        const childId = child.id.toString();
        return nodes.find((node) => node.id === childId);
      });

      const siblings = node.siblings.filter((sibling) => {
        const siblingId = sibling.id.toString();
        return nodes.find((node) => node.id === siblingId);
      });

      node.data.name = isPublic ? { first: nickname } : name;
      node.data.fullname = startCase(fullname.replace(/\s+/g, ' ').trim());
      node.data.birth = isPublic ? undefined : node.data.birth;
      node.data.metadata = {
        totalSpouses: totalSpouses,
        maxSpouses: node.gender === Gender.MALE ? 4 : 1,
        expandable: {
          parents: node.parents.length != parents.length,
          spouses: node.spouses.length != spouses.length,
          children: node.children.length != children.length,
          siblings: node.siblings.length != siblings.length,
        },
      };

      node.parents = parents;
      node.siblings = siblings;
      node.spouses = spouses;
      node.children = children;

      return omit(node, ['_id']);
    });
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
}
