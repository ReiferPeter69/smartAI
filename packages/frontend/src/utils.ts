export function formatProjectName(name: string): string {
  return name.trim().replace(/\s+/g, '-').toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
