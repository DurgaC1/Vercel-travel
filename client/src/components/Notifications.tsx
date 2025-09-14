import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, MapPin, Users, Calendar, Gift, MessageSquare } from "lucide-react";
import { auth } from "@/lib/firebase";

interface Notification {
  _id: string;
  type: "invite" | "birthday" | "message" | "update";
  title: string;
  message: string;
  sender?: { _id: string; name: string; avatar?: string };
  trip?: { _id: string; tripName: string; destination: string; startDate: string };
  status: "pending" | "read";
  timestamp: string;
}

interface NotificationsProps {
  onUpdateUnreadCount: (count: number) => void;
}

const mockNotifications: Notification[] = [
  {
    _id: "notif1",
    type: "invite",
    title: "Trip Invitation",
    message: "Alice Johnson invited you to Paris Group Adventure",
    sender: {
      _id: "u1",
      name: "Alice Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    },
    trip: {
      _id: "trip1",
      tripName: "Paris Group Adventure",
      destination: "Paris, France",
      startDate: "2025-10-15",
    },
    status: "pending",
    timestamp: "2025-09-10T14:30:00Z",
  },
  {
    _id: "notif2",
    type: "birthday",
    title: "Birthday Wish",
    message: "Happy Birthday from the TravelAI team! Enjoy 20% off your next trip booking.",
    sender: {
      _id: "system",
      name: "TravelAI Team",
      avatar: "https://example.com/travelai-logo.png",
    },
    status: "pending",
    timestamp: "2025-09-11T00:00:00Z",
  },
  {
    _id: "notif3",
    type: "message",
    title: "New Message",
    message: "Bob Smith: Hey, check out this new hotel option for Tokyo!",
    sender: {
      _id: "u2",
      name: "Bob Smith",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    trip: {
      _id: "trip2",
      tripName: "Tokyo Food Tour",
      destination: "Tokyo, Japan",
      startDate: "2025-11-01",
    },
    status: "pending",
    timestamp: "2025-09-08T10:15:00Z",
  },
  {
    _id: "notif4",
    type: "update",
    title: "Trip Update",
    message: "Your flight to Paris has been confirmed. Check details in the app.",
    sender: {
      _id: "system",
      name: "TravelAI System",
    },
    trip: {
      _id: "trip1",
      tripName: "Paris Group Adventure",
      destination: "Paris, France",
      startDate: "2025-10-15",
    },
    status: "read",
    timestamp: "2025-09-07T16:45:00Z",
  },
];

const Notifications: React.FC<NotificationsProps> = ({ onUpdateUnreadCount }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        setNotifications(mockNotifications);
        onUpdateUnreadCount(mockNotifications.filter((notif) => notif.status === "pending").length);
      } else {
        setIsAuthenticated(false);
        setNotifications([]);
        onUpdateUnreadCount(0);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [onUpdateUnreadCount]);

  const handleAccept = (id: string, type: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif._id === id ? { ...notif, status: "read" } : notif
      )
    );
    const newUnreadCount = notifications.filter(
      (notif) => notif._id !== id && notif.status === "pending"
    ).length;
    onUpdateUnreadCount(newUnreadCount);
    console.log(`Accepted ${type}: ${id}`);
  };

  const handleDecline = (id: string, type: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif._id === id ? { ...notif, status: "read" } : notif
      )
    );
    const newUnreadCount = notifications.filter(
      (notif) => notif._id !== id && notif.status === "pending"
    ).length;
    onUpdateUnreadCount(newUnreadCount);
    console.log(`Declined ${type}: ${id}`);
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
          <p className="text-gray-500">{isLoading ? "Loading notifications..." : "Please sign in to view notifications"}</p>
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
              key={notif._id}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={notif.sender?.avatar} alt={notif.sender?.name} />
                <AvatarFallback>{notif.sender?.name[0]?.toUpperCase() || "T"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getIconForType(notif.type)}
                    <h3 className="text-sm font-medium">{notif.sender?.name || "System"}</h3>
                    <Badge
                      variant={notif.status === "pending" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {notif.type}
                    </Badge>
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
                <p className="text-sm text-purple-800 truncate">{notif.message}</p>
                {notif.trip && (
                  <div className="mt-1 text-xs text-gray-500 flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{notif.trip.destination}</span>
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(notif.trip.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {notif.status === "pending" && (
                  <div className="mt-2 flex space-x-2">
                    {notif.type === "invite" && notif.trip ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(notif._id, notif.type)}
                          className="bg-purple-500 text-white hover:bg-purple-600"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-500 hover:bg-purple-200"
                          onClick={() => handleDecline(notif._id, notif.type)}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-500 hover:bg-purple-200"
                        onClick={() => handleAccept(notif._id, notif.type)}
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