import { collection, doc, addDoc, updateDoc, onSnapshot, query, where, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage } from '../types';

// Every message this user is a participant in. No orderBy here on
// purpose — array-contains + orderBy would need a composite index; the
// UI sorts by createdAt itself.
export function subscribeMyMessages(uid: string, onChange: (messages: ChatMessage[]) => void): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'messages'), where('participants', 'array-contains', uid)),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<ChatMessage, 'id'>), id: d.id }))),
    (err) => console.error('subscribeMyMessages failed:', err),
  );
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
