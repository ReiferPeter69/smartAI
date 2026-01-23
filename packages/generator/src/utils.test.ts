import { describe, it, expect } from 'vitest';
import { sanitizeFileName, getFileExtension, joinPath } from './utils';

describe('sanitizeFileName', () => {
  it('should replace invalid characters with underscore', () => {
    expect(sanitizeFileName('my file.txt')).toBe('my_file.txt');
  });

  it('should keep valid characters', () => {
    expect(sanitizeFileName('valid-file_name.123.ts')).toBe('valid-file_name.123.ts');
  });

  it('should handle special characters', () => {
    expect(sanitizeFileName('file@#$%.txt')).toBe('file____.txt');
  });
});

describe('getFileExtension', () => {
  it('should return extension for file with extension', () => {
    expect(getFileExtension('file.txt')).toBe('txt');
  });

  it('should return extension for file with multiple dots', () => {
    expect(getFileExtension('file.test.ts')).toBe('ts');
  });

  it('should return empty string for file without extension', () => {
    expect(getFileExtension('file')).toBe('');
  });
});

describe('joinPath', () => {
  it('should join path parts with slash', () => {
    expect(joinPath('src', 'components', 'App.tsx')).toBe('src/components/App.tsx');
  });

  it('should handle trailing slashes', () => {
    expect(joinPath('src/', 'components/', 'App.tsx')).toBe('src/components/App.tsx');
  });

  it('should filter empty parts', () => {
    expect(joinPath('src', '', 'components')).toBe('src/components');
  });

  it('should normalize multiple slashes', () => {
    expect(joinPath('src//components', 'App.tsx')).toBe('src/components/App.tsx');
  });
});
