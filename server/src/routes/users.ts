import express from 'express';
import { createUserProfile, verifyToken } from '../services/userService';
import { db } from '../config/firebase';

const router = express.Router();

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  createdAt: string;
}

router.post('/profile', async (req, res) => {
  //console.log('Received /profile request:', req.body, req.headers.authorization);
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const profile: UserProfile = req.body;
  if (!profile.firstName || !profile.lastName || !profile.email || !profile.createdAt) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const uid = await verifyToken(token);
    await createUserProfile(uid, profile);
    res.status(201).json({ success: true, message: 'Profile created successfully' });
  } catch (error: any) {
    //console.error('Profile creation error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to create profile' });
  }
});

// Temporary test endpoint
router.post('/test-write', async (req, res) => {
  try {
    const testData = { testField: 'test', timestamp: new Date().toISOString() };
    await db.collection('test').doc('test-doc').set(testData);
    //console.log('Test write successful:', testData);
    res.status(200).json({ success: true, message: 'Test write successful', data: testData });
  } catch (error: any) {
    console.error('Test write error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Test write failed: ' + error.message });
  }
});

export default router;