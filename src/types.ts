export type TreeNodeKind = 'rootFile' | 'rootTag' | 'file' | 'dir' | 'tag';

export interface NoteTreeItem {
  kind: TreeNodeKind;
  label: string;
  /** Absolute path (for file/dir nodes) */
  filePath?: string;
  /** Child file paths (for tag nodes) */
  files?: NoteTreeItem[];
}

export interface TagIndex {
  [tag: string]: string[]; // tag -> absolute file paths
}
