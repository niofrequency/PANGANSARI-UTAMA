import { collection, doc, addDoc, updateDoc, onSnapshot, query, where, orderBy, limit, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage } from '../types';

// This user's newest messages (up to 1,000 — months of normal chat), so
// a long-time user's phone doesn't download their entire history on every
// open. Needs the (participants, createdAt desc) index; until that's built
// right after a deploy, falls back to the plain participant query.
const MESSAGE_LIMIT = 1000;
export function subscribeMyMessages(uid: string, onChange: (messages: ChatMessage[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const col = collection(db, 'messages');
  let unsub: () => void = () => {};
  const start = (bounded: boolean) => {
    unsub = onSnapshot(
      bounded
        ? query(col, where('participants', 'array-contains', uid), orderBy('createdAt', 'desc'), limit(MESSAGE_LIMIT))
        : query(col, where('participants', 'array-contains', uid)),
      (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<ChatMessage, 'id'>), id: d.id }))),
      (err) => {
        if (bounded && (err as { code?: string }).code === 'failed-precondition') { start(false); return; }
        console.error('subscribeMyMessages failed:', err);
      },
    );
  };
  start(true);
  return () => unsub();
}

export async function addMessageDoc(message: Omit<ChatMessage, 'id'>): Promise<void> {
  if (!db) return;
  // sentAt is the server's clock — firestore.rules uses it for the
  // 15-minute edit window (a phone's own clock can't be trusted).
  await addDoc(collection(db, 'messages'), { ...message, sentAt: serverTimestamp() });
}

export async function editMessageDoc(id: string, text: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'messages', id), { text, editedAt: new Date().toISOString() });
}

export async function deleteMessageForEveryoneDoc(id: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'messages', id), { deleted: true, text: '', deletedAt: new Date().toISOString() });
}

export async function hideMessageForMeDoc(id: string, uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'messages', id), { hiddenFor: arrayUnion(uid) });
}

export async function markMessageReadDoc(id: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'messages', id), { read: true });
}
