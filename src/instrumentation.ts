export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_UPLOAD_CLEANUP_WORKER === "true") {
    return;
  }
  const { startUploadCleanupWorker } = await import(
    "@/modules/file/infrastructure/upload-cleanup-worker"
  );
  startUploadCleanupWorker();
}
