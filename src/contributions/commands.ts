export const EXTENSION_ID = 'grove-notes' as const;

const id = <T extends string>(cmd: T) => `${EXTENSION_ID}.${cmd}` as const;

export const Commands = {
  Setup: id('setup'),
  NotesPathConfigured: id('notesPathConfigured'),
  SelectNotesFolder: id('selectNotesFolder'),
  NewNote: id('newNote'),
  NewNoteInFolder: id('newNoteInFolder'),
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
  EditTags: id('editTags'),
  RenameItem: id('renameItem'),
  DeleteItem: id('deleteItem'),
  ViewDiff: id('viewDiff'),
  RevealInExplorer: id('revealInExplorer'),
  CopyPath: id('copyPath'),
  OpenPreview: id('openPreview'),
  OpenGitignore: id('openGitignore'),
};
