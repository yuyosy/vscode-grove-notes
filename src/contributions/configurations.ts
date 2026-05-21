export const EXTENSION_ID = 'grove-notes' as const;

const fq = <T extends string>(config: T) =>
  `${EXTENSION_ID}.${config}` as const;

export const Configurations = {
  NotePath: 'notePath',
  TemplatePath: 'templatePath',
  DefaultNoteTitle: 'defaultNoteTitle',
  DefaultExtension: 'defaultExtension',
  PathSeparator: 'pathSeparator',
  ViewHiddenPatterns: 'view.hiddenPatterns',
  ViewUseGitignore: 'view.useGitignore',
  CounterStartsAtOne: 'counterStartsAtOne',
  TagsPredefined: 'tags.predefined',
  TagsEnableInView: 'tags.enableTagsInView',
  HideIgnoreFilesInTagsView: 'tags.hideIgnoreFilesInTagsView',
  TagsScanWorkspace: 'tags.scanWorkspace',
  PreviewOpenToSide: 'preview.openToSide',
  VersionControlUseJujutsu: 'versionControl.useJujutsu',
  VersionControlJjPath: 'versionControl.jjPath',
  VersionControlJjInitMode: 'versionControl.jjInitMode',
  VersionControlAutoCommitInterval: 'versionControl.autoCommitInterval',
  VersionControlAutoCommitMessage: 'versionControl.autoCommitMessage',
} as const;

export const toFullConfigKey = <T extends string>(config: T) => fq(config);
