// The lexical half of the path jail: decides whether a path written in a
// manifest is a plain relative path that stays inside the package. The disk
// half (realpath checks against symlinks) lives in loader.ts.

/**
 * Returns a plain-English reason the path is unsafe, or null if it is a plain
 * relative path like `web/index.html` that cannot leave the package.
 */
export function pathProblem(path: string): string | null {
  if (path.length === 0) return 'is empty';
  if (/[\u0000-\u001f\u007f]/.test(path)) return 'contains control characters';
  if (path.startsWith('\\\\') || path.startsWith('//')) {
    return 'is a network (UNC) path; use a path inside the package';
  }
  if (/^[a-zA-Z]:/.test(path)) return 'is an absolute Windows path; use a path inside the package';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) {
    return 'is a URL; builds must be files inside the package';
  }
  if (path.includes('\\')) return 'uses backslashes; separate folders with forward slashes';
  if (path.includes(':')) return 'contains ":", which is not allowed in package paths';
  if (path.startsWith('/')) return 'is an absolute path; use a path inside the package';

  const segments = path.split('/');
  if (segments.some((segment) => segment === '')) {
    return 'has an empty folder name (a doubled or trailing slash)';
  }
  if (segments.some((segment) => segment === '..')) {
    return 'uses ".." to climb out of its folder';
  }
  if (segments.some((segment) => /^\.+$/.test(segment))) {
    return 'uses a dot-only folder name; write the plain path instead';
  }
  return null;
}

export function isSafeRelativePath(path: string): boolean {
  return pathProblem(path) === null;
}
