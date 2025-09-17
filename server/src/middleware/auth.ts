import * as admin from 'firebase-admin';

export const verifyToken = async (token: string): Promise<string> => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    //console.log('Token verified, UID:', decodedToken.uid);
    return decodedToken.uid;
  } catch (error: any) {
    //console.error('Token verification error:', error.message, error.stack);
    throw new Error('Invalid or expired token');
  }
};

