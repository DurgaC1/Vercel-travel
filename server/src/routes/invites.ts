import express, { Request, Response } from "express";
import { db } from "../config/firebase";
import { verifyToken } from "../middleware/auth";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

const router = express.Router();

// GET /api/invites
router.get("/", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  // helper to convert various createdAt formats to ISO string
  const createdAtToISO = (value: any) => {
    try {
      if (!value) return new Date().toISOString();
      // Firestore Timestamp (admin SDK)
      if (typeof value === "object" && typeof value.toDate === "function") {
        return value.toDate().toISOString();
      }
      // string ISO
      if (typeof value === "string") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      }
      // number (ms)
      if (typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      }
      return new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  try {
    const uid = await verifyToken(token);
    const userDoc = await db.collection("users").doc(uid).get();
    const userEmailRaw = userDoc.data()?.email;
    if (!userEmailRaw) {
      return res.status(404).json({ success: false, message: "User email not found" });
    }
    const userEmail = String(userEmailRaw).toLowerCase();

    // Use an explicitly typed query reference to avoid TS complaints
    let queryRef: FirebaseFirestore.Query = db.collection("invites");

    if (req.query.tripId) {
      queryRef = db.collection("invites").where("tripId", "==", String(req.query.tripId));
    } else {
      queryRef = queryRef.where("email", "==", userEmail).where("status", "in", ["pending", "sent", "recorded_not_sent"]);
    }

    const invitesSnapshot = await queryRef.get();

    const invites = await Promise.all(
      invitesSnapshot.docs.map(async (doc) => {
        const inviteData: any = doc.data() || {};
        let tripName = "Unnamed Trip";
        let destination = "Unknown Destination";

        if (inviteData.tripId) {
          try {
            const tripDoc = await db.collection("trips").doc(inviteData.tripId).get();
            const tripData = tripDoc.exists ? tripDoc.data() : null;
            tripName = tripData?.name || tripName;
            destination = tripData?.destination || destination;
          } catch (tripErr) {
            console.warn("Failed to load trip for invite:", doc.id, tripErr);
          }
        }

        return {
          id: doc.id,
          tripId: inviteData.tripId,
          tripName,
          destination,
          inviterName: inviteData.inviterName || "Unknown",
          invitedById: inviteData.invitedById || null,
          email: inviteData.email,
          status: inviteData.status || "pending",
          createdAt: createdAtToISO(inviteData.createdAt),
        };
      })
    );

    return res.status(200).json({ success: true, data: invites });
  } catch (error: any) {
    console.error("Get invites error:", { message: error?.message, stack: error?.stack });
    return res.status(500).json({ success: false, message: error?.message || "Internal server error" });
  }
});


// POST /api/invites/:inviteId/accept
router.post("/:inviteId/accept", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
  try {
    const uid = await verifyToken(token);
    const inviteDoc = await db
      .collection("invites")
      .doc(req.params.inviteId)
      .get();
    if (!inviteDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found" });
    }
    const inviteData = inviteDoc.data();
    if (!inviteData) {
      return res
        .status(404)
        .json({ success: false, message: "Invite data not found" });
    }
    const userDoc = await db.collection("users").doc(uid).get();
    const userEmail = userDoc.data()?.email?.toLowerCase();

    if (inviteData.email?.toLowerCase() !== userEmail) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to accept this invite",
        });
    }

    const tripRef = db.collection("trips").doc(inviteData.tripId);
    await tripRef.update({
      members: admin.firestore.FieldValue.arrayUnion({
        id: uid,
        name: userDoc.data()?.displayName || inviteData.email.split("@")[0],
        role: "Member",
        status: "Confirmed",
      }),
    });

    await inviteDoc.ref.update({
      status: "accepted",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res
      .status(200)
      .json({ success: true, message: "Invite accepted successfully" });
  } catch (error: any) {
    console.error("Accept invite error:", {
      message: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// POST /api/invites/:inviteId/decline
router.post("/:inviteId/decline", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
  try {
    const uid = await verifyToken(token);
    const inviteDoc = await db
      .collection("invites")
      .doc(req.params.inviteId)
      .get();
    if (!inviteDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found" });
    }
    const inviteData = inviteDoc.data();
    if (!inviteData) {
      return res
        .status(404)
        .json({ success: false, message: "Invite data not found" });
    }
    const userDoc = await db.collection("users").doc(uid).get();
    const userEmail = userDoc.data()?.email?.toLowerCase();

    if (inviteData.email?.toLowerCase() !== userEmail) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to decline this invite",
        });
    }

    await inviteDoc.ref.update({
      status: "declined",
      declinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res
      .status(200)
      .json({ success: true, message: "Invite declined successfully" });
  } catch (error: any) {
    console.error("Decline invite error:", {
      message: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
});

// POST /api/trips/:tripId/invite
router.post("/:tripId/invite", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });

  const { tripId } = req.params;
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res
      .status(400)
      .json({ success: false, message: "A valid email is required" });
  }

  try {
    const uid = await verifyToken(token);
    // Try to get inviter name from user profile, fallback to request body or "Organizer"
    const userDoc = await db
      .collection("users")
      .doc(uid)
      .get()
      .catch(() => null);
    const inviterNameFromUser = userDoc?.exists
      ? userDoc.data()?.displayName || userDoc.data()?.name
      : undefined;
    const inviterName =
      (req.body.inviterName && String(req.body.inviterName).trim()) ||
      inviterNameFromUser ||
      "Organizer";

    // Ensure trip exists
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists)
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    const tripData = tripDoc.data() || {};

    // Record invite (store normalized email and server timestamp)
    const inviteRef = await db.collection("invites").add({
      tripId,
      email: email.trim().toLowerCase(), // normalize email on write
      inviterName,
      invitedById: uid,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // ALWAYS serverTimestamp
    });

    // Try to send email only if SMTP env configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    let emailSent = false;
    let sendError: string | null = null;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465, // Use TLS for port 587, SSL for 465
          auth: { user: smtpUser, pass: smtpPass },
        });

        // Verify SMTP connection
        await transporter.verify();

        const inviteUrl = `${
          process.env.FRONTEND_BASE || "http://localhost:8080"
        }/group-trip/${tripId}?inviteId=${inviteRef.id}`;

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || smtpUser,
          to: email.trim(),
          subject: `You're invited to join "${tripData?.name || "a trip"}"`,
          html: `<p>${inviterName} invited you to join "<strong>${
            tripData?.name || "Untitled Trip"
          }</strong>" to ${tripData?.destination || "a destination"}.</p>
                 <p><a href="${inviteUrl}">View / accept invite</a></p>`,
        });

        await db.collection("invites").doc(inviteRef.id).update({
          status: "sent",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        emailSent = true;
      } catch (err: any) {
        console.error("Invite email send failed:", {
          message: err.message,
          stack: err.stack,
          code: err.code,
          errno: err.errno,
          syscall: err.syscall,
        });
        sendError = err.message || "Unknown email send error";
        await db
          .collection("invites")
          .doc(inviteRef.id)
          .update({
            status: "failed",
            error: sendError,
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          .catch((updateErr) => {
            console.error(
              "Failed to update invite status to failed:",
              updateErr
            );
          });
      }
    } else {
      await db
        .collection("invites")
        .doc(inviteRef.id)
        .update({
          status: "recorded_not_sent",
          error: "SMTP configuration missing",
        })
        .catch((updateErr) => {
          console.error(
            "Failed to update invite status to recorded_not_sent:",
            updateErr
          );
        });
      sendError = "SMTP configuration missing";
    }

    const message = emailSent
      ? "Invite recorded and email sent"
      : sendError
      ? `Invite recorded but email failed: ${sendError}`
      : "Invite recorded (email not sent - SMTP not configured)";

    return res
      .status(200)
      .json({
        success: true,
        inviteId: inviteRef.id,
        email: email.trim(),
        message,
      });
  } catch (err: any) {
    console.error("Invite handler error:", {
      message: err.message,
      stack: err.stack,
    });
    return res
      .status(500)
      .json({
        success: false,
        message: err.message || "Internal server error",
      });
  }
});

export default router;
