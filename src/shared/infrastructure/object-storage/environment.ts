import { z } from "zod";

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const objectStorageEnvironmentSchema = z.object({
  MINIO_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanString,
});

export function parseObjectStorageEnvironment(environment: Record<string, string | undefined>) {
  return objectStorageEnvironmentSchema.parse(environment);
}
