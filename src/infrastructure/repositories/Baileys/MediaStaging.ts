import fs from "fs/promises";
import path from "path";

const STAGING_DIR = path.resolve("./session/media-pending");

async function ensureStagingDir(): Promise<void> {
  await fs.mkdir(STAGING_DIR, { recursive: true });
}

export async function stageMediaBuffer(
  messageId: string,
  type: string,
  buffer: Buffer,
  extension: string,
): Promise<string> {
  await ensureStagingDir();

  const safeId = messageId.replace(/[^\w.-]/g, "_");
  const safeType = type.replace(/[^\w.-]/g, "_");
  const safeExtension = extension.replace(/[^\w.-]/g, "_") || "bin";

  const filePath = path.join(
    STAGING_DIR,
    `${safeId}-${safeType}.${safeExtension}`,
  );

  await fs.writeFile(filePath, buffer);

  return filePath;
}

export async function readStagedMedia(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

export async function deleteStagedMedia(filePath: string): Promise<void> {
  try {
    await fs.rm(filePath, { force: true });
  } catch (err) {
    console.error("erro ao remover arquivo staged:", err);
  }
}
