// Uploads photo evidence to Firebase Storage — only called when Firebase
// is configured (see lib/firebase.ts). In demo mode, PhotoCapture.tsx
// never calls this; photos just stay as local data URLs.
//
// Why this exists at all: a submission's photo used to be embedded
// directly as a base64 data URL, which is fine in memory but is several
// hundred KB to a few MB per photo once stored — and until now, submissions
// (including that base64) were written to localStorage unconditionally,
// even in Firebase mode, with nothing pruning old ones. Enough
// photo-carrying submissions and that hits the browser's storage quota
// outright (see the try/catch around localStorage.setItem in
// useAppStore.ts for what happens when it does). Uploading the photo here
// and storing only its short download URL in the submission avoids that
// growth entirely for anyone running in Firebase mode.

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

// `uid` scopes the path to the uploader (see storage.rules — a signed-in
// user can only write into their own folder, matching who Firebase Auth
// actually says they are, not a client-supplied value).
export async function uploadSubmissionPhoto(uid: string, dataUrl: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage is not configured');
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const photoRef = ref(storage, `submissions/${uid}/${fileName}`);
  await uploadString(photoRef, dataUrl, 'data_url');
  return getDownloadURL(photoRef);
}
