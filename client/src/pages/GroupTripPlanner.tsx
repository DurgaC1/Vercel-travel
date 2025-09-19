import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { Plus, Clock, Share, Users, ThumbsUp, ThumbsDown } from "lucide-react";
import { parse, ParseResult } from "papaparse";
import { toast } from "@/components/ui/sonner";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

interface City {
  id: string;
  name: string;
  country: string;
}

interface Activity {
  id?: string;
  day: number;
  time: string;
  title: string;
  type: string;
  duration: string;
  cost: string;
  description: string;
  image: string;
  reactions: {
    user: { name: string; _id: string };
    type: "like" | "dislike";
  }[];
  proposedBy: string;
}

interface Hotel {
  HotelName: string;
  CleanedAttractions: string;
  Address: string;
  HotelRating: string;
  HotelWebsiteUrl: string;
  HotelImage?: string;
  reactions: {
    user: { name: string; _id: string };
    type: "like" | "dislike";
  }[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
}

interface TripDay {
  day: number;
  date: string;
  activities: number;
  hotels: Hotel[];
}

interface TripPlan {
  tripId?: string;
  name: string;
  destination: string;
  members: { id: string; name: string; role: string; status: string }[];
  numberOfPersons: number;
  startDate: string;
  endDate: string;
  categories: string[];
}

interface ItineraryResponse {
  best_time_to_visit: string;
  days: {
    day: number;
    activities: {
      time: string;
      activity: string;
      location: string;
      description: string;
      category: string;
    }[];
    hotels: Hotel[];
  }[];
}

const tripCategories = [
  "Hindu temple",
  "Heritage museum",
  "Garden",
  "Park",
  "Museum",
  "Historical landmark",
  "Historical place museum",
  "Public beach",
  "Catholic cathedral",
  "Hill station",
  "Scenic spot",
  "Nature preserve",
  "Vista point",
  "Archaeological site",
  "Mosque",
  "Religious destination",
  "Fortress",
  "History museum",
  "Catholic church",
  "Shrine",
  "National park",
  "Jain temple",
  "Archaeological museum",
  "Ecological park",
  "Heritage building",
  "Lake",
  "Observatory",
  "Church",
  "Art museum",
  "Monastery",
  "Buddhist temple",
  "Hiking area",
  "Anglican church",
  "National forest",
  "Monument",
  "Gurudwara",
  "Castle",
  "Wax museum",
  "Wildlife refuge",
  "Wildlife and safari park",
  "Wildlife park",
  "Beach pavillion",
  "Beach",
];

const mockItinerary: ItineraryResponse = {
  best_time_to_visit: "Spring",
  days: [
    {
      day: 1,
      activities: [
        {
          time: "10:00 AM",
          activity: "Visit Museum",
          location: "City Museum",
          description: "Explore local history and art.",
          category: "Culture",
        },
        {
          time: "2:00 PM",
          activity: "City Tour",
          location: "Downtown",
          description: "Guided tour of city landmarks.",
          category: "Culture",
        },
      ],
      hotels: [
        {
          HotelName: "Grand Hotel",
          CleanedAttractions: "Monument",
          Address: "123 Main St, Sample City",
          HotelRating: "4.5",
          HotelWebsiteUrl: "http://grandhotel.com",
          reactions: [],
        },
        {
          HotelName: "City Lodge",
          CleanedAttractions: "Temple",
          Address: "456 Central Ave, Sample City",
          HotelRating: "4.0",
          HotelWebsiteUrl: "http://citylodge.com",
          reactions: [],
        },
        {
          HotelName: "Heritage Inn",
          CleanedAttractions: "Museum",
          Address: "789 Old Town Rd, Sample City",
          HotelRating: "4.2",
          HotelWebsiteUrl: "http://heritageinn.com",
          reactions: [],
        },
      ],
    },
    {
      day: 2,
      activities: [
        {
          time: "9:00 AM",
          activity: "Beach Visit",
          location: "City Beach",
          description: "Relax by the shore.",
          category: "Leisure",
        },
      ],
      hotels: [
        {
          HotelName: "Seaside Resort",
          CleanedAttractions: "Beach",
          Address: "101 Coastal Rd, Sample City",
          HotelRating: "4.7",
          HotelWebsiteUrl: "http://seasideresort.com",
          reactions: [],
        },
        {
          HotelName: "Downtown Suites",
          CleanedAttractions: "Mall",
          Address: "202 City Center, Sample City",
          HotelRating: "4.3",
          HotelWebsiteUrl: "http://downtownsuites.com",
          reactions: [],
        },
        {
          HotelName: "Riverside Hotel",
          CleanedAttractions: "River",
          Address: "303 River Rd, Sample City",
          HotelRating: "4.1",
          HotelWebsiteUrl: "http://riversidehotel.com",
          reactions: [],
        },
      ],
    },
  ],
};

const GroupTripPlanner = () => {
  const navigate = useNavigate();
  const params = useParams<{ tripId?: string }>();
  const queryTripId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tripId")
      : null;
  const routeTripId = params.tripId || queryTripId || undefined;

  const [selectedDay, setSelectedDay] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlan>({
    name: "",
    destination: "",
    members: [],
    numberOfPersons: 1,
    startDate: "",
    endDate: "",
    categories: [],
  });
  const [tripDays, setTripDays] = useState<TripDay[]>([]);
  const [dayActivities, setDayActivities] = useState<{
    [key: number]: Activity[];
  }>({});
  const [aiSuggestions, setAiSuggestions] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [chatMessages, setChatMessages] = useState<
    { id: string; userName: string; message: string; timestamp: string }[]
  >([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingItinerary, setIsFetchingItinerary] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    paidBy: auth.currentUser?.displayName || "You",
  });
  const [activityForm, setActivityForm] = useState({
    day: 1,
    time: "",
    title: "",
    type: "",
    duration: "2 hours",
    cost: "$",
    description: "",
    image: "",
    proposedBy: auth.currentUser?.displayName || "You",
  });

  const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Auth listener -> only authentication tasks here
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsLoading(true);
      if (user) {
        setIsAuthenticated(true);
        setTripPlan((prev) => ({
          ...prev,
          members: [
            {
              id: user.uid,
              name: user.displayName || "You",
              role: "Organizer",
              status: "Confirmed",
            },
          ],
        }));
        setExpenseForm((prev) => ({
          ...prev,
          paidBy: user.displayName || "You",
        }));
        setActivityForm((prev) => ({
          ...prev,
          proposedBy: user.displayName || "You",
        }));
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load trip details when routeTripId is available and user authenticated
  useEffect(() => {
    const loadTrip = async () => {
      if (!routeTripId) return;
      if (!auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken(true);
        const response = await fetch(
          `http://localhost:3002/api/trips/${routeTripId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch trip: ${text}`);
        }
        const { data } = await response.json();
        setTripPlan({
          tripId: data.tripId || routeTripId,
          name: data.name || "",
          destination: data.destination || "",
          members: data.members || [],
          numberOfPersons: data.numberOfPersons || 1,
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          categories: data.categories || [],
        });

        if (data.startDate && data.endDate) {
          const startDate = new Date(data.startDate);
          const endDate = new Date(data.endDate);
          const duration = Math.max(
            Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            ),
            1
          );
          const newTripDays: TripDay[] = [];
          for (let i = 0; i < duration; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            newTripDays.push({
              day: i + 1,
              date: date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              activities: 0,
              hotels:
                data.itinerary?.days?.find((d: any) => d.day === i + 1)
                  ?.hotels || [],
            });
          }
          setTripDays(newTripDays);
        }
      } catch (err: any) {
        console.error("Error loading trip:", err.message);
        setError(err.message);
        toast.error(err.message);
      }
    };

    loadTrip();
  }, [routeTripId, isAuthenticated]);

  // Subscribe to Firestore collections for the active trip
  useEffect(() => {
    if (!routeTripId) {
      setChatMessages([]);
      setDayActivities({});
      setExpenses([]);
      return;
    }

    // messages subscription
    const messagesQuery = query(
      collection(db, `trips/${routeTripId}/messages`),
      orderBy("timestamp", "asc")
    );
    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          let tsISO = new Date().toISOString();
          if (d.timestamp) {
            if (typeof (d.timestamp as any).toDate === "function")
              tsISO = (d.timestamp as any).toDate().toISOString();
            else if ((d.timestamp as any).seconds)
              tsISO = new Date(
                (d.timestamp as any).seconds * 1000
              ).toISOString();
            else if (typeof d.timestamp === "string")
              tsISO = new Date(d.timestamp).toISOString();
          }
          return {
            id: doc.id,
            userName: d.userName || "Unknown",
            message: d.message || "",
            timestamp: tsISO,
          };
        });
        setChatMessages(messages);
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight;
          }
        }, 50);
      },
      (err) => {
        console.error("Messages subscription error:", err);
        setError("Failed to subscribe to messages.");
      }
    );

    // activities subscription
    const activitiesQuery = query(
      collection(db, `trips/${routeTripId}/activities`)
    );
    const unsubscribeActivities = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const activities = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) } as Activity)
        );
        const newDayActivities: { [key: number]: Activity[] } = {};
        activities.forEach((act) => {
          if (!newDayActivities[act.day]) newDayActivities[act.day] = [];
          newDayActivities[act.day].push({
            ...act,
            reactions: act.reactions || [],
          });
        });
        setDayActivities(newDayActivities);
        setTripDays((prev) =>
          prev.map((day) => ({
            ...day,
            activities: newDayActivities[day.day]?.length || 0,
          }))
        );
        setAiSuggestions(newDayActivities[1]?.slice(0, 3) || []);
      },
      (err) => {
        console.error("Activities subscription error:", err);
        setError("Failed to subscribe to activities.");
      }
    );

    // expenses subscription
    const expensesQuery = query(
      collection(db, `trips/${routeTripId}/expenses`)
    );
    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expenses = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as any) } as Expense)
        );
        setExpenses(expenses);
      },
      (err) => {
        console.error("Expenses subscription error:", err);
        setError("Failed to subscribe to expenses.");
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeActivities();
      unsubscribeExpenses();
    };
  }, [routeTripId]);

  // --- helper functions (fetchUnsplashImage, fetchDatasetData) ---

  const fetchUnsplashImage = async (query: string): Promise<string | null> => {
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn("Unsplash API key missing. Using fallback image.");
      return "https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg";
    }
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          query
        )}&per_page=1&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`
      );
      if (!response.ok)
        throw new Error(`Unsplash API request failed: ${response.statusText}`);
      const data = await response.json();
      return (
        data.results?.[0]?.urls?.regular ||
        "https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg"
      );
    } catch (err) {
      console.warn("Unsplash image fetch failed:", err);
      return "https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg";
    }
  };

  const fetchDatasetData = async (
    destination: string,
    numberOfPersons: number,
    categories: string[]
  ): Promise<ItineraryResponse> => {
    try {
      const [placesResult, hotelsResult, transportResult] = await Promise.all([
        new Promise<ParseResult<any>>((resolve, reject) => {
          parse("/datasets/places_india.csv", {
            download: true,
            header: true,
            complete: (result) => resolve(result),
            error: (err) =>
              reject(
                new Error(`Failed to fetch places_india.csv: ${err.message}`)
              ),
          });
        }),
        new Promise<ParseResult<any>>((resolve, reject) => {
          parse("/datasets/india.csv", {
            download: true,
            header: true,
            complete: (result) => resolve(result),
            error: (err) =>
              reject(new Error(`Failed to fetch india.csv: ${err.message}`)),
          });
        }),
        new Promise<ParseResult<any>>((resolve, reject) => {
          parse("/datasets/transport.csv", {
            download: true,
            header: true,
            complete: (result) => resolve(result),
            error: (err) =>
              reject(
                new Error(`Failed to fetch transport.csv: ${err.message}`)
              ),
          });
        }),
      ]);

      const placesData = placesResult.data;
      const hotelsData = hotelsResult.data;
      const transportData = transportResult.data;

      if (!placesData.length)
        throw new Error("No data found in places_india.csv");
      if (!hotelsData.length) console.warn("No data found in india.csv");
      if (!transportData.length) console.warn("No data found in transport.csv");

      const filteredPlaces = placesData.filter(
        (place: any) =>
          place.city &&
          place.city.toLowerCase().includes(destination.toLowerCase()) &&
          (categories.length === 0 || categories.includes(place.main_category))
      );
      const filteredHotels = hotelsData
        .filter(
          (hotel: any) =>
            hotel.cityName &&
            hotel.cityName.toLowerCase().includes(destination.toLowerCase())
        )
        .sort(
          (a: any, b: any) =>
            parseFloat(b.HotelRating) - parseFloat(a.HotelRating)
        )
        .map((hotel: any) => ({
          HotelName: hotel.HotelName,
          CleanedAttractions:
            hotel.CleanedAttractions || "No attractions listed",
          Address: hotel.Address,
          HotelRating: hotel.HotelRating,
          HotelWebsiteUrl: hotel.HotelWebsiteUrl || "No website available",
          HotelImage:
            hotel.HotelImage ||
            "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
          reactions: [],
        }));

      if (!filteredPlaces.length) {
        throw new Error(
          `No activities found for ${destination} with selected categories. Try another city or different categories.`
        );
      }

      const itinerary: ItineraryResponse = {
        best_time_to_visit: "Year-round",
        days: [],
      };

      const start = new Date(tripPlan.startDate);
      const end = new Date(tripPlan.endDate);
      const duration = Math.max(
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        1
      );

      const hotelsPerDay = 3;
      const totalHotelsNeeded = duration * hotelsPerDay;
      const availableHotels = filteredHotels;
      let selectedHotels: Hotel[] = [];
      if (availableHotels.length < totalHotelsNeeded) {
        for (let i = 0; i < totalHotelsNeeded; i++) {
          selectedHotels.push(
            availableHotels[i % availableHotels.length] || {
              HotelName: `Placeholder Hotel ${i + 1}`,
              CleanedAttractions: "None",
              Address: "Unknown",
              HotelRating: "N/A",
              HotelWebsiteUrl: "No website available",
              HotelImage:
                "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
              reactions: [],
            }
          );
        }
      } else {
        selectedHotels = availableHotels
          .sort(() => Math.random() - 0.5)
          .slice(0, totalHotelsNeeded);
      }

      const activitiesPerDay = Math.min(
        Math.ceil(filteredPlaces.length / duration) || 3,
        5
      );
      for (let day = 1; day <= duration; day++) {
        const startIdx = (day - 1) * activitiesPerDay;
        const dayActivities = filteredPlaces
          .slice(startIdx, startIdx + activitiesPerDay)
          .map((place: any, idx: number) => {
            const time = `${10 + idx * 2}:00 ${idx < 2 ? "AM" : "PM"}`;
            return {
              time,
              activity: place.name,
              location: place.address || place.city,
              description: `Explore ${place.name}, a ${place.main_category} spot with a rating of ${place.rating}. Suitable for ${numberOfPersons} people.`,
              category: place.main_category,
            };
          });

        const dayHotels = selectedHotels.slice(
          (day - 1) * hotelsPerDay,
          day * hotelsPerDay
        );

        itinerary.days.push({
          day,
          activities: dayActivities,
          hotels: dayHotels,
        });
      }

      return itinerary;
    } catch (err: any) {
      console.error("Dataset fetch error:", err.message);
      throw new Error(
        `Couldn’t create itinerary: ${err.message}. Ensure CSV files are in public/datasets/.`
      );
    }
  };

  // --- create trip and navigate to its permalink ---
  // --- create trip, save itinerary to trip doc, create activities, and navigate ---
  const fetchItinerary = async () => {
    if (
      !tripPlan.name ||
      !tripPlan.destination ||
      !tripPlan.startDate ||
      !tripPlan.endDate ||
      tripPlan.numberOfPersons < 1
    ) {
      setError(
        "Please enter a trip name, destination city, valid dates, and number of persons."
      );
      return;
    }

    const start = new Date(tripPlan.startDate);
    const end = new Date(tripPlan.endDate);
    if (end < start) {
      setError("End date must be after start date.");
      return;
    }

    setIsFetchingItinerary(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken(true);
      // 1) create trip
      const tripResponse = await fetch("http://localhost:3002/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tripPlan.name,
          destination: tripPlan.destination,
          numberOfPersons: tripPlan.numberOfPersons,
          startDate: tripPlan.startDate,
          endDate: tripPlan.endDate,
          categories: tripPlan.categories,
          userName: auth.currentUser?.displayName || "You",
        }),
      });
      if (!tripResponse.ok) {
        const errorText = await tripResponse.text();
        throw new Error(`Failed to create trip: ${errorText}`);
      }
      const { tripId } = await tripResponse.json();
      if (!tripId) throw new Error("Server did not return tripId");

      // persist tripId locally
      setTripPlan((prev) => ({ ...prev, tripId }));

      // 2) generate itinerary (mock or dataset)
      const itinerary: ItineraryResponse = USE_MOCK_DATA
        ? mockItinerary
        : await fetchDatasetData(
          tripPlan.destination,
          tripPlan.numberOfPersons,
          tripPlan.categories
        );

      // 3) PATCH itinerary to trip doc so GET /trips/:id includes hotels immediately
      try {
        const patchRes = await fetch(
          `http://localhost:3002/api/trips/${tripId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ itinerary }),
          }
        );
        if (!patchRes.ok) {
          const txt = await patchRes.text();
          console.warn("Failed to save itinerary to trip:", txt);
          // continue — itinerary not fatal, we still attempt to create activities
        }
      } catch (patchErr: any) {
        console.warn("Could not PATCH itinerary to trip:", patchErr);
      }

      // 4) prepare local tripDays and upload activities (if any)
      const startDate = new Date(tripPlan.startDate);
      const endDate = new Date(tripPlan.endDate);
      const duration = Math.max(
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
        1
      );

      const newTripDays: TripDay[] = [];
      const newDayActivities: { [key: number]: Activity[] } = {};

      for (let i = 0; i < duration; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dayIndex = i;
        const itineraryDay = itinerary.days[dayIndex] ||
          itinerary.days[0] || { activities: [], hotels: [] };

        const dayHotels = itineraryDay.hotels || [];
        newTripDays.push({
          day: i + 1,
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          activities: itineraryDay.activities?.length || 0,
          hotels: dayHotels,
        });

        // create activities for this day and save to server
        const activitiesWithImages = await Promise.all(
          (itineraryDay.activities || []).map(async (act: any, idx: number) => {
            const imgQuery = `${act.location} ${act.activity}`;
            const image = await fetchUnsplashImage(imgQuery);
            const activity = {
              day: i + 1,
              time: act.time,
              title: act.activity,
              type: act.category,
              duration: "2 hours",
              cost: "$",
              description: act.description,
              image: image,
              reactions: [],
              proposedBy: auth.currentUser?.displayName || "You",
            };
            // attempt to save activity on server
            try {
              const activityResponse = await fetch(
                `http://localhost:3002/api/trips/${tripId}/activities`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(activity),
                }
              );
              if (!activityResponse.ok) {
                const errorText = await activityResponse.text();
                console.error("Activity save error:", errorText);
                // return local activity object (without id)
                return activity;
              }
              const { activityId } = await activityResponse.json();
              return { ...activity, id: activityId };
            } catch (actErr: any) {
              console.error("Activity save exception:", actErr);
              return activity;
            }
          })
        );

        newDayActivities[i + 1] = activitiesWithImages;
      }

      // 5) update UI state (single source of truth)
      setTripDays(newTripDays);
      setDayActivities(newDayActivities);
      setAiSuggestions(newDayActivities[1]?.slice(0, 3) || []);

      // 6) navigate to trip page (after saving itinerary & activities)
      navigate(`/group-trip/${tripId}`, { replace: true });

      toast.success("Trip plan created successfully!");
    } catch (err: any) {
      console.error("Itinerary fetch error:", err.message || err);
      setError(err.message || String(err));
      toast.error(err.message || String(err));
    } finally {
      setIsFetchingItinerary(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormOpen(false);
    await fetchItinerary();
  };

  // invite: uses routeTripId or tripPlan.tripId (server endpoint /invite assumed)
  const handleInviteFriend = async (email: string) => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }
    const activeTripId = tripPlan.tripId || routeTripId;
    if (!activeTripId) {
      setError("Please create a trip first.");
      toast.error("Please create a trip first.");
      return;
    }

    const token = await auth.currentUser?.getIdToken(true);
    try {
      const inviterName =
        auth.currentUser?.displayName ||
        auth.currentUser?.email?.split("@")[0] ||
        "Organizer";

      const res = await fetch(
        `http://localhost:3002/api/invites/${activeTripId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email, inviterName }), // include inviterName (backend will also infer if missing)
        }
      );

      // Read response body once
      const rawText = await res.text();
      let body: any = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch (_) {
        body = null;
      }

      if (!res.ok) {
        const serverMessage =
          body?.message || (rawText ? rawText.slice(0, 300) : res.statusText);
        throw new Error(serverMessage);
      }

      const returnedEmail = body?.email || email;
      const serverMessage: string = (body?.message || "").toLowerCase();

      if (
        serverMessage.includes("email not sent") ||
        serverMessage.includes("recorded_not_sent") ||
        serverMessage.includes("failed")
      ) {
        toast.success(
          `Invite recorded for ${returnedEmail} (email not sent / failed).`
        );
      } else {
        toast.success(`Email invite sent to ${returnedEmail}.`);
      }

      setInviteEmail("");
      // Optionally add invited placeholder to UI:
      // setTripPlan(prev => ({ ...prev, members: [...prev.members, { id: `invited-${Date.now()}`, name: returnedEmail.split('@')[0], role: 'Guest', status: 'Invited' }] }));
    } catch (err: any) {
      console.error("Invite friend error:", err);
      const message = err?.message || "Failed to invite friend.";
      setError(message);
      toast.error(message);
    }
  };

  const handleVote = async (
    day: number,
    activityIndex: number,
    type: "like" | "dislike"
  ) => {
    const activity = dayActivities[day][activityIndex];
    const activeTripId = tripPlan.tripId || routeTripId;
    if (!activity.id || !activeTripId) return;
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken(true);
    const existingReaction = activity.reactions.find(
      (r) => r.user._id === user.uid
    );
    let newReactions = [...activity.reactions];
    if (existingReaction) {
      if (existingReaction.type === type) {
        newReactions = newReactions.filter((r) => r.user._id !== user.uid);
      } else {
        newReactions = newReactions.map((r) =>
          r.user._id === user.uid ? { ...r, type } : r
        );
      }
    } else {
      newReactions.push({
        user: { _id: user.uid, name: user.displayName || "You" },
        type,
      });
    }
    try {
      await fetch(
        `http://localhost:3002/api/trips/${activeTripId}/activities/${activity.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reactions: newReactions }),
        }
      );
      setDayActivities((prev) => ({
        ...prev,
        [day]: prev[day].map((act, idx) =>
          idx === activityIndex ? { ...act, reactions: newReactions } : act
        ),
      }));
      toast.success(
        `${type === "like" ? "Liked" : "Disliked"} ${activity.title}!`
      );
    } catch (err: any) {
      console.error("Vote error:", err.message);
      toast.error("Failed to update reaction.");
    }
  };

  // const handleAddActivity = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!activityForm.title || !activityForm.time || !activityForm.type || !activityForm.description) {
  //     setError("Please fill in all required activity fields.");
  //     toast.error("Please fill in all required activity fields.");
  //     return;
  //   }
  //   const activeTripId = tripPlan.tripId || routeTripId;
  //   if (!activeTripId) {
  //     setError("Please create a trip first.");
  //     toast.error("Please create a trip first.");
  //     return;
  //   }
  //   const token = await auth.currentUser?.getIdToken(true);
  //   try {
  //     const image = await fetchUnsplashImage(`${tripPlan.destination} ${activityForm.title}`);
  //     const activity = {
  //       day: activityForm.day,
  //       time: activityForm.time,
  //       title: activityForm.title,
  //       type: activityForm.type,
  //       duration: activityForm.duration,
  //       cost: activityForm.cost,
  //       description: activityForm.description,
  //       image: image,
  //       reactions: [],
  //       proposedBy: activityForm.proposedBy,
  //     };
  //     const response = await fetch(`http://localhost:3002/api/trips/${activeTripId}/activities`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify(activity),
  //     });
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       throw new Error(`Failed to add activity: ${errorText}`);
  //     }
  //     const { activityId } = await response.json();
  //     setDayActivities((prev) => ({
  //       ...prev,
  //       [activityForm.day]: [...(prev[activityForm.day] || []), { ...activity, id: activityId }],
  //     }));
  //     setTripDays((prev) => prev.map((day) => (day.day === activityForm.day ? { ...day, activities: day.activities + 1 } : day)));
  //     setActivityForm({
  //       day: 1,
  //       time: "",
  //       title: "",
  //       type: "",
  //       duration: "2 hours",
  //       cost: "$",
  //       description: "",
  //       image: "",
  //       proposedBy: auth.currentUser?.displayName || "You",
  //     });
  //     setIsActivityFormOpen(false);
  //     toast.success("Activity added successfully!");
  //   } catch (err: any) {
  //     console.error("Add activity error:", err.message);
  //     setError(err.message);
  //     toast.error(err.message);
  //   }
  // };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !activityForm.title ||
      !activityForm.time ||
      !activityForm.type ||
      !activityForm.description
    ) {
      setError("Please fill in all required activity fields.");
      toast.error("Please fill in all required activity fields.");
      return;
    }

    const activeTripId = tripPlan.tripId || routeTripId;
    if (!activeTripId) {
      setError("Please create a trip first.");
      toast.error("Please create a trip first.");
      return;
    }

    // optional client-side duplicate quick check
    try {
      const newTitleNorm = activityForm.title.trim().toLowerCase();
      const existingForDay = dayActivities[activityForm.day] || [];
      if (
        existingForDay.some(
          (a) => (a.title || "").trim().toLowerCase() === newTitleNorm
        )
      ) {
        const msg = "This activity is already present";
        setError(msg);
        toast.error(msg);
        return;
      }
    } catch (e) {
      // ignore and rely on server-side check
    }

    const token = await auth.currentUser?.getIdToken(true);
    try {
      const image = await fetchUnsplashImage(
        `${tripPlan.destination} ${activityForm.title}`
      );
      const activity = {
        day: activityForm.day,
        time: activityForm.time,
        title: activityForm.title,
        type: activityForm.type,
        duration: activityForm.duration,
        cost: activityForm.cost,
        description: activityForm.description,
        image,
        reactions: [],
        proposedBy: activityForm.proposedBy,
      };

      const response = await fetch(
        `http://localhost:3002/api/trips/${activeTripId}/activities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(activity),
        }
      );

      // handle 409 specifically using parsed JSON message if available
      if (response.status === 409) {
        let body: any = null;
        try {
          body = await response.json();
        } catch (_) {
          /* not JSON */
        }
        const msg = body?.message || "This activity is already present";
        setError(msg);
        toast.error(msg);
        return;
      }

      // robust non-ok handling: parse JSON message if possible
      if (!response.ok) {
        let errBody: any = null;
        try {
          errBody = await response.clone().json();
        } catch (_) {
          /* not JSON */
        }
        const errMsg =
          errBody?.message ||
          (await response.text()).slice(0, 200) ||
          response.statusText;
        throw new Error(errMsg);
      }

      const { activityId } = await response.json();

      // on success update UI
      setDayActivities((prev) => ({
        ...prev,
        [activityForm.day]: [
          ...(prev[activityForm.day] || []),
          { ...activity, id: activityId },
        ],
      }));
      setTripDays((prev) =>
        prev.map((d) =>
          d.day === activityForm.day
            ? { ...d, activities: (d.activities || 0) + 1 }
            : d
        )
      );

      setActivityForm({
        day: 1,
        time: "",
        title: "",
        type: "",
        duration: "2 hours",
        cost: "$",
        description: "",
        image: "",
        proposedBy: auth.currentUser?.displayName || "You",
      });
      setIsActivityFormOpen(false);
      toast.success("Activity added successfully!");
    } catch (err: any) {
      // err.message will now be a clean friendly string in most cases
      console.error("Add activity error:", err?.message || err);
      const message = err?.message || "Failed to add activity.";
      setError(message);
      toast.error(message);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amount);
    if (
      !expenseForm.description ||
      isNaN(amount) ||
      amount <= 0 ||
      !expenseForm.paidBy
    ) {
      setError("Please enter a valid description, amount, and paid by.");
      toast.error("Please enter a valid description, amount, and paid by.");
      return;
    }
    const activeTripId = tripPlan.tripId || routeTripId;
    const token = await auth.currentUser?.getIdToken(true);
    try {
      const response = await fetch(
        `http://localhost:3002/api/trips/${activeTripId}/expenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            description: expenseForm.description,
            amount,
            paidBy: expenseForm.paidBy,
          }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add expense: ${errorText}`);
      }
      const { expenseId } = await response.json();
      setExpenses((prev) => [
        ...prev,
        {
          id: expenseId,
          description: expenseForm.description,
          amount,
          paidBy: expenseForm.paidBy,
        },
      ]);
      setExpenseForm({
        description: "",
        amount: "",
        paidBy: auth.currentUser?.displayName || "You",
      });
      toast.success("Expense added successfully!");
    } catch (err: any) {
      console.error("Add expense error:", err.message);
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleAddChatMessage = async (message: string) => {
    if (!message.trim()) {
      setError("Please enter a message.");
      toast.error("Please enter a message.");
      return;
    }
    const user = auth.currentUser;
    const activeTripId = tripPlan.tripId || routeTripId;
    if (user && activeTripId) {
      const token = await user.getIdToken(true);
      try {
        // optimistic UI
        const optimisticId = `temp-${Date.now()}`;
        const nowISO = new Date().toISOString();
        setChatMessages((prev) => [
          ...prev,
          {
            id: optimisticId,
            userName: user.displayName || "You",
            message,
            timestamp: nowISO,
          },
        ]);
        const response = await fetch(
          `http://localhost:3002/api/trips/${activeTripId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userName: user.displayName || "You",
              message,
            }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to send message: ${errorText}`);
        }
        toast.success("Message sent successfully!");
      } catch (err: any) {
        console.error("Add message error:", err.message);
        setError(err.message);
        toast.error(err.message);
      }
    } else {
      setError("Create or open a trip first to send messages.");
      toast.error("Create or open a trip first to send messages.");
    }
  };

  const handleShareTrip = () => {
    const activeTripId = tripPlan.tripId || routeTripId;
    if (!activeTripId) {
      setError("Please create a trip first.");
      toast.error("Please create a trip first.");
      return;
    }
    const shareUrl = `${window.location.origin}/group-trip/${activeTripId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Trip link copied to clipboard!");
  };

  // --- render ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-purple-500"
        >
          <Users className="w-8 h-8" />
        </motion.div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div
        className="relative bg-cover bg-center py-24 sm:py-36"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/3467150/pexels-photo-3467150.jpeg?auto=compress&cs=tinysrgb&w=1920')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-blue-900/80" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Plan a Fun Group Trip to {tripPlan.destination || "Anywhere"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Work together with friends to plan activities, split costs, and
            chat!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-10 rounded-full text-lg shadow-lg"
                  aria-label="Start group trip"
                >
                  Start Group Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Start Your Group Trip</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Trip Name</Label>
                    <Input
                      id="name"
                      value={tripPlan.name}
                      onChange={(e) =>
                        setTripPlan({ ...tripPlan, name: e.target.value })
                      }
                      placeholder="e.g., Summer Adventure 2025"
                      aria-describedby="name-help"
                      className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p id="name-help" className="text-sm text-gray-500">
                      Give your trip a name to remember it by.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="destination">Where are you going?</Label>
                      <Input
                        id="destination"
                        value={tripPlan.destination}
                        onChange={(e) =>
                          setTripPlan({
                            ...tripPlan,
                            destination: e.target.value,
                          })
                        }
                        placeholder="Enter a city (e.g., Hyderabad)"
                        list="cities"
                        aria-describedby="destination-help"
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <datalist id="cities">
                        {cities.map((city) => (
                          <option key={city.id} value={city.name} />
                        ))}
                      </datalist>
                      <p
                        id="destination-help"
                        className="text-sm text-gray-500"
                      >
                        Enter a city, like 'Hyderabad' or 'Mumbai'.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="numberOfPersons">Number of Persons</Label>
                      <Input
                        id="numberOfPersons"
                        type="number"
                        min="1"
                        value={tripPlan.numberOfPersons}
                        onChange={(e) =>
                          setTripPlan({
                            ...tripPlan,
                            numberOfPersons: parseInt(e.target.value) || 1,
                          })
                        }
                        placeholder="e.g., 4"
                        aria-describedby="persons-help"
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <p id="persons-help" className="text-sm text-gray-500">
                        Enter the number of people in your group.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={tripPlan.startDate}
                        onChange={(e) =>
                          setTripPlan({
                            ...tripPlan,
                            startDate: e.target.value,
                          })
                        }
                        aria-describedby="start-date-help"
                        min="2025-09-14"
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <p id="start-date-help" className="text-sm text-gray-500">
                        Select the start date of your trip.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={tripPlan.endDate}
                        onChange={(e) =>
                          setTripPlan({ ...tripPlan, endDate: e.target.value })
                        }
                        aria-describedby="end-date-help"
                        min="2025-09-14"
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <p id="end-date-help" className="text-sm text-gray-500">
                        Select the end date of your trip.
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="categories">Activity Categories</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        setTripPlan((prev) => {
                          const newCategories = prev.categories.includes(value)
                            ? prev.categories.filter((c) => c !== value)
                            : [...prev.categories, value];
                          return { ...prev, categories: newCategories };
                        });
                      }}
                    >
                      <SelectTrigger className="bg-white border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-800 font-medium py-3 text-lg">
                        <SelectValue placeholder="Select categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {tripCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={tripPlan.categories.includes(category)}
                                onChange={() =>
                                  setTripPlan((prev) => {
                                    const newCategories =
                                      prev.categories.includes(category)
                                        ? prev.categories.filter(
                                          (c) => c !== category
                                        )
                                        : [...prev.categories, category];
                                    return {
                                      ...prev,
                                      categories: newCategories,
                                    };
                                  })
                                }
                                className="mr-2"
                              />
                              {category}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                      Select multiple activity types for your trip.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tripPlan.categories.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="cursor-pointer bg-purple-100 text-purple-800"
                          onClick={() => {
                            setTripPlan((prev) => ({
                              ...prev,
                              categories: prev.categories.filter(
                                (c) => c !== category
                              ),
                            }));
                          }}
                        >
                          {category} ✕
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-full"
                    aria-label="Create trip plan"
                    disabled={isFetchingItinerary}
                  >
                    {isFetchingItinerary ? (
                      <span className="flex items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-t-2 border-b-2 border-white mr-2"
                        />
                        Creating...
                      </span>
                    ) : (
                      "Create Trip Plan"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {error && error !== "This activity is already present" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 shadow-sm max-w-2xl mx-auto text-center"
            role="alert"
          >
            {error}
            <div className="mt-2 flex gap-2 justify-center">
              <Button
                variant="link"
                className="text-red-700 underline"
                onClick={fetchItinerary}
                aria-label="Retry creating itinerary"
              >
                Retry
              </Button>
              <Button
                variant="link"
                className="text-red-700 underline"
                onClick={() => {
                  setTripPlan({ ...tripPlan, destination: "Sample City" });
                  fetchItinerary();
                }}
                aria-label="Use mock data"
              >
                Use Sample Data
              </Button>
            </div>
          </motion.div>
        )}
        {isFetchingItinerary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-50 text-purple-700 p-4 rounded-lg mb-8 shadow-sm max-w-2xl mx-auto text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-block w-6 h-6 border-t-2 border-b-2 border-purple-500 mr-2"
            />
            Generating your itinerary...
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-80 bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Your Group Trip
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {tripDays.length > 0
                ? `${tripPlan.name || "Untitled Trip"} • ${tripDays[0].date
                } - ${tripDays[tripDays.length - 1].date} • ${tripPlan.members.length
                } friends • ${tripPlan.numberOfPersons} persons`
                : "Start planning to see details"}
            </p>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Your Friends</h3>
              {tripPlan.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between mb-2"
                >
                  <span className="text-gray-800">
                    {member.name}{" "}
                    {member.role === "Organizer"
                      ? "(You)"
                      : `(${member.status})`}
                  </span>
                  {member.role !== "Organizer" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${member.name}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-row items-center gap-2">
                <Input
                  placeholder="Invite a friend (e.g., friend@email.com)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500 flex-1 min-w-0"
                  aria-label="Invite a friend by email"
                />
                <Button
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-full px-4 py-2 whitespace-nowrap"
                  onClick={() => handleInviteFriend(inviteEmail)}
                  aria-label="Send invite"
                >
                  Invite
                </Button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-800 mb-2">Trip Days</h3>

            {tripDays.map((day) => {
              // Prefer live activities from dayActivities (source of truth),
              // fallback to stored day.activities from itinerary (or 0).
              const activitiesCount =
                dayActivities?.[day.day]?.length ?? day.activities ?? 0;

              return (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(day.day)}
                  className={`w-full p-3 rounded-lg text-left mb-2 ${selectedDay === day.day
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100"
                    }`}
                  aria-label={`Select Day ${day.day} (${day.date})`}
                >
                  <div className="flex justify-between">
                    <span>
                      Day {day.day} ({day.date})
                    </span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {activitiesCount} activities
                    </Badge>
                  </div>
                </button>
              );
            })}

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="w-full mt-4 border-purple-500 text-gray-800 hover:bg-purple-50 hover:text-purple-600 bg-white z-10"
                aria-label="Share trip"
                onClick={handleShareTrip}
              >
                <Share className="w-4 h-4 mr-2 text-gray-800" />
                Share Trip
              </Button>
            </motion.div>
          </div>

          <div className="flex-1">
            <Tabs defaultValue="itinerary">
              <TabsList className="grid grid-cols-3 mb-4 bg-gray-100">
                <TabsTrigger
                  value="itinerary"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                >
                  Plan
                </TabsTrigger>
                <TabsTrigger
                  value="expenses"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                >
                  Expenses
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                >
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="itinerary">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Day {selectedDay} -{" "}
                  {tripDays.find((d) => d.day === selectedDay)?.date ||
                    "Pick a day"}
                </h2>

                <Dialog
                  open={isActivityFormOpen}
                  onOpenChange={setIsActivityFormOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="mb-4 bg-purple-500 text-white hover:bg-purple-600 rounded-full"
                      aria-label="Add activity"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Add New Activity</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddActivity} className="space-y-4">
                      <div>
                        <Label htmlFor="activity-day">Day</Label>
                        <Select
                          value={activityForm.day.toString()}
                          onValueChange={(value) =>
                            setActivityForm({
                              ...activityForm,
                              day: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {tripDays.map((day) => (
                              <SelectItem
                                key={day.day}
                                value={day.day.toString()}
                              >
                                Day {day.day} ({day.date})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="activity-time">Time</Label>
                        <Input
                          id="activity-time"
                          type="time"
                          value={activityForm.time}
                          onChange={(e) =>
                            setActivityForm({
                              ...activityForm,
                              time: e.target.value,
                            })
                          }
                          className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="activity-title">Activity Name</Label>
                        <Input
                          id="activity-title"
                          value={activityForm.title}
                          onChange={(e) =>
                            setActivityForm({
                              ...activityForm,
                              title: e.target.value,
                            })
                          }
                          placeholder="e.g., Visit Taj Mahal"
                          className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="activity-type">Category</Label>
                        <Select
                          value={activityForm.type}
                          onValueChange={(value) =>
                            setActivityForm({ ...activityForm, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {tripCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="activity-description">
                          Description
                        </Label>
                        <Input
                          id="activity-description"
                          value={activityForm.description}
                          onChange={(e) =>
                            setActivityForm({
                              ...activityForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="e.g., Explore the historic monument"
                          className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-full"
                        disabled={isFetchingItinerary}
                      >
                        Add Activity
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {tripDays.find((d) => d.day === selectedDay)?.hotels.length >
                  0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Recommended Hotels
                      </h3>
                      {tripDays
                        .find((d) => d.day === selectedDay)
                        ?.hotels.map((hotel, index) => (
                          <Card
                            key={index}
                            className="p-4 mb-4 bg-white shadow-md"
                          >
                            <h4 className="font-medium text-gray-800">
                              {hotel.HotelName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Rating: {hotel.HotelRating} ★
                            </p>
                            <p className="text-sm text-gray-600">
                              Address: {hotel.Address}
                            </p>
                            <p className="text-sm text-gray-600">
                              Attractions: {hotel.CleanedAttractions}
                            </p>
                            {hotel.HotelWebsiteUrl !== "No website available" && (
                              <a
                                href={hotel.HotelWebsiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-500 text-sm hover:underline"
                              >
                                Visit Website
                              </a>
                            )}
                            {hotel.HotelImage && (
                              <img
                                src={hotel.HotelImage}
                                alt={hotel.HotelName}
                                className="w-full h-32 object-cover rounded-md mt-2"
                              />
                            )}
                            <div className="flex gap-2 mt-2">
                              {hotel.reactions.map((r, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  {r.type === "like" ? (
                                    <ThumbsUp className="w-3 h-3" />
                                  ) : (
                                    <ThumbsDown className="w-3 h-3" />
                                  )}
                                  {r.user.name}
                                </Badge>
                              ))}
                            </div>
                          </Card>
                        ))}
                    </div>
                  )}

                {dayActivities[selectedDay]?.map((activity, index) => (
                  <Card
                    key={activity.id || index}
                    className="p-4 mb-4 bg-white shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={activity.image}
                        alt={activity.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Clock className="w-4 h-4 mr-2 text-purple-500" />
                          <span className="text-gray-800">{activity.time}</span>
                          <Badge className="ml-2 bg-purple-100 text-purple-800">
                            {activity.type}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-800">
                          {activity.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Suggested by {activity.proposedBy}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-purple-500 text-purple-500 hover:bg-purple-50 hover:text-purple-600 bg-white z-10"
                              onClick={() =>
                                handleVote(selectedDay, index, "like")
                              }
                              aria-label={`Like ${activity.title}`}
                            >
                              Like (
                              {
                                activity.reactions.filter(
                                  (r) => r.type === "like"
                                ).length
                              }
                              )
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-purple-500 text-purple-500 hover:bg-purple-50 hover:text-purple-600 bg-white z-10"
                              onClick={() =>
                                handleVote(selectedDay, index, "dislike")
                              }
                              aria-label={`Dislike ${activity.title}`}
                            >
                              Dislike (
                              {
                                activity.reactions.filter(
                                  (r) => r.type === "dislike"
                                ).length
                              }
                              )
                            </Button>
                          </motion.div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {activity.reactions.map((r, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {r.type === "like" ? (
                                <ThumbsUp className="w-3 h-3" />
                              ) : (
                                <ThumbsDown className="w-3 h-3" />
                              )}
                              {r.user.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="expenses">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Trip Expenses
                </h2>
                <Card className="p-4 mb-4 bg-white shadow-md">
                  <form
                    onSubmit={handleAddExpense}
                    className="grid grid-cols-12 gap-4"
                  >
                    <div className="col-span-5">
                      <Input
                        placeholder="Description (e.g., Dinner at Cafe)"
                        value={expenseForm.description}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            description: e.target.value,
                          })
                        }
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        aria-label="Expense description"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: e.target.value,
                          })
                        }
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        aria-label="Expense amount"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="Paid By"
                        value={expenseForm.paidBy}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            paidBy: e.target.value,
                          })
                        }
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        aria-label="Expense paid by"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="submit"
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                        aria-label="Add expense"
                      >
                        Add
                      </Button>
                    </div>
                  </form>
                </Card>
                {expenses.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No expenses added yet.
                  </p>
                ) : (
                  expenses.map((expense) => (
                    <Card
                      key={expense.id}
                      className="p-4 mb-4 bg-white shadow-md"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="flex-1 text-sm font-medium text-gray-800 truncate">
                          {expense.description}
                        </p>
                        <p className="text-sm text-gray-600 w-24">
                          {expense.paidBy}
                        </p>
                        <p className="text-sm font-medium text-gray-800 w-16 text-right">
                          ${expense.amount.toFixed(2)}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="chat">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Group Chat
                </h2>
                <div
                  ref={messagesContainerRef}
                  className="h-64 overflow-y-auto border border-gray-300 rounded-lg p-4 mb-4 bg-white"
                >
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="mb-2">
                      <p className="text-sm font-medium text-gray-800">
                        {msg.userName}{" "}
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <Input
                  placeholder="Send a message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChatMessage(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                  aria-label="Send chat message"
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-full md:w-80 bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              Fun Suggestions
            </h3>
            {aiSuggestions.map((suggestion, index) => (
              <Card key={index} className="p-4 mb-4 bg-white shadow-md">
                <div className="flex items-start gap-4">
                  <img
                    src={suggestion.image}
                    alt={suggestion.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {suggestion.title}
                    </h4>
                    <Badge className="my-1 bg-purple-100 text-purple-800">
                      {suggestion.type}
                    </Badge>
                    <p className="text-xs text-gray-600">
                      {suggestion.description}
                    </p>
                    {/* <Button size="sm" className="mt-2 bg-purple-500 text-white hover:bg-purple-600 rounded-full" aria-label={`Add ${suggestion.title} to plan`} onClick={async () => {
                      const token = await auth.currentUser?.getIdToken(true);
                      try {
                        const response = await fetch(`http://localhost:3002/api/trips/${tripPlan.tripId}/activities`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(suggestion),
                        });
                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(`Failed to add activity: ${errorText}`);
                        }
                        const { activityId } = await response.json();
                        setDayActivities((prev) => ({
                          ...prev,
                          [suggestion.day]: [...(prev[suggestion.day] || []), { ...suggestion, id: activityId }],
                        }));
                        setTripDays((prev) => prev.map((day) => (day.day === suggestion.day ? { ...day, activities: day.activities + 1 } : day)));
                        toast.success("Activity added to plan!");
                      } catch (err: any) {
                        console.error("Add suggestion error:", err.message);
                        toast.error(err.message);
                      }
                    }}>
                      Add to Plan
                    </Button> */}

                    <Button
                      size="sm"
                      className="mt-2 bg-purple-500 text-white hover:bg-purple-600 rounded-full"
                      aria-label={`Add ${suggestion.title} to plan`}
                      onClick={async () => {
                        const activeTripId = tripPlan.tripId || routeTripId;
                        if (!activeTripId) {
                          const msg = "Please create a trip first.";
                          setError(msg);
                          toast.error(msg);
                          return;
                        }

                        const token = await auth.currentUser?.getIdToken(true);
                        try {
                          const response = await fetch(
                            `http://localhost:3002/api/trips/${activeTripId}/activities`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify(suggestion),
                            }
                          );

                          // Duplicate / conflict: show server message (409)
                          if (response.status === 409) {
                            let body: any = null;
                            try {
                              body = await response.json();
                            } catch (_) {
                              /* not JSON */
                            }
                            const msg =
                              body?.message ||
                              "This activity is already present";
                            setError(msg);
                            toast.error(msg);
                            return;
                          }

                          // Robust non-ok handling: try JSON message first, then text
                          if (!response.ok) {
                            let body: any = null;
                            try {
                              body = await response.clone().json();
                            } catch (_) {
                              /* not JSON */
                            }
                            const serverMsg =
                              body?.message ||
                              (await response.text()).slice(0, 200) ||
                              response.statusText;
                            throw new Error(serverMsg);
                          }

                          // Success
                          const { activityId } = await response.json();
                          const day = suggestion.day || 1;
                          setDayActivities((prev) => ({
                            ...prev,
                            [day]: [
                              ...(prev[day] || []),
                              { ...suggestion, id: activityId },
                            ],
                          }));
                          setTripDays((prev) =>
                            prev.map((d) =>
                              d.day === day
                                ? { ...d, activities: (d.activities || 0) + 1 }
                                : d
                            )
                          );
                          toast.success("Activity added to plan!");
                        } catch (err: any) {
                          console.error(
                            "Add suggestion error:",
                            err?.message || err
                          );
                          const msg = err?.message || "Failed to add activity";
                          setError(msg);
                          toast.error(msg);
                        }
                      }}
                    >
                      Add to Plan
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GroupTripPlanner;
