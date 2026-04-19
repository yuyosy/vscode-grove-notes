export const EXTENSION_ID = 'grove-notes' as const;

const id = <T extends string>(cmd: T) => `${EXTENSION_ID}.${cmd}` as const;

export const Commands = {
  Setup: id('setup'),
  NotesPathConfigured: id('notesPathConfigured'),
  SelectNotesFolder: id('selectNotesFolder'),
  NewNote: id('newNote'),
  ListNotes: id('listNotes'),
  ListTags: id('listTags'),
  Refresh: id('refresh'),
  JjEnabled: id('jjEnabled'),
  JjDescribe: id('jjDescribe'),
  JjNew: id('jjNew'),
  JjUndo: id('jjUndo'),
  JjRedo: id('jjRedo'),
  JjPush: id('jjPush'),
  JjFetch: id('jjFetch'),
  OpenGitignore: id('openGitignore'),

  // in view/title toolbar
  NewNoteInNotesView: id('newNote#notesView'),
  RefreshInNotesView: id('refresh#notesView'),
  JjDescribeInNotesView: id('jjDescribe#notesView'),
  JjNewInNotesView: id('jjNew#notesView'),
  JjUndoInNotesView: id('jjUndo#notesView'),
  JjRedoInNotesView: id('jjRedo#notesView'),

  // in view/item/context menu (#notesView variants with short titles)
  EditTagsInNotesView: id('editTags#notesView'),
  RenameItemInNotesView: id('renameItem#notesView'),
  DeleteItemInNotesView: id('deleteItem#notesView'),
  NewNoteInFolderInNotesView: id('newNoteInFolder#notesView'),
  RevealInExplorerInNotesView: id('revealInExplorer#notesView'),
  CopyPathInNotesView: id('copyPath#notesView'),
  ViewDiffInNotesView: id('viewDiff#notesView'),
  OpenPreviewInNotesView: id('openPreview#notesView'),
};
