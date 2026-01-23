import { describe, it, expect } from 'vitest';
import { formatProjectName, isValidEmail } from './utils';

describe('formatProjectName', () => {
  it('should convert spaces to dashes', () => {
    expect(formatProjectName('My Project')).toBe('my-project');
  });

  it('should convert to lowercase', () => {
    expect(formatProjectName('MyProject')).toBe('myproject');
  });

  it('should trim whitespace', () => {
    expect(formatProjectName('  My Project  ')).toBe('my-project');
  });

  it('should handle multiple spaces', () => {
    expect(formatProjectName('My   Project')).toBe('my-project');
  });
});

describe('isValidEmail', () => {
  it('should validate correct email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email without @', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });

  it('should reject invalid email without domain', () => {
    expect(isValidEmail('test@')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});
