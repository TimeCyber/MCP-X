import fs from "fs/promises";
import sharp from "sharp";
import logger from "./logger.js";

// Read and convert image
export async function imageToBase64Original(imagePath: string): Promise<string> {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    return `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  } catch (error) {
    logger.error("Error reading image:", error);
    throw error;
  }
}

export async function imageToBase64(path: string): Promise<string> {
  try {
    // Use sharp to compress image
    const compressedImageBuffer = await sharp(path)
      .resize(800, 800, {
        // Set maximum width and height
        fit: "inside", // Keep aspect ratio
        withoutEnlargement: true, // Avoid enlarging small images
      })
      .jpeg({
        // Convert to JPEG format
        quality: 80, // Set compression quality (0-100)
        progressive: true, // Use progressive JPEG
      })
      .toBuffer();

    // Convert to base64
    return `data:image/jpeg;base64,${compressedImageBuffer.toString("base64")}`;
  } catch (error) {
    logger.error("Error compressing image:", error);
    // If compression fails, use original method as fallback
    return imageToBase64Original(path);
  }
}