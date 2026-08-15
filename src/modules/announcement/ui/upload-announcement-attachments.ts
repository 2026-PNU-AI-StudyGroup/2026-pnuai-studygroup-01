"use client";

import {
  uploadStoredFile,
  type FileUploadProgress,
} from "@/modules/file/ui/upload-file";

export type AnnouncementUploadProgress = {
  fileIndex: number;
  fileCount: number;
  fileName: string;
  progress: FileUploadProgress;
};

export async function appendAnnouncementUploads(
  formData: FormData,
  files: File[],
  completedUploads: Map<File, string>,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: AnnouncementUploadProgress) => void;
  } = {},
): Promise<void> {
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    let uploadId = completedUploads.get(file);
    if (!uploadId) {
      uploadId = await uploadStoredFile({ purpose: "ANNOUNCEMENT" }, file, {
        signal: options.signal,
        onProgress: (progress) => options.onProgress?.({
          fileIndex: index,
          fileCount: files.length,
          fileName: file.name,
          progress,
        }),
      });
      completedUploads.set(file, uploadId);
    }
    formData.append("newAttachmentUploadIds", uploadId);
  }
}
