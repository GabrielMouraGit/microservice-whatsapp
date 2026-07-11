import fs from "fs";
import path from "path";

const STAGING_DIR = path.resolve("./session/media-pending");

function ensureStagingDir(): void {
  fs.mkdirSync(STAGING_DIR, { recursive: true });
}

export function stageMediaBuffer(
  messageId: string,
  type: string,
  buffer: Buffer,
  extension: string,
): string {
  ensureStagingDir();

  const safeId = messageId.replace(/[^\w.-]/g, "_");
  const safeType = type.replace(/[^\w.-]/g, "_");
  const safeExtension = extension.replace(/[^\w.-]/g, "_") || "bin";

  const filePath = path.join(
    STAGING_DIR,
    `${safeId}-${safeType}.${safeExtension}`,
  );

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export function readStagedMedia(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export function deleteStagedMedia(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true });
  } catch (err) {
    console.error("erro ao remover arquivo staged:", err);
  }
}
