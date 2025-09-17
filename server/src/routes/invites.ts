import express from 'express';
import { db } from '../config/firebase';
import { verifyToken } from '../middleware/auth';
import * as admin from 'firebase-admin';

const router = express.Router();

// Get pending invites for a user
router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const userDoc = await db.collection('users').doc(uid).get();
    const userEmail = userDoc.data()?.email;
    if (!userEmail) {
      return res.status(404).json({ success: false, message: 'User email not found' });
    }

    const invitesSnapshot = await db.collection('invites')
      .where('email', '==', userEmail)
      .where('status', '==', 'pending')
      .get();

    const invites = await Promise.all(
      invitesSnapshot.docs.map(async (doc) => {
        const inviteData = doc.data();
        const tripDoc = await db.collection('trips').doc(inviteData.tripId).get();
        const tripData = tripDoc.data();
        return {
          id: doc.id,
          tripId: inviteData.tripId,
          tripName: tripData?.name || 'Unnamed Trip',
          destination: tripData?.destination || 'Unknown Destination',
          inviterName: inviteData.inviterName,
          createdAt: inviteData.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Get invites error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept an invite
router.post('/:inviteId/accept', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const inviteDoc = await db.collection('invites').doc(req.params.inviteId).get();
    if (!inviteDoc.exists) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }
    const inviteData = inviteDoc.data();
    if (!inviteData) {
      return res.status(404).json({ success: false, message: 'Invite data not found' });
    }
    const userDoc = await db.collection('users').doc(uid).get();
    const userEmail = userDoc.data()?.email;

    if (inviteData.email !== userEmail) {
      return res.status(403).json({ success: false, message: 'Unauthorized to accept this invite' });
    }

    const tripRef = db.collection('trips').doc(inviteData.tripId);
    await tripRef.update({
      members: admin.firestore.FieldValue.arrayUnion({
        id: uid,
        name: userDoc.data()?.displayName || inviteData.email.split('@')[0],
        role: 'Member',
      }),
    });

    await inviteDoc.ref.update({ status: 'accepted' });
    res.status(200).json({ success: true, message: 'Invite accepted successfully' });
  } catch (error: any) {
    console.error('Accept invite error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Decline an invite
router.post('/:inviteId/decline', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const inviteDoc = await db.collection('invites').doc(req.params.inviteId).get();
    if (!inviteDoc.exists) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }
    const inviteData = inviteDoc.data();
    if (!inviteData) {
      return res.status(404).json({ success: false, message: 'Invite data not found' });
    }
    const userDoc = await db.collection('users').doc(uid).get();
    const userEmail = userDoc.data()?.email;

    if (inviteData.email !== userEmail) {
      return res.status(403).json({ success: false, message: 'Unauthorized to decline this invite' });
    }

    await inviteDoc.ref.update({ status: 'declined' });
    res.status(200).json({ success: true, message: 'Invite declined successfully' });
  } catch (error: any) {
    console.error('Decline invite error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;