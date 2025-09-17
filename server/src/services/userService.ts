import { db, auth } from '../config/firebase';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  createdAt: string;
}

export const createUserProfile = async (uid: string, profile: UserProfile) => {
  try {
    if (!uid) throw new Error('Invalid UID');
    const userRef = db.collection('users').doc(uid);
    await userRef.set(profile, { merge: true }); // Use merge to avoid overwriting
    console.log(`Profile created for UID: ${uid}`, profile);
    return { success: true, message: 'Profile created successfully' };
  } catch (error: any) {
    console.error('Error creating user profile:', error.message, error.stack);
    throw new Error('Failed to create user profile: ' + error.message);
  }
};

export const getUserProfile = async (uid: string) => {
  try {
    if (!uid) throw new Error('Invalid UID');
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      return userSnap.data() as UserProfile;
    } else {
      throw new Error('User profile not found');
    }
  } catch (error: any) {
    console.error('Error fetching user profile:', error.message, error.stack);
    throw new Error('Failed to fetch user profile: ' + error.message);
  }
};

export const verifyToken = async (token: string) => {
  try {
    if (!token) throw new Error('No token provided');
    const decodedToken = await auth.verifyIdToken(token);
    console.log(`Token verified for UID: ${decodedToken.uid}`);
    return decodedToken.uid;
  } catch (error: any) {
    console.error('Error verifying token:', error.message, error.stack);
    throw new Error('Invalid or expired token: ' + error.message);
  }
};