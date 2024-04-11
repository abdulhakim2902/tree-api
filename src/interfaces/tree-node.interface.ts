import { Gender } from 'src/enums/gender.enum';

export type TreeNodeRelation = {
  id: string;
  type: string;
};

export type TreeNodeMetadata = {
  totalSpouses: number;
  maxSpouses: number;
  expandable?: TreeNodeExpandable;
};

export type TreeNodeExpandable = {
  parents: boolean;
  spouses: boolean;
  children: boolean;
  siblings: boolean;
};

export type TreeNodeBirth = {
  day: number;
  month: number;
  year: number;
  place: {
    city: string;
    country: string;
  };
};

export type TreeNodeData = {
  id: string;
  name: {
    first: string;
    middle?: string;
    last?: string;
    nicknames?: string[];
  };
  fullname: string;
  gender: Gender;
  birth?: TreeNodeBirth;
  profileImageURL?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
};

export type TreeNode = {
  id: string;
  gender: Gender;
  parents: TreeNodeRelation[];
  spouses: TreeNodeRelation[];
  children: TreeNodeRelation[];
  siblings: TreeNodeRelation[];
  data: TreeNodeData;
};

export type TreeNodeFamily = {
  id: string;
  name: string;
};

export type NodeRelative = 'parents' | 'children' | 'siblings' | 'spouses';
