export type TreeNodeKind =
  | 'rootPinned'
  | 'rootRecent'
  | 'rootFile'
  | 'rootTag'
  | 'file'
  | 'dir'
  | 'tag';

export interface NoteTreeItem {
  kind: TreeNodeKind;
  label: string;
  /** Absolute path (for file/dir nodes) */
  filePath?: string;
  /** Child files (for tag and activity section nodes) */
  files?: NoteTreeItem[];
}

export interface TagIndex {
  [tag: string]: string[]; // tag -> absolute file paths
}
