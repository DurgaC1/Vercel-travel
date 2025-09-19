import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  MapPin,
  Users,
  Calendar,
  Gift,
  MessageSquare,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "invite" | "birthday" | "message" | "update";
  title: string;
  message: string;
  sender?: { id: string; name: string; avatar?: string };
  trip?: {
    id: string;
    tripName: string;
    destination: string;
    startDate: string;
  };
  status:
    | "pending"
    | "sent"
    | "recorded_not_sent"
    | "accepted"
    | "declined"
    | "read";
  timestamp: string;
}

interface NotificationsProps {
  onUpdateUnreadCount: (count: number) => void;
}

const mockNotifications: Notification[] = [
  {
    id: "notif1",
    type: "invite",
    title: "Trip Invitation",
    message: "Alice Johnson invited you to Paris Group Adventure",
    sender: {
      id: "u1",
      name: "Alice Johnson",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    },
    trip: {
      id: "trip1",
      tripName: "Paris Group Adventure",
      destination: "Paris, France",
      startDate: "2025-10-15",
    },
    status: "pending",
    timestamp: "2025-09-10T14:30:00Z",
  },
  {
    id: "notif2",
    type: "birthday",
    title: "Birthday Wish",
    message:
      "Happy Birthday from the Travel Genie team! Enjoy 20% off your next trip booking.",
    sender: {
      id: "system",
      name: "Travel Genie Team",
      avatar: "https://example.com/travelai-logo.png",
    },
    status: "pending",
    timestamp: "2025-09-11T00:00:00Z",
  },
  {
    id: "notif3",
    type: "message",
    title: "New Message",
    message: "Bob Smith: Hey, check out this new hotel option for Tokyo!",
    sender: {
      id: "u2",
      name: "Bob Smith",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    trip: {
      id: "trip2",
      tripName: "Tokyo Food Tour",
      destination: "Tokyo, Japan",
      startDate: "2025-11-01",
    },
    status: "pending",
    timestamp: "2025-09-08T10:15:00Z",
  },
  {
    id: "notif4",
    type: "update",
    title: "Trip Update",
    message:
      "Your flight to Paris has been confirmed. Check details in the app.",
    sender: {
      id: "system",
      name: "Travel Genie System",
    },
    trip: {
      id: "trip1",
      tripName: "Paris Group Adventure",
      destination: "Paris, France",
      startDate: "2025-10-15",
    },
    status: "read",
    timestamp: "2025-09-07T16:45:00Z",
  },
];

const Notifications: React.FC<NotificationsProps> = ({
  onUpdateUnreadCount,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsLoading(true);
      if (!user) {
        setIsAuthenticated(false);
        setNotifications([]);
        onUpdateUnreadCount(0);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      try {
        const token = await user.getIdToken(true);
        const res = await fetch("http://localhost:3002/api/invites", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // parse safely
        let body: any = null;
        try {
          body = await res.json();
        } catch (parseErr) {
          console.warn("Invites response JSON parse failed:", parseErr);
          throw new Error("Invalid response from server");
        }

        if (!res.ok) {
          // surface server message (no fallback to sample data)
          const serverMessage =
            body?.message || res.statusText || "Failed to load notifications";
          throw new Error(serverMessage);
        }

        // successful response
        const invitesData = body?.data || [];
        const inviteNotifications: Notification[] = invitesData.map(
          (invite: any) => ({
            id: invite.id,
            type: "invite",
            title: "Trip Invitation",
            message: `${invite.inviterName} invited you to ${invite.tripName}`,
            sender: {
              id: invite.invitedById || "unknown",
              name: invite.inviterName || "Unknown",
            },
            trip: {
              id: invite.tripId,
              tripName: invite.tripName,
              destination: invite.destination,
              startDate: invite.createdAt || new Date().toISOString(),
            },
            status: invite.status || "pending",
            timestamp: invite.createdAt || new Date().toISOString(),
          })
        );

        // ONLY show actual invites (do not mix with mock data)
        setNotifications(inviteNotifications);

        const unreadCount = inviteNotifications.filter((n) =>
          ["pending", "sent", "recorded_not_sent"].includes(n.status)
        ).length;

        onUpdateUnreadCount(unreadCount);
      } catch (err: any) {
        console.error("Fetch notifications error:", err);
        // don't use mock data — show empty state and surface toast
        setNotifications([]);
        onUpdateUnreadCount(0);
        toast.error(err?.message || "Failed to load notifications");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [onUpdateUnreadCount]);

  const handleAccept = async (id: string, type: string, tripId?: string) => {
    if (type !== "invite") {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, status: "read" } : notif
        )
      );
      onUpdateUnreadCount(
        notifications.filter(
          (notif) =>
            notif.id !== id &&
            ["pending", "sent", "recorded_not_sent"].includes(notif.status)
        ).length
      );
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(
        `http://localhost:3002/api/invites/${id}/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      let body: any = null;
      try {
        body = await res.json();
      } catch (parseErr) {
        console.warn("Failed to parse accept invite response JSON", parseErr);
      }
      if (!res.ok) {
        throw new Error(body?.message || "Failed to accept invite");
      }
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, status: "accepted" } : notif
        )
      );
      onUpdateUnreadCount(
        notifications.filter(
          (notif) =>
            notif.id !== id &&
            ["pending", "sent", "recorded_not_sent"].includes(notif.status)
        ).length
      );
      toast.success("Invite accepted successfully!");
      if (tripId) {
        navigate(`/group-trip/${tripId}`);
      }
    } catch (err: any) {
      console.error("Accept invite error:", err);
      toast.error(err.message || "Failed to accept invite.");
    }
  };

  const handleDecline = async (id: string, type: string) => {
    if (type !== "invite") {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, status: "read" } : notif
        )
      );
      onUpdateUnreadCount(
        notifications.filter(
          (notif) =>
            notif.id !== id &&
            ["pending", "sent", "recorded_not_sent"].includes(notif.status)
        ).length
      );
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch(
        `http://localhost:3002/api/invites/${id}/decline`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      let body: any = null;
      try {
        body = await res.json();
      } catch (parseErr) {
        console.warn("Failed to parse decline invite response JSON", parseErr);
      }
      if (!res.ok) {
        throw new Error(body?.message || "Failed to decline invite");
      }
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, status: "declined" } : notif
        )
      );
      onUpdateUnreadCount(
        notifications.filter(
          (notif) =>
            notif.id !== id &&
            ["pending", "sent", "recorded_not_sent"].includes(notif.status)
        ).length
      );
      toast.success("Invite declined successfully!");
    } catch (err: any) {
      console.error("Decline invite error:", err);
      toast.error(err.message || "Failed to decline invite.");
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "invite":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "birthday":
        return <Gift className="h-5 w-5 text-pink-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case "update":
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <Card className="w-full bg-white shadow-lg">
        <CardContent className="p-4 text-center">
          <p className="text-gray-500">
            {isLoading
              ? "Loading notifications..."
              : "Please sign in to view notifications"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="w-full bg-white shadow-lg">
        <CardContent className="p-4 text-center">
          <p className="text-gray-500">No new notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white shadow-lg max-h-[24rem] overflow-y-auto">
      <CardContent className="p-4">
        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={notif.sender?.avatar}
                  alt={notif.sender?.name}
                />
                <AvatarFallback>
                  {notif.sender?.name[0]?.toUpperCase() || "T"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getIconForType(notif.type)}
                    <h3 className="text-sm font-medium">
                      {notif.sender?.name || "System"}
                    </h3>
                    <Badge
                      variant={
                        ["pending", "sent", "recorded_not_sent"].includes(
                          notif.status
                        )
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {notif.type}
                    </Badge>
                    {notif.type === "invite" && (
                      <Badge
                        variant={
                          notif.status === "accepted"
                            ? "default"
                            : notif.status === "declined"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {notif.status}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(notif.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm font-semibold mt-1">{notif.title}</p>
                <p className="text-sm text-purple-800 truncate">
                  {notif.message}
                </p>
                {notif.trip && (
                  <div className="mt-1 text-xs text-gray-500 flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{notif.trip.destination}</span>
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(notif.trip.startDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}
                {["pending", "sent", "recorded_not_sent"].includes(
                  notif.status
                ) && (
                  <div className="mt-2 flex space-x-2">
                    {notif.type === "invite" && notif.trip ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAccept(notif.id, notif.type, notif.trip.id)
                          }
                          className="bg-purple-500 text-white hover:bg-purple-600"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-500 hover:bg-purple-200"
                          onClick={() => handleDecline(notif.id, notif.type)}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-500 hover:bg-purple-200"
                        onClick={() => handleAccept(notif.id, notif.type)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Notifications;
