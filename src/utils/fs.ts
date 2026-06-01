import fs from "node:fs";
import path from "node:path";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, "utf8");
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, "utf8");
}

export async function assertReadableDirectory(dir: string): Promise<void> {
  const stat = await fs.promises.stat(dir);
  if (!stat.isDirectory()) {
    throw new Error(`${dir} is not a directory`);
  }
}
