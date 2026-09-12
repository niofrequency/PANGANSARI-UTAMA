// Uploads submission photos straight to Cloudinary — only called when
// Firebase is configured (see lib/firebase.ts). In demo mode,
// PhotoCapture.tsx never calls this; photos just stay as local data
// URLs, same as before.
//
// This used to upload to Firebase Storage instead (see storage.rules'
// header comment for that history — old photos there keep working,
// nothing here touches them). Moved off it because Firebase Storage's
// free tier is a flat 5GB, while a submission's photo gets *viewed*
// (a reviewing supervisor, a manager, Admin's Activity tab) far more
// times than it's ever uploaded — Cloudinary's free tier is far more
// generous on both storage and bandwidth, and src/utils/cloudinaryUrl.ts
// serves an auto-optimized version on every view instead of the
// original, which matters more for staying inside a free tier than
// compressing once at upload time ever could.
//
// The browser never holds Cloudinary's API secret: it asks
// functions/src/index.ts's mintCloudinaryUploadSignature for a
// short-lived signature first (that function checks the caller is
// actually signed in, nothing else), then uploads directly to
// Cloudinary's own endpoint using it — the photo bytes never pass
// through our own server, only that small signing step does.

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

interface CloudinaryUploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  // A ceiling on what actually gets stored (see this function's own
  // comment in functions/src/index.ts) — sent as-is, exactly as signed;
  // changing it here without the function also changing it would just
  // make the signature invalid and the upload rejected.
  transformation: string;
}

export async function uploadSubmissionPhoto(dataUrl: string): Promise<string> {
  if (!functions) throw new Error('Firebase is not configured');

  const mintSignature = httpsCallable<void, CloudinaryUploadSignature>(functions, 'mintCloudinaryUploadSignature');
  const { data: sig } = await mintSignature();

  const form = new FormData();
  form.append('file', dataUrl);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('transformation', sig.transformation);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status}): ${body}`);
  }
  const json: { secure_url: string } = await res.json();
  return json.secure_url;
}
