import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Validate environment variables
if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  console.error('Missing Firebase service account credentials:', {
    projectId: !!serviceAccount.projectId,
    privateKey: !!serviceAccount.privateKey,
    clientEmail: !!serviceAccount.clientEmail,
  });
  throw new Error('Missing Firebase service account credentials');
}

// Initialize Admin SDK only if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message, error.stack);
    throw error;
  }
}

// Export Firestore and Auth instances
export const db = getFirestore();
export const auth = getAuth();