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
import { toast } from "@/components/ui/sonner";

interface Trip {
  _id: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  numberOfPersons: number;
  tripType: "individual" | "group";
  members: any[];
  itinerary: {
    days: {
      day: number;
      activities: any[];
      hotels: any[];
    }[];
  };
  expenses: any[];
  chatMessages: any[];
}

const MyTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleViewInvites = () => {
    window.dispatchEvent(new CustomEvent("toggleNotifications"));
  };

  useEffect(() => {
    let mounted = true;
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!mounted) return;
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        setTrips([]);
        return;
      }
      setIsAuthenticated(true);
      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken(true);
        const res = await fetch("http://localhost:3002/api/trips", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || res.statusText);
        }
        const body = await res.json();
        if (!body.success) throw new Error(body.message || "Failed to fetch trips");

        // normalize and resolve message/expense user names using members
        const normalized = (body.data || []).map((t: any) => {
          const members = t.members || [];
          const memberLookup: Record<string, any> = {};
          members.forEach((m: any) => {
            if (!m) return;
            if (m.id) memberLookup[m.id] = { name: m.name, avatar: m.avatar };
            else if (m.user && (m.user._id || m.user.id)) {
              const id = m.user._id || m.user.id;
              memberLookup[id] = { name: m.user.name || m.name, avatar: m.user.avatar };
            }
          });

          // ensure itinerary.days exists and each day has activities & hotels
          const itinerary = t.itinerary && Array.isArray(t.itinerary.days) ? t.itinerary : { days: [] };
          const days = itinerary.days.map((d: any) => ({
            day: d.day,
            activities: (d.activities || []).map((a: any) => ({
              ...a,
              activity: a.activity || a.title || a.name || '',
              time: a.time || '',
              location: a.location || '',
              description: a.description || '',
              category: a.category || a.type || '',
              image: a.image || '',
              reactions: a.reactions || [],
            })),
            hotels: (d.hotels || []).map((h: any) => ({
              ...h,
              HotelName: h.HotelName || h.name || '',
              HotelImage: h.HotelImage || h.HotelImage || h.image || '',
              CleanedAttractions: h.CleanedAttractions || h.attractions || '',
              Address: h.Address || h.address || '',
              HotelRating: h.HotelRating || h.rating || '',
              HotelWebsiteUrl: h.HotelWebsiteUrl || h.url || '',
              reactions: h.reactions || [],
            })),
          }));

          // normalize expenses: ensure paidBy is an object with name
          const expenses = (t.expenses || []).map((exp: any, idx: number) => {
            let paidBy = exp.paidBy;
            if (!paidBy) {
              // try resolve by paidByUserId
              if (exp.paidByUserId && memberLookup[exp.paidByUserId]) paidBy = { name: memberLookup[exp.paidByUserId].name };
              else paidBy = { name: 'Unknown' };
            } else if (typeof paidBy === 'string') {
              paidBy = { name: paidBy };
            } else if (paidBy.name) {
              paidBy = { name: paidBy.name };
            } else {
              paidBy = { name: 'Unknown' };
            }
            return { id: exp.id || `exp-${idx}`, description: exp.description, amount: Number(exp.amount || 0), paidBy, createdAt: exp.createdAt || exp.timestamp || null };
          });

          // normalize messages: ensure message.user exists with name & avatar
          const chatMessages = (t.chatMessages || []).map((m: any, idx: number) => {
            let user: any = null;
            if (m.user && typeof m.user === 'object') {
              user = { name: m.user.name || m.user.displayName || 'Unknown', avatar: m.user.avatar || m.user.photoURL };
            } else if (m.userId && memberLookup[m.userId]) {
              user = { name: memberLookup[m.userId].name, avatar: memberLookup[m.userId].avatar };
            } else if (m.userName) {
              user = { name: m.userName };
            } else if (m.name) {
              user = { name: m.name };
            } else {
              user = { name: 'Unknown' };
            }
            return {
              id: m.id || `msg-${idx}`,
              user,
              message: m.message || m.text || '',
              timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
            };
          });

          const tripType = t.tripType || ((members && members.length > 1) ? 'group' : 'individual');

          return {
            _id: t._id || t.id || t.tripId,
            tripName: t.tripName || t.name || '',
            destination: t.destination || '',
            startDate: t.startDate || '',
            endDate: t.endDate || '',
            numberOfPersons: t.numberOfPersons || 1,
            tripType,
            members,
            itinerary: { days },
            expenses,
            chatMessages,
          } as Trip;
        });

        setTrips(normalized);
      } catch (err: any) {
        console.error("Fetch trips failed:", err);
        setError(err?.message || "Failed to load trips");
        toast.error(err?.message || "Failed to load trips");
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsub();
      mounted = false;
    };
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
        {error && (
          <Card className="mb-6 bg-red-50 border border-red-100">
            <CardContent>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

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
                <CardHeader className="bg-purple-50 p-4">
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
                      {trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : '—'} -{" "}
                      {trip.endDate ? new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : '—'}
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
                      {trip.members.map((member, idx) => {
                        const displayName = member.user?.name || member.name || (member.user?.displayName) || "Member";
                        const avatar = member.user?.avatar || member.avatar;
                        const key = member.user?._id || member.id || `${trip._id}-member-${idx}`;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={avatar} />
                              <AvatarFallback>{displayName[0] ?? "M"}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{displayName}</span>
                            <Badge variant="secondary">{member.role || "Member"}</Badge>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="itinerary">
                      {(!trip.itinerary || !Array.isArray(trip.itinerary.days) || trip.itinerary.days.length === 0) ? (
                        <p className="text-sm text-gray-600">No itinerary available for this trip.</p>
                      ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {trip.itinerary.days.map((day) => (
                            <AccordionItem key={`${trip._id}-day-${day.day}`} value={`day-${day.day}`}>
                              <AccordionTrigger className="text-left">Day {day.day}</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4">
                                  <h4 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Activities</h4>
                                  {(!day.activities || day.activities.length === 0) ? (
                                    <p className="text-sm text-gray-600">No activities planned for this day.</p>
                                  ) : (
                                    day.activities.map((activity, idx) => (
                                      <div key={`${trip._id}-day-${day.day}-act-${idx}`} className="bg-gray-50 p-3 rounded-lg">
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
                                          {(activity.reactions || []).map((r, i) => (
                                            <Badge key={`${trip._id}-day-${day.day}-act-${idx}-r-${i}`} variant="outline" className="flex items-center gap-1">
                                              {r.type === "like" ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                                              {r.user.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ))
                                  )}

                                  <h4 className="font-semibold flex items-center gap-2 mt-4"><Hotel className="w-4 h-4" /> Hotels</h4>
                                  {(!day.hotels || day.hotels.length === 0) ? (
                                    <p className="text-sm text-gray-600">No hotels suggested for this day.</p>
                                  ) : (
                                    day.hotels.map((hotel, idx) => (
                                      <div key={`${trip._id}-day-${day.day}-hotel-${idx}`} className="bg-gray-50 p-3 rounded-lg">
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
                                        {hotel.HotelWebsiteUrl && (
                                          <a href={hotel.HotelWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline text-sm">
                                            Visit Website
                                          </a>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                          {(hotel.reactions || []).map((r, i) => (
                                            <Badge key={`${trip._id}-day-${day.day}-hotel-${idx}-r-${i}`} variant="outline" className="flex items-center gap-1">
                                              {r.type === "like" ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                                              {r.user.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </TabsContent>

                    <TabsContent value="expenses" className="space-y-2">
                      {(!trip.expenses || trip.expenses.length === 0) ? (
                        <p className="text-sm text-gray-600">No expenses recorded.</p>
                      ) : (
                        trip.expenses.map((expense, idx) => (
                          <div key={`${trip._id}-expense-${idx}`} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{expense.description}</p>
                              <p className="text-xs text-gray-600">Paid by {expense.paidBy?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                            <div className="flex items-center gap-1 text-purple-600 font-medium">
                              <DollarSign className="w-4 h-4" />
                              {(Number(expense.amount) || 0).toFixed(2)}
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="chat" className="space-y-3 max-h-48 overflow-y-auto">
                      {(!trip.chatMessages || trip.chatMessages.length === 0) ? (
                        <p className="text-sm text-gray-600">No chat messages yet.</p>
                      ) : (
                        trip.chatMessages.map((msg, idx) => {
                          const name = msg.user?.name || 'Unknown';
                          const avatar = msg.user?.avatar;
                          return (
                            <div key={`${trip._id}-msg-${idx}`} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={avatar} />
                                <AvatarFallback>{name?.[0] || "U"}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex justify-between items-baseline">
                                  <span className="font-medium text-sm">{name}</span>
                                  <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm mt-1">{msg.message}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Link
                    to={
                      trip.tripType === 'group'
                        ? `/group-trip/${trip._id}`
                        : trip.tripType === 'individual'
                          ? `/solo-trip/${trip._id}`
                          : (trip.members && trip.members.length > 1)
                            ? `/group-trip/${trip._id}`
                            : `/solo-trip/${trip._id}`
                    }
                  >
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
