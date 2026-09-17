import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary (automatically picks up process.env.CLOUDINARY_URL)
cloudinary.config({
  secure: true,
});

/**
 * Returns true if CLOUDINARY_URL is populated in environment
 */
export const isCloudinaryConfigured = (): boolean => {
  const url = process.env.CLOUDINARY_URL;
  return Boolean(url && url.trim() !== '' && !url.includes('**********'));
};

/**
 * Uploads a local file to Cloudinary and deletes the temporary local file.
 * Returns the permanent HTTPS secure_url from Cloudinary CDN.
 */
export const uploadMediaFile = async (
  filePath: string,
  folder: string = 'squad_achievements'
): Promise<string> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto', // Automatically detects images, videos, audio
    });

    return result.secure_url;
  } finally {
    // Always clean up the temporary file from the local server disk
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn('[Cloudinary] Could not delete local temp file:', filePath, cleanupErr);
    }
  }
};
