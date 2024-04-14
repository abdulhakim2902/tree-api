import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreateNodeDto,
  CreateParentsDto,
  CreateChildDto,
  UpdateNodeDto,
  UpdateNodeProfileDto,
} from './dto';
import { Node } from 'src/modules/node/schemas/node.schema';
import { NodeRepository } from 'src/modules/node/node.repository';
import { RelationType, SpouseRelationType } from 'src/enums/relation-type.enum';
import { NodeRelation } from './schemas/node.relation.schema';
import { intersectionWith } from 'lodash';
import { NodeFamily } from './schemas/node.family.schema';
import mongoose, { PipelineStage, UpdateQuery } from 'mongoose';
import {
  NodeRelative,
  TreeNode,
  TreeNodeFamily,
} from 'src/interfaces/tree-node.interface';

@Injectable()
export class NodeService {
  constructor(private readonly nodeRepository: NodeRepository) {}

  async createNode(data: CreateNodeDto): Promise<Node> {
    return this.nodeRepository.insert(data);
  }

  async hardDeleteById(id: string) {
    await this.nodeRepository.deleteById(id);
  }

  async softDeleteById(id: string) {
    const node = await this.nodeRepository.findById(id);
    if (node.children.length > 0) {
      throw new UnprocessableEntityException('Node children existed');
    }

    await this.nodeRepository.updateById(id, { deletedAt: new Date() });
    await this.nodeRepository.updateMany(
      {},
      {
        $pull: {
          parents: { id: node._id },
          children: { id: node._id },
          siblings: { id: node._id },
          spouses: { id: node._id },
          families: { id: node._id },
        },
      },
    );

    const relativeIds = [
      ...node.parents,
      ...node.siblings,
      ...node.spouses,
      ...node.siblings,
    ].map((node) => node.id);

    const match: PipelineStage.Match = {
      $match: {
        _id: { $in: relativeIds },
      },
    };

    const nodes = await this.treeNode(match);

    return { nodes };
  }

  async findById(id: string): Promise<Node> {
    return this.nodeRepository.findById(id);
  }

  async updateById(id: string, data: UpdateNodeDto): Promise<Node> {
    const node = await this.nodeRepository.findById(id);
    if (node.gender !== data.gender && node.spouses.length > 0) {
      throw new UnprocessableEntityException('Gender cannot be changed');
    }

    const updateQuery = {} as UpdateQuery<Node>;

    if (data?.name && Object.values(data.name).length > 0) {
      updateQuery.name = data.name;
    } else {
      updateQuery.name = node.name;
    }

    if (data?.nicknames && data.nicknames.length > 0) {
      updateQuery.name.nicknames = data.nicknames;
    }

    if (data.gender) {
      updateQuery.gender = data.gender;
    } else {
      updateQuery.gender = node.gender;
    }

    if (data?.birth && Object.values(data.birth).length > 0) {
      updateQuery.birth = data.birth;
    } else {
      updateQuery.$unset = { birth: '' };
    }

    if (data?.death && Object.values(data.death).length > 0) {
      updateQuery.death = data.death;
    } else {
      updateQuery.$unset = { death: '' };
    }

    const updated = await this.nodeRepository.updateById(id, updateQuery);
    const filter = { 'families.id': id };
    const update = { $set: { 'families.$.name': updated.fullname } };

    await this.nodeRepository.updateMany(filter, update);

    return updated;
  }

  async updateProfileById(
    id: string,
    data: UpdateNodeProfileDto,
  ): Promise<Node> {
    const update = {};
    if (data.fileId) {
      const profileImage = new mongoose.Types.ObjectId(data.fileId);
      Object.assign(update, { $set: { profileImage } });
    } else {
      Object.assign(update, { $unset: { profileImage: '' } });
    }

    return this.nodeRepository.updateById(id, update);
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
        const parentChild = { id: child.id, type: RelationType.BLOOD };
        parent.children.push(parentChild as NodeRelation);
        parents.push(parent);

        // Added parent to child
        const childParent = { id: parent.id, type: RelationType.BLOOD };
        const childFamily = { id: parent.id, name: parent.fullname };
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

    await this.nodeRepository.bulkSave([child, ...parents]);

    return {
      ids: parents.map((e) => e.id),
    };
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

    await this.nodeRepository.bulkSave([node, ...spouses]);

    return {
      ids: spouses.map((e) => e.id),
    };
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

    await this.nodeRepository.bulkSave([...parents, child]);

    return { id: child.id };
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

  async samples() {
    const nodes = await this.nodeRepository.aggregate<Node>([
      { $sample: { size: 1 } },
    ]);
    if (nodes.length <= 0) return { data: [], total: 0 };
    const node = nodes[0];
    node.id = node._id.toString();
    return this.root(node, true);
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

  async relative(id: string, relative: NodeRelative) {
    const node = await this.nodeRepository.findById(id);

    if (!node?.[relative]) {
      throw new BadRequestException('Relative not found');
    }

    const relativeIds = node[relative].map((node) => node.id);
    const match: PipelineStage.Match = {
      $match: {
        _id: { $in: [...relativeIds, node._id] },
      },
    };

    const nodes = await this.treeNode(match);

    return { nodes };
  }

  async relatives(id: string) {
    const nodeId = new mongoose.Types.ObjectId(id);
    const [node] = await this.treeNode({ $match: { _id: nodeId } });
    if (!node) {
      throw new BadRequestException('Node not found');
    }

    const relativeIds = [
      ...node.parents,
      ...node.siblings,
      ...node.spouses,
      ...node.siblings,
    ].map((node) => node.id);

    const match: PipelineStage.Match = {
      $match: {
        _id: { $in: relativeIds },
      },
    };

    const nodes = await this.treeNode(match);

    return { node, nodes };
  }

  async families(id: string) {
    const node = await this.nodeRepository.findById(id);
    return { id: node.id, data: node.families, total: node.families.length };
  }

  async rootFamilies(isPublic = false) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          families: { $size: 0 },
        },
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: isPublic
            ? {
                $ifNull: [
                  { $arrayElemAt: ['$name.nicknames', 0] },
                  '$name.first',
                ],
              }
            : {
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
        $lookup: {
          from: 'files',
          localField: 'profileImage',
          foreignField: '_id',
          as: 'profileImage',
        },
      },
      {
        $unwind: {
          path: '$profileImage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          id: { $toString: '$_id' },
          gender: 1,
          parents: 1,
          siblings: 1,
          children: 1,
          spouses: 1,
          deletedAt: 1,
          data: {
            id: { $toString: '$_id' },
            name: isPublic
              ? {
                  first: {
                    $ifNull: [
                      { $arrayElemAt: ['$name.nicknames.name', 0] },
                      '$name.first',
                    ],
                  },
                }
              : '$name',
            fullname: isPublic
              ? {
                  $ifNull: [
                    { $arrayElemAt: ['$name.nicknames.name', 0] },
                    '$name.first',
                  ],
                }
              : {
                  $concat: [
                    '$name.first',
                    ' ',
                    { $ifNull: ['$name.middle', ''] },
                    ' ',
                    { $ifNull: ['$name.last', ''] },
                  ],
                },
            profileImageURL: isPublic ? '$$REMOVE' : '$profileImage.url',
            gender: '$gender',
            birth: isPublic ? '$$REMOVE' : '$birth',
            user: {
              id: '$userId',
            },
          },
        },
      },
    ];

    return this.nodeRepository.aggregate<TreeNode>(pipeline);
  }
}
