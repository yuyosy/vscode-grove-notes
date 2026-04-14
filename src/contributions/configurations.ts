export const EXTENSION_ID = 'grove-notes' as const;

const id = <T extends string>(config: T) =>
  `${EXTENSION_ID}.${config}` as const;

export const Configurations = {
  NotePath: id('notePath'),
  VersionControlUseJujutsu: id('versionControl.useJujutsu'),
  VersionControlAutoCommitInterval: id('versionControl.autoCommitInterval'),
};
