import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import envPaths from "env-paths";

const envPath = envPaths("mcpx", {suffix: ""})
const PROJECT_ROOT = envPath.data

const OFFLINE_MODE = true

export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
export const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".txt", ".rtf", ".odt", ".html", ".csv", ".epub"];

export function multerDestination(
  req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, destination: string) => void
) {
  const uploadDir = path.join(PROJECT_ROOT, "uploads");
  fs.mkdir(uploadDir, { recursive: true })
    .then(() => cb(null, uploadDir))
    .catch((err) => cb(err, uploadDir));
}

export function multerFilename(
  req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, filename: string) => void
) {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  cb(null, uniqueSuffix + path.extname(file.originalname));
}

export async function handleUploadFiles({ files, filepaths }: { files: Express.Multer.File[]; filepaths: string[] }) {
  const documents: string[] = [];
  const images: string[] = [];

  for (const file of files) {
    const hash = await calculateFileHash(file.path);

    // Check if file with same hash prefix exists
    const uploadDir = path.join(PROJECT_ROOT, "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const files = await fs.readdir(uploadDir);
    const existingFile = files.find((f) => f.startsWith(hash));
    if (existingFile) {
      // If file with same hash found, use that file
      file.filename = existingFile;
      await fs.unlink(file.path); // Delete newly uploaded file
      file.path = path.join(uploadDir, existingFile);
    } else {
      const newFileName = `${hash}-${file.originalname}`;
      const newPath = path.join(PROJECT_ROOT, "uploads", newFileName);
      // Rename file
      await fs.rename(file.path, newPath);
      file.filename = newFileName; // Update filename
    }

    const ext = path.extname(file.filename).toLowerCase();
    if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
      // local mode support custom PROJECT_ROOT
      if (OFFLINE_MODE) images.push(path.join(PROJECT_ROOT, "uploads", file.filename));
      else images.push(`uploads/${file.filename}`);
    } else {//(SUPPORTED_DOCUMENT_EXTENSIONS.includes(ext)) {
      if (OFFLINE_MODE) documents.push(path.join(PROJECT_ROOT, "uploads", file.filename));
      else documents.push(`uploads/${file.filename}`);
    }
    // else {
    //   logger.error(`Unsupported file type: ${file.filename}`);
    // }
  }

  for (const filepath of filepaths) {
    const ext = path.extname(filepath).toLowerCase();
    if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
      images.push(filepath);
    } else {//if (SUPPORTED_DOCUMENT_EXTENSIONS.includes(ext)) {
      documents.push(filepath);
    }
    // else {
    //   logger.error(`Unsupported file type: ${filepath}`);
    // }
  }

  return { images, documents };
}

async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash("md5").update(fileBuffer).digest("hex").slice(0, 12);
}
