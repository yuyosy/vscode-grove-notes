import { execFileSync } from 'node:child_process';

/** Resolved jj binary path, set once on extension activation. */
let resolvedJjPath: string | null = null;

/**
 * Returns the jj binary name for the current platform.
 *   Windows  → 'jj.exe'
 *   others   → 'jj'
 */
function jjBinaryName(): string {
  return process.platform === 'win32' ? 'jj.exe' : 'jj';
}

/**
 * Tries to find `jj` on the user's PATH using `where` (Windows) or `which` (Unix).
 * Returns the absolute path, or null if not found.
 */
function findJjInPath(): string | null {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execFileSync(cmd, [jjBinaryName()], {
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
    // `where` may return multiple lines; take the first
    const first = result.split(/\r?\n/)[0].trim();
    return first || null;
  } catch {
    return null;
  }
}

/** Validates a user-provided jj executable path. */
function findConfiguredJj(configuredPath: string): string | null {
  if (!configuredPath) return null;
  try {
    execFileSync(configuredPath, ['--version'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return configuredPath;
  } catch {
    return null;
  }
}

/**
 * Initialises the jj binary path. Call once from `activate()`.
 *
 * Resolution order:
 *   1. `grove-notes.versionControl.jjPath`
 *   2. User's PATH (`jj` / `jj.exe`)
 */
export function initJjPath(configuredPath = ''): void {
  const fromConfig = findConfiguredJj(configuredPath);
  if (fromConfig) {
    resolvedJjPath = fromConfig;
    return;
  }

  const fromPath = findJjInPath();
  if (fromPath) {
    resolvedJjPath = fromPath;
    return;
  }

  // Not found — set null and let callers surface the error lazily
  resolvedJjPath = null;
}

/**
 * Returns the resolved jj binary path.
 * Throws a user-friendly error if `initJjPath` was not called or jj was not found.
 */
export function getJjPath(): string {
  if (!resolvedJjPath) {
    throw new Error(
      'jj binary not found. Please install jj from https://www.jj-vcs.dev/latest/ and ensure it is available in your PATH.',
    );
  }
  return resolvedJjPath;
}

/** Returns true when a jj binary has been resolved. */
export function isJjAvailable(): boolean {
  return resolvedJjPath !== null;
}
