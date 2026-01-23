import { promises as fs } from 'fs';
import path from 'path';

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function deleteDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function listFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function copyFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await fs.copyFile(source, destination);
}

export async function moveFile(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await fs.rename(source, destination);
}

export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath);
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

export function getFileNameWithoutExtension(filePath: string): string {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);
  return fileName.slice(0, -ext.length);
}
