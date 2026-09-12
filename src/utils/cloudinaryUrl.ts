// Cloudinary can transform an image on the fly just by editing its URL —
// no separate resize step, no extra copies to manage. Used everywhere a
// submission/report photo is actually *displayed*, as opposed to
// uploaded (see services/cloudinaryPhotoService.ts for the upload side):
// a photo gets viewed far more times than it's ever uploaded — a
// reviewing Supervisor, a Manager browsing history, Admin's Activity tab
// — and Cloudinary's free tier counts bandwidth the same as storage, so
// serving a smaller, modern-format (WebP where supported) rendition on
// every view matters more for staying inside that free tier than
// compressing once at upload time ever could.
//
// Safe to call on ANY photoUrl, not just Cloudinary ones: a URL that
// doesn't look like a Cloudinary delivery URL — an old Firebase Storage
// photo from before this switch, or a local base64 data URL in demo mode
// — is returned unchanged.
export function cloudinaryUrl(url: string | undefined, width: number): string | undefined {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const transform = `f_auto,q_auto,w_${width}`;
  return url.slice(0, i + marker.length) + transform + '/' + url.slice(i + marker.length);
}
