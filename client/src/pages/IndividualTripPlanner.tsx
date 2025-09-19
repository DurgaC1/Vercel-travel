import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import SafetyDashboard from "@/components/SafetyDashboard";
import Footer from "@/components/Footer";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { Plus, Clock, Calendar } from "lucide-react";
import { parse, ParseResult } from "papaparse";
import { toast } from "@/components/ui/sonner";
import { collection, onSnapshot, query } from "firebase/firestore";

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
  rating: string;
  reviews: string;
  proposedBy: string;
}

interface Hotel {
  HotelName: string;
  CleanedAttractions: string;
  Address: string;
  HotelRating: string;
  HotelWebsiteUrl: string;
  HotelImage?: string;
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
  startDate: string;
  endDate: string;
  budget: string;
  categories: string[];
  members: { id: string; name: string; role: string; status: string }[];
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
      rating: string;
      reviews: string;
    }[];
    hotels: Hotel[];
  }[];
}

interface PlaceData {
  city: string;
  country: string;
  name: string;
  address: string;
  main_category: string;
  rating: string;
  reviews: string;
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
          description:
            "Explore local history and art. Rated 4.5 with 1200 reviews.",
          category: "Culture",
          rating: "4.5",
          reviews: "1200",
        },
        {
          time: "2:00 PM",
          activity: "City Tour",
          location: "Downtown",
          description:
            "Guided tour of city landmarks. Rated 4.2 with 800 reviews.",
          category: "Culture",
          rating: "4.2",
          reviews: "800",
        },
      ],
      hotels: [
        {
          HotelName: "Grand Hotel",
          CleanedAttractions: "Monument",
          Address: "123 Main St, Sample City",
          HotelRating: "4.5",
          HotelWebsiteUrl: "http://grandhotel.com",
        },
        {
          HotelName: "City Lodge",
          CleanedAttractions: "Temple",
          Address: "456 Central Ave, Sample City",
          HotelRating: "4.0",
          HotelWebsiteUrl: "http://citylodge.com",
        },
        {
          HotelName: "Heritage Inn",
          CleanedAttractions: "Museum",
          Address: "789 Old Town Rd, Sample City",
          HotelRating: "4.2",
          HotelWebsiteUrl: "http://heritageinn.com",
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
          description: "Relax by the shore. Rated 4.7 with 1500 reviews.",
          category: "Leisure",
          rating: "4.7",
          reviews: "1500",
        },
      ],
      hotels: [
        {
          HotelName: "Seaside Resort",
          CleanedAttractions: "Beach",
          Address: "101 Coastal Rd, Sample City",
          HotelRating: "4.7",
          HotelWebsiteUrl: "http://seasideresort.com",
        },
        {
          HotelName: "Downtown Suites",
          CleanedAttractions: "Mall",
          Address: "202 City Center, Sample City",
          HotelRating: "4.3",
          HotelWebsiteUrl: "http://downtownsuites.com",
        },
        {
          HotelName: "Riverside Hotel",
          CleanedAttractions: "River",
          Address: "303 River Rd, Sample City",
          HotelRating: "4.1",
          HotelWebsiteUrl: "http://riversidehotel.com",
        },
      ],
    },
  ],
};

const IndividualTripPlanner = () => {
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
    startDate: "",
    endDate: "",
    budget: "Medium",
    categories: [],
    members: [],
  });
  const [tripDays, setTripDays] = useState<TripDay[]>([]);
  const [dayActivities, setDayActivities] = useState<{
    [key: number]: Activity[];
  }>({});
  const [aiSuggestions, setAiSuggestions] = useState<Activity[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingItinerary, setIsFetchingItinerary] = useState(false);
  const [activityForm, setActivityForm] = useState({
    day: 1,
    time: "",
    title: "",
    type: "",
    duration: "2 hours",
    cost: "$",
    description: "",
    image: "",
    rating: "",
    reviews: "",
    proposedBy: auth.currentUser?.displayName || "You",
  });

  const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

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
              name: user.displayName || "Traveler",
              role: "Organizer",
              status: "Confirmed",
            },
          ],
        }));
        setActivityForm((prev) => ({
          ...prev,
          proposedBy: user.displayName || "Traveler",
        }));
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (tripPlan.destination.length >= 3) {
      parse<PlaceData>("/datasets/places_india.csv", {
        download: true,
        header: true,
        complete: (result: ParseResult<PlaceData>) => {
          const data = result.data;
          if (!data || data.length === 0) {
            setError(
              "No data found in places_india.csv. Please check the file."
            );
            return;
          }
          const uniqueCities = Array.from(
            new Set(data.map((place) => `${place.city}, ${place.country}`))
          ).map((cityCountry, index) => ({
            id: `city-${index}`,
            name: cityCountry.split(", ")[0],
            country: cityCountry.split(", ")[1] || "India",
          }));
          setCities(
            uniqueCities.filter((city) =>
              city.name
                .toLowerCase()
                .includes(tripPlan.destination.toLowerCase())
            )
          );
        },
        error: (err) => {
          console.error("Error fetching places_india.csv:", err);
          setError(
            "Failed to fetch city suggestions. Ensure places_india.csv is in public/datasets/."
          );
        },
      });
    } else {
      setCities([]);
    }
  }, [tripPlan.destination]);

  useEffect(() => {
    // --- Replace the current loadTrip() contents in the useEffect with this ---
    const loadTrip = async () => {
      if (!routeTripId || !auth.currentUser) return;
      try {
        const token = await auth.currentUser.getIdToken(true);
        const response = await fetch(`http://localhost:3002/api/trips/${routeTripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch trip: ${text}`);
        }
        const { data } = await response.json();

        // Normalize trip name: prefer data.name then data.tripName
        const serverName = data.name || data.tripName || "";

        setTripPlan({
          tripId: data._id || routeTripId,
          name: serverName,
          destination: data.destination || "",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          budget: data.budget || "Medium",
          categories: data.categories || [],
          members: data.members || [],
        });

        // Build tripDays and set activities count from itinerary (if present)
        if (data.startDate && data.endDate) {
          const startDate = new Date(data.startDate);
          const endDate = new Date(data.endDate);
          const duration = Math.max(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), 1);
          const newTripDays: TripDay[] = [];

          for (let i = 0; i < duration; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dayIndex = i + 1;

            // Find the itinerary day (if the server included itinerary.days inside the doc)
            const itineraryDay = (data.itinerary && Array.isArray(data.itinerary.days))
              ? data.itinerary.days.find((d: any) => Number(d.day) === dayIndex) || { activities: [], hotels: [] }
              : { activities: [], hotels: [] };

            const activitiesCount = Array.isArray(itineraryDay.activities) ? itineraryDay.activities.length : 0;
            const dayHotels = itineraryDay.hotels || [];

            newTripDays.push({
              day: dayIndex,
              date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              activities: activitiesCount,
              hotels: dayHotels,
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

  useEffect(() => {
    if (!routeTripId) {
      setDayActivities({});
      return;
    }

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
            rating: act.rating || "",
            reviews: act.reviews || "",
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

    return () => unsubscribeActivities();
  }, [routeTripId]);

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
    categories: string[]
  ): Promise<ItineraryResponse> => {
    try {
      const [placesResult, hotelsResult] = await Promise.all([
        new Promise<ParseResult<PlaceData>>((resolve, reject) => {
          parse<PlaceData>("/datasets/places_india.csv", {
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
      ]);

      const placesData = placesResult.data;
      const hotelsData = hotelsResult.data;

      if (!placesData.length)
        throw new Error("No data found in places_india.csv");
      if (!hotelsData.length) console.warn("No data found in india.csv");

      const filteredPlaces = placesData.filter(
        (place) =>
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
          .map((place, idx: number) => {
            const time = `${10 + idx * 2}:00 ${idx < 2 ? "AM" : "PM"}`;
            return {
              time,
              activity: place.name,
              location: place.address || place.city,
              description: `Explore ${place.name}, a ${place.main_category} spot. Rated ${place.rating} with ${place.reviews} reviews.`,
              category: place.main_category,
              rating: place.rating,
              reviews: place.reviews,
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

  const fetchItinerary = async () => {
    const missingFields: string[] = [];
    if (!tripPlan.name) missingFields.push("Trip Name");
    if (!tripPlan.destination) missingFields.push("Destination");
    if (!tripPlan.startDate) missingFields.push("Start Date");
    if (!tripPlan.endDate) missingFields.push("End Date");
    if (!tripPlan.budget) missingFields.push("Budget");
    if (!auth.currentUser) missingFields.push("User Authentication");

    if (missingFields.length > 0) {
      const errorMessage = `Please fill in the following fields: ${missingFields.join(
        ", "
      )}.`;
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    const start = new Date(tripPlan.startDate);
    const end = new Date(tripPlan.endDate);
    if (end < start) {
      setError("End date must be after start date.");
      toast.error("End date must be after start date.");
      return;
    }

    setIsFetchingItinerary(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken(true);
      const payload = {
        // core trip fields (always required)
        name: tripPlan.name,
        destination: tripPlan.destination,
        startDate: tripPlan.startDate,
        endDate: tripPlan.endDate,

        // unify group/individual fields so server accepts either shape:
        // an individual trip is numberOfPersons: 1 and tripType: 'individual'
        numberOfPersons: 1,
        tripType: "individual",

        // keep the budget field for individual trips (default if not supplied)
        budget: tripPlan.budget || "Medium",

        // categories may be empty array
        categories: tripPlan.categories || [],

        // include username so backend can create member entry
        userName: auth.currentUser?.displayName || "Traveler",
      };

      console.log("Sending trip creation payload:", payload);

      const tripResponse = await fetch("http://localhost:3002/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!tripResponse.ok) {
        const errorText = await tripResponse.text();
        throw new Error(`Failed to create trip: ${errorText}`);
      }
      const { tripId } = await tripResponse.json();
      if (!tripId) throw new Error("Server did not return tripId");

      setTripPlan((prev) => ({ ...prev, tripId }));

      const itinerary: ItineraryResponse = USE_MOCK_DATA
        ? mockItinerary
        : await fetchDatasetData(tripPlan.destination, tripPlan.categories);

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
        }
      } catch (patchErr: any) {
        console.warn("Could not PATCH itinerary to trip:", patchErr);
      }

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
              cost:
                tripPlan.budget === "Low"
                  ? "$"
                  : tripPlan.budget === "Medium"
                    ? "$$"
                    : "$$$",
              description: act.description,
              image: image,
              rating: act.rating,
              reviews: act.reviews,
              proposedBy: auth.currentUser?.displayName || "Traveler",
            };
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

      setTripDays(newTripDays);
      setDayActivities(newDayActivities);
      setAiSuggestions(newDayActivities[1]?.slice(0, 3) || []);

      navigate(`/solo-trip/${tripId}`, { replace: true });
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
    console.log("Form submitted with tripPlan:", tripPlan); // Debugging log
    setIsFormOpen(false);
    await fetchItinerary();
  };

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
      // Ignore and rely on server-side check
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
        rating: activityForm.rating || "",
        reviews: activityForm.reviews || "",
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

      if (response.status === 409) {
        let body: any = null;
        try {
          body = await response.json();
        } catch (_) {
          /* Not JSON */
        }
        const msg = body?.message || "This activity is already present";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!response.ok) {
        let errBody: any = null;
        try {
          errBody = await response.clone().json();
        } catch (_) {
          /* Not JSON */
        }
        const errMsg =
          errBody?.message ||
          (await response.text()).slice(0, 200) ||
          response.statusText;
        throw new Error(errMsg);
      }

      const { activityId } = await response.json();
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
        rating: "",
        reviews: "",
        proposedBy: auth.currentUser?.displayName || "Traveler",
      });
      setIsActivityFormOpen(false);
      toast.success("Activity added successfully!");
    } catch (err: any) {
      console.error("Add activity error:", err?.message || err);
      const message = err?.message || "Failed to add activity.";
      setError(message);
      toast.error(message);
    }
  };

  const handleAddToPlan = async (suggestion: Activity) => {
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

      if (response.status === 409) {
        let body: any = null;
        try {
          body = await response.json();
        } catch (_) {
          /* Not JSON */
        }
        const msg = body?.message || "This activity is already present";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!response.ok) {
        let body: any = null;
        try {
          body = await response.clone().json();
        } catch (_) {
          /* Not JSON */
        }
        const serverMsg =
          body?.message ||
          (await response.text()).slice(0, 200) ||
          response.statusText;
        throw new Error(serverMsg);
      }

      const { activityId } = await response.json();
      const day = suggestion.day || 1;
      setDayActivities((prev) => ({
        ...prev,
        [day]: [...(prev[day] || []), { ...suggestion, id: activityId }],
      }));
      setTripDays((prev) =>
        prev.map((d) =>
          d.day === day ? { ...d, activities: (d.activities || 0) + 1 } : d
        )
      );
      toast.success("Activity added to plan!");
    } catch (err: any) {
      console.error("Add suggestion error:", err?.message || err);
      const msg = err?.message || "Failed to add activity";
      setError(msg);
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-purple-500"
        >
          <Calendar className="w-8 h-8" />
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
            Plan Your Solo Trip to {tripPlan.destination || "Anywhere"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Create a perfect itinerary just for you!
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
                  aria-label="Start solo trip"
                >
                  Start Solo Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Start Your Solo Trip</DialogTitle>
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
                      placeholder="e.g., Solo Adventure 2025"
                      aria-describedby="name-help"
                      className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                    <p id="name-help" className="text-sm text-gray-500">
                      Give your trip a name to remember it by.
                    </p>
                  </div>
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
                      required
                    />
                    <p id="destination-help" className="text-sm text-gray-500">
                      Enter a city, like 'Hyderabad' or 'Mumbai'.
                    </p>
                    <datalist id="cities">
                      {cities.map((city) => (
                        <option
                          key={city.id}
                          value={`${city.name}, ${city.country}`}
                        />
                      ))}
                    </datalist>
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
                        min="2025-09-17"
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        required
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
                        min="2025-09-17"
                        className="border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                        required
                      />
                      <p id="end-date-help" className="text-sm text-gray-500">
                        Select the end date of your trip.
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="budget">Your budget</Label>
                    <Select
                      value={tripPlan.budget}
                      onValueChange={(value) =>
                        setTripPlan({ ...tripPlan, budget: value })
                      }
                      required
                    >
                      <SelectTrigger className="bg-white border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-800 font-medium py-3 text-lg">
                        <SelectValue placeholder="Choose budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low ($)</SelectItem>
                        <SelectItem value="Medium">Medium ($$)</SelectItem>
                        <SelectItem value="High">High ($$$)</SelectItem>
                      </SelectContent>
                    </Select>
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
                                onChange={() => {
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
                                  });
                                }}
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
                  setTripPlan({
                    ...tripPlan,
                    name: "Sample Solo Trip",
                    destination: "Sample City",
                    startDate: "2025-09-17",
                    endDate: "2025-09-20",
                    budget: "Medium",
                  });
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
              Your Solo Trip
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {tripDays.length > 0
                ? `${tripPlan.name || "Untitled Trip"} • ${tripDays[0].date
                } - ${tripDays[tripDays.length - 1].date}`
                : "Start planning to see details"}
            </p>
            <h3 className="font-semibold text-gray-800 mb-2">Trip Days</h3>
            {tripDays.map((day) => (
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
                    {day.activities} activities
                  </Badge>
                </div>
              </button>
            ))}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="w-full mt-4 border-purple-500 text-gray-800 hover:bg-purple-50 hover:text-purple-600 bg-white z-10"
                aria-label="Add to calendar"
              >
                <Calendar className="w-4 h-4 mr-2 text-gray-800" />
                Add to Calendar
              </Button>
            </motion.div>
          </div>

          <div className="flex-1">
            <Tabs defaultValue="itinerary">
              <TabsList className="grid grid-cols-2 mb-4 bg-gray-100">
                <TabsTrigger
                  value="itinerary"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                >
                  Plan
                </TabsTrigger>
                <TabsTrigger
                  value="safety"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
                >
                  Safety
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
                          required
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
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="activity-type">Category</Label>
                        <Select
                          value={activityForm.type}
                          onValueChange={(value) =>
                            setActivityForm({ ...activityForm, type: value })
                          }
                          required
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
                          required
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
                          Rating: {activity.rating} ★
                        </p>
                        <p className="text-sm text-gray-600">
                          Reviews: {activity.reviews}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="safety">
                <SafetyDashboard
                  tripDestination={tripPlan.destination || "Your Destination"}
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
                      Rating: {suggestion.rating} ★
                    </p>
                    <p className="text-xs text-gray-600">
                      Reviews: {suggestion.reviews}
                    </p>
                    <p className="text-xs text-gray-600">
                      {suggestion.description}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 bg-purple-500 text-white hover:bg-purple-600 rounded-full"
                      aria-label={`Add ${suggestion.title} to plan`}
                      onClick={() => handleAddToPlan(suggestion)}
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

export default IndividualTripPlanner;
