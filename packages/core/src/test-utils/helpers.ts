import { vi } from 'vitest';

export function createMockDate(isoString: string = '2024-01-01T00:00:00.000Z') {
  const mockDate = new Date(isoString);
  vi.setSystemTime(mockDate);
  return mockDate;
}

export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldThrowError(fn: () => void): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

export function mockEnvironmentVariables(vars: Record<string, string>) {
  const original = { ...process.env };
  
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  return () => {
    process.env = original;
  };
}
