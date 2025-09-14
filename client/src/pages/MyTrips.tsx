import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, DollarSign, Users, Calendar, Hotel, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth } from "@/lib/firebase";

interface Trip {
  _id: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  numberOfPersons: number;
  tripType: "individual" | "group";
  members: { user: { _id: string; name: string; avatar?: string }; role: string; status: string }[];
  itinerary: {
    days: {
      day: number;
      activities: {
        activity: string;
        time: string;
        location: string;
        description: string;
        category: string;
        image: string;
        reactions: { user: { name: string; _id: string }; type: "like" | "dislike" }[];
      }[];
      hotels: {
        HotelName: string;
        CleanedAttractions: string;
        Address: string;
        HotelRating: string;
        HotelWebsiteUrl: string;
        HotelImage?: string;
        reactions: { user: { name: string; _id: string }; type: "like" | "dislike" }[];
      }[];
    }[];
  };
  expenses: { description: string; amount: number; paidBy: { name: string }; createdAt: string }[];
  chatMessages: { user: { name: string; avatar?: string }; message: string; timestamp: string }[];
}

const mockTrips: Trip[] = [
  {
    _id: "1",
    tripName: "Paris Adventure",
    destination: "Paris, France",
    startDate: "2025-10-01",
    endDate: "2025-10-07",
    numberOfPersons: 4,
    tripType: "group",
    members: [
      { user: { _id: "u1", name: "Alice", avatar: "https://example.com/avatar1.jpg" }, role: "Organizer", status: "Confirmed" },
      { user: { _id: "u2", name: "Bob" }, role: "Member", status: "Confirmed" },
    ],
    itinerary: {
      days: [
        {
          day: 1,
          activities: [
            {
              activity: "Eiffel Tower Visit",
              time: "10:00 AM",
              location: "Eiffel Tower",
              description: "Explore the iconic landmark with a guided tour.",
              category: "Sightseeing",
              image: "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
              reactions: [{ user: { name: "Alice", _id: "u1" }, type: "like" }],
            },
          ],
          hotels: [
            {
              HotelName: "Hotel Paris",
              CleanedAttractions: "Near Louvre",
              Address: "123 Rue de Paris",
              HotelRating: "4.5",
              HotelWebsiteUrl: "https://example.com/hotel-paris",
              HotelImage: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
              reactions: [],
            },
          ],
        },
      ],
    },
    expenses: [
      { description: "Dinner at Le Bistro", amount: 120, paidBy: { name: "Alice" }, createdAt: "2025-10-01T18:00:00Z" },
    ],
    chatMessages: [
      { user: { name: "Alice", avatar: "https://example.com/avatar1.jpg" }, message: "Excited for Paris!", timestamp: "2025-09-10T10:00:00Z" },
    ],
  },
  {
    _id: "2",
    tripName: "Solo Tokyo Exploration",
    destination: "Tokyo, Japan",
    startDate: "2025-11-01",
    endDate: "2025-11-05",
    numberOfPersons: 1,
    tripType: "individual",
    members: [{ user: { _id: "u3", name: "Charlie" }, role: "Solo Traveler", status: "Confirmed" }],
    itinerary: {
      days: [
        {
          day: 1,
          activities: [
            {
              activity: "Shibuya Crossing",
              time: "2:00 PM",
              location: "Shibuya",
              description: "Experience the famous crossing and nearby shops.",
              category: "Culture",
              image: "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg",
              reactions: [{ user: { name: "Charlie", _id: "u3" }, type: "like" }],
            },
          ],
          hotels: [
            {
              HotelName: "Tokyo Inn",
              CleanedAttractions: "Near Shibuya",
              Address: "456 Shibuya St",
              HotelRating: "4.0",
              HotelWebsiteUrl: "https://example.com/tokyo-inn",
              HotelImage: "https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg",
              reactions: [],
            },
          ],
        },
      ],
    },
    expenses: [
      { description: "Train Ticket", amount: 50, paidBy: { name: "Charlie" }, createdAt: "2025-11-01T09:00:00Z" },
    ],
    chatMessages: [],
  },
];

const MyTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleViewInvites = () => {
    // Dispatch custom event to toggle Notifications dropdown in Navbar
    window.dispatchEvent(new CustomEvent("toggleNotifications"));
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        setTrips(mockTrips); // Use mock data
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/signin" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2 text-center">My Trips</h1>
          <p className="text-xl text-center mb-8 max-w-2xl mx-auto">Explore your planned adventures, manage details, and collaborate with your travel companions.</p>
          <div className="flex justify-center gap-4">
            <Link to="/trip-planner">
              <Button
                size="lg"
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-full px-8 py-3 text-lg shadow-lg transition-all duration-200"
              >
                Plan New Trip
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-purple-200 text-white hover:bg-purple-500/20 hover:border-purple-400 font-semibold rounded-full px-8 py-3 text-lg shadow-lg transition-all duration-200"
              onClick={handleViewInvites}
            >
              View Invites
            </Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        {trips.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Trips Yet</h2>
              <p className="text-gray-600 mb-4">Start your adventure by planning a new trip or accepting an invitation.</p>
              <Link to="/trip-planner">
                <Button className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-8 py-3 text-lg shadow-lg">
                  Plan Your First Trip
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <Card key={trip._id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="text-xl">{trip.tripName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {trip.destination}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - 
                      {new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {trip.numberOfPersons} {trip.tripType === "individual" ? "traveler" : "travelers"}
                    </div>
                  </div>
                  <Tabs defaultValue="members" className="relative mr-auto w-full">
                    <TabsList className="w-full justify-start mb-4">
                      <TabsTrigger value="members">Members</TabsTrigger>
                      <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                      <TabsTrigger value="expenses">Expenses</TabsTrigger>
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                    </TabsList>
                    <TabsContent value="members" className="space-y-2">
                      {trip.members.map((member) => (
                        <div key={member.user._id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback>{member.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.user.name}</span>
                          <Badge variant="secondary">{member.role}</Badge>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="itinerary">
                      <Accordion type="single" collapsible className="w-full">
                        {trip.itinerary.days.map((day) => (
                          <AccordionItem key={day.day} value={`day-${day.day}`}>
                            <AccordionTrigger className="text-left">Day {day.day}</AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Activities</h4>
                                {day.activities.map((activity, idx) => (
                                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Clock className="w-4 h-4 text-purple-500" />
                                      <span className="font-medium">{activity.time} - {activity.activity}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                      <MapPin className="w-4 h-4" />
                                      {activity.location}
                                    </div>
                                    <p className="text-sm mb-2">{activity.description}</p>
                                    {activity.image && (
                                      <img src={activity.image} alt={activity.activity} className="w-full h-32 object-cover rounded-md mb-2" />
                                    )}
                                    <div className="flex gap-2">
                                      {activity.reactions.map((r, i) => (
                                        <Badge key={i} variant="outline" className="flex items-center gap-1">
                                          {r.type === "like" ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                                          {r.user.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <h4 className="font-semibold flex items-center gap-2 mt-4"><Hotel className="w-4 h-4" /> Hotels</h4>
                                {day.hotels.map((hotel, idx) => (
                                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                    <h5 className="font-medium mb-1">{hotel.HotelName}</h5>
                                    <p className="text-sm text-gray-600 mb-1">Rating: {hotel.HotelRating} ★</p>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      {hotel.Address}
                                    </p>
                                    <p className="text-sm mb-2">Attractions: {hotel.CleanedAttractions}</p>
                                    {hotel.HotelImage && (
                                      <img src={hotel.HotelImage} alt={hotel.HotelName} className="w-full h-32 object-cover rounded-md mb-2" />
                                    )}
                                    <a href={hotel.HotelWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline text-sm">
                                      Visit Website
                                    </a>
                                    <div className="flex gap-2 mt-2">
                                      {hotel.reactions.map((r, i) => (
                                        <Badge key={i} variant="outline" className="flex items-center gap-1">
                                          {r.type === "like" ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                                          {r.user.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="expenses" className="space-y-2">
                      {trip.expenses.map((expense, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-gray-600">Paid by {expense.paidBy.name}</p>
                            <p className="text-xs text-gray-500">{new Date(expense.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-1 text-purple-600 font-medium">
                            <DollarSign className="w-4 h-4" />
                            {expense.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="chat" className="space-y-3 max-h-48 overflow-y-auto">
                      {trip.chatMessages.map((msg, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.user.avatar} />
                            <AvatarFallback>{msg.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-medium text-sm">{msg.user.name}</span>
                              <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm mt-1">{msg.message}</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Link to={trip.tripType === "group" ? `/group-trip/${trip._id}` : `/solo-trip/${trip._id}`}>
                    <Button className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-6 py-2 text-lg shadow-lg">
                      View Full Trip
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default MyTrips;