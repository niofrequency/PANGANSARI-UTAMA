// Uploads a captured photo to Firebase Storage and returns its download
// URL. Photos went to Cloudinary for a while (its free tier was bigger
// than Storage's flat 5GB); the project is now on the paid Blaze plan,
// where Storage is far cheaper per GB than any Cloudinary plan, so new
// photos come back here. Photos already on Cloudinary keep working: their
// URLs are stored in each submission, and utils/cloudinaryUrl.ts still
// serves resized versions of them.
//
// Path: submissions/{uid}/{time}-{random}.{ext} — storage.rules only lets
// a signed-in user write into their own {uid} folder, image/* only, under
// 10MB. A year-long immutable cache header means a photo viewed again on
// the same phone comes from the browser cache instead of costing another
// download.

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export async function uploadSubmissionPhoto(dataUrl: string, uid: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage is not configured');
  const contentType = dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/jpeg';
  const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const fileRef = ref(storage, `submissions/${uid}/${name}`);
  await uploadString(fileRef, dataUrl, 'data_url', {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return getDownloadURL(fileRef);
}
