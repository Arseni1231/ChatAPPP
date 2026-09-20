import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function createFirestore(config) {
  const app = getApps()[0] || initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey
    })
  });

  const firestore = getFirestore(app);
  console.log('Firebase Firestore initialized');
  return firestore;
}
