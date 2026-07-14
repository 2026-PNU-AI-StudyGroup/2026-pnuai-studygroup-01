import { S3Client } from "@aws-sdk/client-s3";

import { parseObjectStorageEnvironment } from "@/shared/infrastructure/object-storage/environment";

const environment = parseObjectStorageEnvironment(process.env);

export const objectStorageBucket = environment.MINIO_BUCKET;
export const s3 = new S3Client({
  endpoint: environment.S3_ENDPOINT,
  region: environment.S3_REGION,
  forcePathStyle: environment.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: environment.S3_ACCESS_KEY,
    secretAccessKey: environment.S3_SECRET_KEY,
  },
});
