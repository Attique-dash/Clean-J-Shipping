// src/lib/cloudinary.ts
// Cloudinary utility for file upload and management

import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload folder from env or default
const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || "cleanj-invoices";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
  format: string;
  resourceType: string;
  uploadedAt: Date;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  resourceType?: "auto" | "image" | "video" | "raw";
  overwrite?: boolean;
}

/**
 * Upload a buffer to Cloudinary
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const folder = options.folder || UPLOAD_FOLDER;
  const resourceType = options.resourceType || getResourceType(mimeType);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId,
        tags: options.tags || ["invoice", "customer-upload"],
        resource_type: resourceType,
        overwrite: options.overwrite ?? false,
        // For PDFs and raw files
        use_filename: true,
        unique_filename: true,
        // Add metadata
        context: `filename=${filename}|uploaded_by=customer`,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          filename: filename,
          size: result.bytes,
          width: result.width,
          height: result.height,
          format: result.format,
          resourceType: result.resource_type,
          uploadedAt: new Date(),
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a file from a File object (for server-side use)
 */
export async function uploadFile(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return uploadBuffer(buffer, file.name, file.type, options);
}

/**
 * Delete a file from Cloudinary by public ID
 */
export async function deleteFile(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

/**
 * Delete multiple files from Cloudinary
 */
export async function deleteMultipleFiles(publicIds: string[]): Promise<{
  success: string[];
  failed: string[];
}> {
  const results = {
    success: [] as string[],
    failed: [] as string[],
  };

  for (const publicId of publicIds) {
    try {
      const deleted = await deleteFile(publicId);
      if (deleted) {
        results.success.push(publicId);
      } else {
        results.failed.push(publicId);
      }
    } catch {
      results.failed.push(publicId);
    }
  }

  return results;
}

/**
 * Get resource type based on MIME type
 */
function getResourceType(mimeType: string): "image" | "raw" | "video" | "auto" {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  // PDFs and other documents should use "raw" for original file preservation
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "raw";
  }
  return "auto";
}

/**
 * Generate a thumbnail URL for an image
 */
export function getThumbnailUrl(
  publicId: string,
  width: number = 200,
  height: number = 200
): string {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: "fit",
    quality: "auto",
    format: "auto",
  });
}

/**
 * Get file info from Cloudinary
 */
export async function getFileInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary get info error:", error);
    return null;
  }
}

export { cloudinary, UPLOAD_FOLDER };
export default cloudinary;
