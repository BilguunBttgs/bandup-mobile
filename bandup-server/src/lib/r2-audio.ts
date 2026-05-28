// R2Bucket.createSignedUrl is a real Cloudflare Workers runtime API but is not
// yet reflected in the installed wrangler type definitions. The cast to `any`
// here is intentional; all presigned URL calls are centralized in this file so
// they are easy to update when wrangler ships the updated types.
type R2BucketWithSigning = R2Bucket & {
  createSignedUrl(
    method: "GET" | "PUT",
    key: string,
    options: { expiresIn: number },
  ): Promise<string>;
};

function signable(r2: R2Bucket): R2BucketWithSigning {
  return r2 as unknown as R2BucketWithSigning;
}

export async function getAudioPresignUrl(
  r2: R2Bucket,
  key: string,
  expiresIn = 3600
): Promise<string> {
  return signable(r2).createSignedUrl("GET", key, { expiresIn });
}

export async function getSpeakingUploadUrl(
  r2: R2Bucket,
  userId: number,
  attemptId: string,
  expiresIn = 600
): Promise<{ uploadUrl: string; audioKey: string }> {
  const audioKey = `speaking/${userId}/${attemptId}.webm`;
  const uploadUrl = await signable(r2).createSignedUrl("PUT", audioKey, { expiresIn });
  return { uploadUrl, audioKey };
}

// Key pattern: listening/{level}/{uuid}.webm
export async function getListeningUploadUrl(
  r2: R2Bucket,
  level: string,
  expiresIn = 600
): Promise<{ uploadUrl: string; audioKey: string }> {
  const audioKey = `listening/${level}/${crypto.randomUUID()}.webm`;
  const uploadUrl = await signable(r2).createSignedUrl("PUT", audioKey, { expiresIn });
  return { uploadUrl, audioKey };
}

export async function deleteAudio(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}
