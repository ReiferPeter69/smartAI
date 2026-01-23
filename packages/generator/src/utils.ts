export function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}
