import {
  ANNOUNCEMENT_ATTACHMENT_MAX_BYTES,
  ANNOUNCEMENT_ATTACHMENT_MAX_COUNT,
} from "@/modules/file/domain/upload-policy";

export function isAnnouncementAttachmentSetAllowed(files: Array<{ size: number }>): boolean {
  return files.length <= ANNOUNCEMENT_ATTACHMENT_MAX_COUNT &&
    files.reduce((sum, file) => sum + file.size, 0) <= ANNOUNCEMENT_ATTACHMENT_MAX_BYTES;
}
