import express from 'express';
import { db } from '../config/firebase';
import { verifyToken } from '../middleware/auth';
import nodemailer from "nodemailer";

const router = express.Router();

// Helper to normalize member lookup from different shapes
function buildMemberLookup(members: any[]) {
  const map: Record<string, { id?: string; name: string; avatar?: string; role?: string; status?: string }> = {};
  if (!Array.isArray(members)) return map;
  for (const m of members) {
    // possible shapes:
    // { id: 'uid', name: 'Alice', role: 'Organizer' }
    // { user: { _id: 'uid', name: 'Alice', avatar: '...' }, role: 'Member', status: 'Confirmed' }
    // { userId: 'uid', name: 'Alice' } (rare)
    if (m == null) continue;
    if (m.id) {
      map[m.id] = { id: m.id, name: m.name || (m.user && m.user.name) || 'Unknown', avatar: m.avatar || (m.user && m.user.avatar), role: m.role, status: m.status };
    } else if (m.user && (m.user._id || m.user.id)) {
      const id = m.user._id || m.user.id;
      map[id] = { id, name: m.user.name || m.name || 'Unknown', avatar: m.user.avatar, role: m.role, status: m.status };
    } else if (m.user && typeof m.user === 'string') {
      // fallback
      map[m.user] = { id: m.user, name: m.name || m.user, avatar: undefined, role: m.role, status: m.status };
    } else if (m.userId) {
      map[m.userId] = { id: m.userId, name: m.name || 'Unknown', avatar: undefined, role: m.role, status: m.status };
    } else {
      // last resort: try to use m.name as synthetic id
      const syntheticId = m.name || JSON.stringify(m);
      map[syntheticId] = { id: syntheticId, name: m.name || 'Unknown', avatar: m.avatar, role: m.role, status: m.status };
    }
  }
  return map;
}

// -----------------------------------------------------------------------------
// GET /api/trips
// Return trips the authenticated user belongs to, with normalized itinerary.days,
// activities, hotels, expenses, and chatMessages. Resolve user names for messages
// and expenses using trip members when possible.
// -----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const uid = await verifyToken(token);

    // NOTE: if your trips collection is large, use a memberIds field and query by it instead.
    const tripsSnapshot = await db.collection('trips').get();
    const results: any[] = [];

    for (const doc of tripsSnapshot.docs) {
      const data = doc.data() as any;
      if (!data) continue;
      const members = data.members || [];
      // determine whether current user is a member (support both shapes)
      const isMember = (members || []).some((m: any) => {
        if (!m) return false;
        if (m.id && m.id === uid) return true;
        if (m.user && (m.user._id === uid || m.user.id === uid)) return true;
        if (m.userId && m.userId === uid) return true;
        return false;
      });
      if (!isMember) continue;

      const tripId = doc.id;
      const memberLookup = buildMemberLookup(members);

      // Prefer itinerary in trip doc if present and contains days
      let itinerary: any = null;
      if (data.itinerary && Array.isArray(data.itinerary.days) && data.itinerary.days.length > 0) {
        itinerary = {
          days: data.itinerary.days.map((d: any) => ({
            day: d.day,
            activities: (d.activities || []).map((a: any) => ({
              time: a.time || a.time || '',
              activity: a.activity || a.title || a.name || '',
              location: a.location || '',
              description: a.description || '',
              category: a.category || a.type || '',
              image: a.image || a.imageUrl || '',
              reactions: a.reactions || [],
            })),
            hotels: (d.hotels || []).map((h: any) => ({
              HotelName: h.HotelName || h.name || '',
              CleanedAttractions: h.CleanedAttractions || h.attractions || '',
              Address: h.Address || h.address || '',
              HotelRating: h.HotelRating || h.rating || '',
              HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
              HotelImage: h.HotelImage || h.image || '',
              reactions: h.reactions || [],
            })),
          })),
        };
      }

      // If no itinerary, build days from activities subcollection
      if (!itinerary) {
        const activitiesSnap = await db.collection('trips').doc(tripId).collection('activities').get();
        const daysMap: Record<number, { day: number; activities: any[]; hotels: any[] }> = {};

        activitiesSnap.forEach((aDoc) => {
          const a = aDoc.data() as any;
          const dayNum = Number(a.day) || 1;
          if (!daysMap[dayNum]) daysMap[dayNum] = { day: dayNum, activities: [], hotels: [] };
          daysMap[dayNum].activities.push({
            time: a.time || '',
            activity: a.title || a.activity || '',
            location: a.location || '',
            description: a.description || '',
            category: a.type || a.category || '',
            image: a.image || '',
            reactions: a.reactions || [],
          });
        });

        // Hotels: attach from doc itinerary days if present
        const hotelsFromDoc: Record<number, any[]> = {};
        if (data.itinerary && Array.isArray(data.itinerary.days)) {
          for (const d of data.itinerary.days) {
            const dn = Number(d.day) || 1;
            hotelsFromDoc[dn] = (d.hotels || []).map((h: any) => ({
              HotelName: h.HotelName || h.name || '',
              CleanedAttractions: h.CleanedAttractions || h.attractions || '',
              Address: h.Address || h.address || '',
              HotelRating: h.HotelRating || h.rating || '',
              HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
              HotelImage: h.HotelImage || h.image || '',
              reactions: h.reactions || [],
            }));
          }
        }

        const daysArr = Object.values(daysMap)
          .sort((a, b) => a.day - b.day)
          .map((d) => ({ day: d.day, activities: d.activities, hotels: hotelsFromDoc[d.day] || [] }));

        // If no activities and doc has itinerary.hotels, create day 1 with hotels; else empty day 1
        if (daysArr.length === 0) {
          const hotelsForDay1 = (data.itinerary && data.itinerary.days && data.itinerary.days[0] && data.itinerary.days[0].hotels)
            ? (data.itinerary.days[0].hotels || []).map((h: any) => ({
              HotelName: h.HotelName || h.name || '',
              CleanedAttractions: h.CleanedAttractions || h.attractions || '',
              Address: h.Address || h.address || '',
              HotelRating: h.HotelRating || h.rating || '',
              HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
              HotelImage: h.HotelImage || h.image || '',
              reactions: h.reactions || [],
            }))
            : [];
          itinerary = { days: [{ day: 1, activities: [], hotels: hotelsForDay1 }] };
        } else {
          itinerary = { days: daysArr };
        }
      }

      // Expenses: prefer subcollection if exists; normalize paidBy to object { name }
      let expenses: any[] = [];
      try {
        const expSnap = await db.collection('trips').doc(tripId).collection('expenses').get();
        if (!expSnap.empty) {
          expenses = expSnap.docs.map((d) => {
            const raw = d.data() as any;
            let paidBy = raw.paidBy;
            if (typeof paidBy === 'string') paidBy = { name: paidBy };
            else if (paidBy && paidBy.name) paidBy = { name: paidBy.name, id: paidBy.id, avatar: paidBy.avatar };
            else {
              // try resolve by id
              if (raw.paidByUserId && memberLookup[raw.paidByUserId]) {
                paidBy = { name: memberLookup[raw.paidByUserId].name };
              } else paidBy = { name: raw.paidBy || 'Unknown' };
            }
            return { id: d.id, description: raw.description, amount: raw.amount || 0, paidBy, createdAt: raw.createdAt || raw.timestamp || null };
          });
        } else if (Array.isArray(data.expenses)) {
          expenses = (data.expenses || []).map((raw: any, i: number) => {
            let paidBy = raw.paidBy;
            if (typeof paidBy === 'string') paidBy = { name: paidBy };
            else if (paidBy && paidBy.name) paidBy = { name: paidBy.name, id: paidBy.id };
            else if (raw.paidByUserId && memberLookup[raw.paidByUserId]) {
              paidBy = { name: memberLookup[raw.paidByUserId].name };
            } else paidBy = { name: paidBy?.name || 'Unknown' };
            return { id: raw.id || `doc-${i}`, description: raw.description, amount: raw.amount || 0, paidBy, createdAt: raw.createdAt || raw.timestamp || null };
          });
        }
      } catch (e) {
        expenses = data.expenses || [];
      }

      // Messages: prefer subcollection; normalize message.user to { name, avatar }
      let chatMessages: any[] = [];
      try {
        const msgSnap = await db.collection('trips').doc(tripId).collection('messages').orderBy('timestamp', 'asc').get();
        if (!msgSnap.empty) {
          chatMessages = msgSnap.docs.map((d) => {
            const raw = d.data() as any;
            let userObj: any = null;
            if (raw.user) {
              // if stored as { name, avatar }
              if (typeof raw.user === 'object') userObj = { name: raw.user.name || raw.user.displayName || 'Unknown', avatar: raw.user.avatar || raw.user.photoURL };
              else userObj = { name: String(raw.user) || 'Unknown' };
            } else if (raw.userId && memberLookup[raw.userId]) {
              userObj = { name: memberLookup[raw.userId].name, avatar: memberLookup[raw.userId].avatar };
            } else if (raw.userName) {
              userObj = { name: raw.userName };
            } else {
              userObj = { name: 'Unknown' };
            }
            return {
              id: d.id,
              user: userObj,
              message: raw.message || '',
              timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
            };
          });
        } else if (Array.isArray(data.messages) || Array.isArray(data.chatMessages)) {
          const rawArray = data.messages || data.chatMessages || [];
          chatMessages = rawArray.map((raw: any, idx: number) => {
            let userObj: any = null;
            if (raw.user) {
              if (typeof raw.user === 'object') userObj = { name: raw.user.name || raw.user.displayName || 'Unknown', avatar: raw.user.avatar || raw.user.photoURL };
              else userObj = { name: String(raw.user) || 'Unknown' };
            } else if (raw.userId && memberLookup[raw.userId]) {
              userObj = { name: memberLookup[raw.userId].name, avatar: memberLookup[raw.userId].avatar };
            } else if (raw.userName) {
              userObj = { name: raw.userName };
            } else userObj = { name: raw.name || 'Unknown' };
            return {
              id: raw.id || `msg-${idx}`,
              user: userObj,
              message: raw.message || raw.text || '',
              timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
            };
          });
        }
      } catch (e) {
        chatMessages = data.messages || data.chatMessages || [];
      }

      // Determine tripType robustly
      let tripType = data.tripType;
      if (!tripType) {
        try {
          const memberCount = Array.isArray(members) ? members.length : (members ? 1 : 0);
          tripType = memberCount > 1 ? 'group' : 'individual';
        } catch (e) {
          tripType = 'group';
        }
      }

      results.push({
        _id: tripId,
        tripName: data.name || data.tripName || '',
        destination: data.destination || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        numberOfPersons: data.numberOfPersons || data.partySize || 1,
        tripType,
        members,
        itinerary,
        expenses,
        chatMessages,
        createdAt: data.createdAt || null,
      });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (err: any) {
    console.error('List trips error:', err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});



// Unified Create Trip endpoint (supports group or individual payload shapes)
router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const uid = await verifyToken(token);

    // Accept both group and individual fields. Normalize them below.
    const {
      name,
      destination,
      numberOfPersons,
      startDate,
      endDate,
      categories,
      budget,
      tripType,
      userName,
    } = req.body || {};

    // minimal required fields for any trip
    if (!name || !destination || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // normalize dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    // normalize tripType
    const normalizedTripType = tripType === 'individual' ? 'individual' : 'group';

    // For group trips use provided numberOfPersons, default to 2 if not provided (safe fallback)
    const normalizedNumberOfPersons = normalizedTripType === 'group'
      ? (Number(numberOfPersons) > 0 ? Number(numberOfPersons) : 2)
      : 1; // individual trips are 1 person

    // For individual trips keep budget; safe default if not provided
    const normalizedBudget = budget || 'Medium';

    // Build members array in normalized shape: { id, name, role, status }
    const organizerName = userName || req.body.userName || 'Organizer';
    const members = [{ id: uid, name: organizerName, role: 'Organizer', status: 'Confirmed' }];

    const trip = {
      name,
      destination,
      tripType: normalizedTripType,
      organizerId: uid,
      members,
      numberOfPersons: normalizedNumberOfPersons,
      startDate,
      endDate,
      categories: Array.isArray(categories) ? categories : [],
      // include budget only for individual trips (but harmless to include always)
      budget: normalizedBudget,
      createdAt: new Date().toISOString(),
    };

    const tripRef = await db.collection('trips').add(trip);
    return res.status(201).json({ success: true, tripId: tripRef.id, message: 'Trip created successfully' });
  } catch (error: any) {
    console.error('Create trip error:', error.message || error);
    return res.status(500).json({ success: false, message: error.message || String(error) });
  }
});


// Get a trip
router.get('/:tripId', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const tripDoc = await db.collection('trips').doc(req.params.tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const tripData = tripDoc.data();
    if (!tripData?.members.some((m: any) => m.id === uid)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }
    res.status(200).json({ success: true, data: { tripId: tripDoc.id, ...tripData } });
  } catch (error: any) {
    console.error('Get trip error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/trips/:tripId  -> update trip fields (allowed: itinerary, name, dates, categories, numberOfPersons)
router.patch('/:tripId', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const tripId = req.params.tripId;
    const updates = req.body || {};

    // whitelist allowed fields to avoid accidental writes
    const allowed = ['itinerary', 'name', 'startDate', 'endDate', 'categories', 'numberOfPersons', 'members'];
    const docUpdates: any = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) docUpdates[key] = updates[key];
    }

    if (Object.keys(docUpdates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const tripRef = db.collection('trips').doc(tripId);

    // Optional: ensure only organizer or member can update — simple check (uncomment if needed)
    // const tripSnap = await tripRef.get();
    // if (tripSnap.exists) {
    //   const trip = tripSnap.data();
    //   if (trip?.organizerId && trip.organizerId !== uid) {
    //     return res.status(403).json({ success: false, message: 'Only organizer can update trip' });
    //   }
    // }

    await tripRef.update({ ...docUpdates, updatedAt: new Date().toISOString() });

    return res.status(200).json({ success: true, message: 'Trip updated' });
  } catch (error: any) {
    console.error('Patch trip error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add activity to a trip (with duplicate check)
router.post('/:tripId/activities', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const uid = await verifyToken(token);
    const tripRef = db.collection('trips').doc(req.params.tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const tripData = tripDoc.data();
    if (!tripData?.members.some((m: any) => m.id === uid)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }

    const { title, day, time } = req.body;

    if (!title || !day) {
      return res.status(400).json({ success: false, message: 'Missing required fields (title, day)' });
    }

    // 🔍 Check for duplicates (same day + title)
    const existingSnapshot = await tripRef
      .collection('activities')
      .where('day', '==', day)
      .where('title', '==', title)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({ success: false, message: 'This activity is already present' });
    }

    // Add new activity
    const activity = {
      ...req.body,
      votes: req.body.votes || 0,
      proposedBy: req.body.proposedBy || 'You',
      createdAt: new Date().toISOString(),
    };

    const activityRef = await tripRef.collection('activities').add(activity);

    res.status(201).json({
      success: true,
      activityId: activityRef.id,
      message: 'Activity added successfully',
    });
  } catch (error: any) {
    console.error('Add activity error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Add expense to a trip
router.post('/:tripId/expenses', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const tripDoc = await db.collection('trips').doc(req.params.tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const tripData = tripDoc.data();
    if (!tripData?.members.some((m: any) => m.id === uid)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }
    const expense = {
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    const expenseRef = await db.collection('trips').doc(req.params.tripId).collection('expenses').add(expense);
    res.status(201).json({ success: true, expenseId: expenseRef.id, message: 'Expense added successfully' });
  } catch (error: any) {
    console.error('Add expense error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add chat message to a trip
router.post('/:tripId/messages', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const tripDoc = await db.collection('trips').doc(req.params.tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const tripData = tripDoc.data();
    if (!tripData?.members.some((m: any) => m.id === uid)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }
    const message = {
      userId: uid,
      userName: req.body.userName || 'You',
      message: req.body.message,
      timestamp: new Date().toISOString(),
    };
    const messageRef = await db.collection('trips').doc(req.params.tripId).collection('messages').add(message);
    res.status(201).json({ success: true, messageId: messageRef.id, message: 'Message added successfully' });
  } catch (error: any) {
    console.error('Add message error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get chat messages for a trip
router.get('/:tripId/messages', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const uid = await verifyToken(token);
    const tripDoc = await db.collection('trips').doc(req.params.tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const tripData = tripDoc.data();
    if (!tripData?.members.some((m: any) => m.id === uid)) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }
    const messagesSnapshot = await db.collection('trips').doc(req.params.tripId).collection('messages').orderBy('timestamp', 'asc').get();
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Get messages error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});















// POST /api/trips - Create a new individual trip
router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const uid = await verifyToken(token);
    const { name, destination, startDate, endDate, budget, categories, userName } = req.body;

    if (!name || !destination || !startDate || !endDate || !budget) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    const tripData = {
      name,
      destination,
      numberOfPersons: 1, // Individual trip
      startDate,
      endDate,
      budget,
      categories: Array.isArray(categories) ? categories : [],
      members: [{ id: uid, name: userName || 'Traveler', role: 'Organizer', status: 'Confirmed' }],
      tripType: 'individual',
      createdAt: new Date().toISOString(),
    };

    const tripRef = await db.collection('trips').add(tripData);
    return res.status(201).json({ success: true, tripId: tripRef.id });
  } catch (err: any) {
    console.error('Create trip error:', err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// GET /api/trips/:id - Get individual trip details
router.get('/:id', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const uid = await verifyToken(token);
    const tripId = req.params.id;

    const tripDoc = await db.collection('trips').doc(tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const data = tripDoc.data() as any;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Trip data not found' });
    }

    const members = data.members || [];
    const isMember = members.some((m: any) => {
      if (!m) return false;
      if (m.id && m.id === uid) return true;
      if (m.user && (m.user._id === uid || m.user.id === uid)) return true;
      if (m.userId && m.userId === uid) return true;
      return false;
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }

    const memberLookup = buildMemberLookup(members);

    let itinerary: any = null;
    if (data.itinerary && Array.isArray(data.itinerary.days) && data.itinerary.days.length > 0) {
      itinerary = {
        days: data.itinerary.days.map((d: any) => ({
          day: d.day,
          activities: (d.activities || []).map((a: any) => ({
            time: a.time || '',
            activity: a.activity || a.title || '',
            location: a.location || '',
            description: a.description || '',
            category: a.category || a.type || '',
            image: a.image || a.imageUrl || '',
            rating: a.rating || '',
            reviews: a.reviews || '',
          })),
          hotels: (d.hotels || []).map((h: any) => ({
            HotelName: h.HotelName || h.name || '',
            CleanedAttractions: h.CleanedAttractions || h.attractions || '',
            Address: h.Address || h.address || '',
            HotelRating: h.HotelRating || h.rating || '',
            HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
            HotelImage: h.HotelImage || h.image || '',
          })),
        })),
      };
    }

    if (!itinerary) {
      const activitiesSnap = await db.collection('trips').doc(tripId).collection('activities').get();
      const daysMap: Record<number, { day: number; activities: any[]; hotels: any[] }> = {};

      activitiesSnap.forEach((aDoc) => {
        const a = aDoc.data() as any;
        const dayNum = Number(a.day) || 1;
        if (!daysMap[dayNum]) daysMap[dayNum] = { day: dayNum, activities: [], hotels: [] };
        daysMap[dayNum].activities.push({
          time: a.time || '',
          activity: a.title || a.activity || '',
          location: a.location || '',
          description: a.description || '',
          category: a.type || a.category || '',
          image: a.image || '',
          rating: a.rating || '',
          reviews: a.reviews || '',
        });
      });

      const hotelsFromDoc: Record<number, any[]> = {};
      if (data.itinerary && Array.isArray(data.itinerary.days)) {
        for (const d of data.itinerary.days) {
          const dn = Number(d.day) || 1;
          hotelsFromDoc[dn] = (d.hotels || []).map((h: any) => ({
            HotelName: h.HotelName || h.name || '',
            CleanedAttractions: h.CleanedAttractions || h.attractions || '',
            Address: h.Address || h.address || '',
            HotelRating: h.HotelRating || h.rating || '',
            HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
            HotelImage: h.HotelImage || h.image || '',
          }));
        }
      }

      const daysArr = Object.values(daysMap)
        .sort((a, b) => a.day - b.day)
        .map((d) => ({ day: d.day, activities: d.activities, hotels: hotelsFromDoc[d.day] || [] }));

      if (daysArr.length === 0) {
        const hotelsForDay1 = (data.itinerary && data.itinerary.days && data.itinerary.days[0] && data.itinerary.days[0].hotels)
          ? data.itinerary.days[0].hotels.map((h: any) => ({
              HotelName: h.HotelName || h.name || '',
              CleanedAttractions: h.CleanedAttractions || h.attractions || '',
              Address: h.Address || h.address || '',
              HotelRating: h.HotelRating || h.rating || '',
              HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
              HotelImage: h.HotelImage || h.image || '',
            }))
          : [];
        itinerary = { days: [{ day: 1, activities: [], hotels: hotelsForDay1 }] };
      } else {
        itinerary = { days: daysArr };
      }
    }

    const result = {
      _id: tripId,
      tripName: data.name || data.tripName || '',
      destination: data.destination || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      budget: data.budget || 'Medium',
      categories: data.categories || [],
      numberOfPersons: 1,
      tripType: 'individual',
      members,
      itinerary,
      createdAt: data.createdAt || null,
    };

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get trip error:', err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// PATCH /api/trips/:id - Update individual trip itinerary
router.patch('/:id', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const uid = await verifyToken(token);
    const tripId = req.params.id;
    const { itinerary } = req.body;

    const tripDoc = await db.collection('trips').doc(tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const data = tripDoc.data() as any;
    const members = data.members || [];
    const isMember = members.some((m: any) => {
      if (!m) return false;
      if (m.id && m.id === uid) return true;
      if (m.user && (m.user._id === uid || m.user.id === uid)) return true;
      if (m.userId && m.userId === uid) return true;
      return false;
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }

    await db.collection('trips').doc(tripId).update({ itinerary });
    return res.status(200).json({ success: true, message: 'Itinerary updated successfully' });
  } catch (err: any) {
    console.error('Patch trip error:', err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// POST /api/trips/:id/activities - Add activity to individual trip
router.post('/:id/activities', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const uid = await verifyToken(token);
    const tripId = req.params.id;
    const { day, time, title, type, duration, cost, description, image, rating, reviews } = req.body;

    if (!title || !time || !type || !description || !day) {
      return res.status(400).json({ success: false, message: 'Missing required activity fields' });
    }

    const tripDoc = await db.collection('trips').doc(tripId).get();
    if (!tripDoc.exists) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const data = tripDoc.data() as any;
    const members = data.members || [];
    const isMember = members.some((m: any) => {
      if (!m) return false;
      if (m.id && m.id === uid) return true;
      if (m.user && (m.user._id === uid || m.user.id === uid)) return true;
      if (m.userId && m.userId === uid) return true;
      return false;
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to trip' });
    }

    // Check for duplicate activity
    const activitiesSnap = await db.collection('trips').doc(tripId).collection('activities').get();
    const existingActivity = activitiesSnap.docs.find(doc => {
      const act = doc.data();
      return act.day === day && act.title.toLowerCase() === title.toLowerCase();
    });

    if (existingActivity) {
      return res.status(409).json({ success: false, message: 'This activity is already present' });
    }

    const activityData = {
      day: Number(day),
      time,
      title,
      type,
      duration: duration || '2 hours',
      cost: cost || '$',
      description,
      image: image || '',
      rating: rating || '',
      reviews: reviews || '',
      proposedBy: data.members.find((m: any) => m.id === uid)?.name || 'Traveler',
      createdAt: new Date().toISOString(),
    };

    const activityRef = await db.collection('trips').doc(tripId).collection('activities').add(activityData);
    return res.status(201).json({ success: true, activityId: activityRef.id });
  } catch (err: any) {
    console.error('Add activity error:', err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
});










export default router;