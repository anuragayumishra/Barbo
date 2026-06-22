import React, { createContext, useContext, useState, useEffect } from 'react';

// ==========================================
// TYPES DEFINITIONS
// ==========================================

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  barberId?: string;
}

export interface Barber {
  id: string;
  name: string;
  title: string;
  specialty: string;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  delayStatus: string; // "On Time" | "+10 Min" | "+20 Min" | "Delayed"
  portfolioImages: string[];
  location: string;
  mapsUrl: string;
  distanceMeters: number; // Distance from customer's home
  routeCoordinates: { lat: number; lng: number }[]; // Custom map path coordinates
  leadStylist: string; // Lead Barber Stylist
  lat: number;
  lon: number;
  chairsCount: number;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  services: Service[];
  totalPrice: number;
  totalDuration: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentStatus?: string;
  travelOtp: string; // Secure 4-digit complete key
  notifications: string[]; // Event triggers
  userLat?: number;
  userLon?: number;
  barberLat?: number;
  barberLon?: number;
  travelLat?: number;
  travelLon?: number;
  travelEta?: number;
  travelDistance?: number;
  travelStatus?: string;
  travelSimProgress?: number;
  travelRouteCoordinates?: { lat: number; lng: number }[];
  reviewed?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'barber' | 'admin';
  barberId?: string; // Links a barber user to their barber profile
}

interface AppContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  barbers: Barber[];
  services: Service[];
  appointments: Appointment[];
  bookAppointment: (barberId: string, date: string, startTime: string, serviceIds: string[], paymentMethod?: string, paymentStatus?: string) => Promise<boolean>;
  rescheduleAppointment: (appointmentId: string, date: string, startTime: string, serviceIds?: string[]) => Promise<{ success: boolean; message: string }>;
  updateAppointmentStatus: (appointmentId: string, status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled', cancellationReason?: string) => void;
  updateBarberDelay: (barberId: string, delayStatus: string) => void;
  updateAppointmentTelemetry: (appointmentId: string, telemetry: Partial<Appointment>) => void;
  startAppointmentWithOtp: (appointmentId: string, otp: string) => Promise<{ success: boolean; message: string }>;
  completeAppointment: (appointmentId: string) => Promise<{ success: boolean; message: string }>;
  submitReview: (appointmentId: string, barberId: string, rating: number, comment: string) => Promise<{ success: boolean; message: string }>;
  
  // Real Maps & Geolocation Operations
  userCoordinates: { lat: number; lng: number } | null;
  setUserCoordinates: (coords: { lat: number; lng: number } | null) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  isMapLoading: boolean;
  setIsMapLoading: (loading: boolean) => void;
  fetchLocalBarbers: (lat: number, lng: number, searchName?: string) => Promise<void>;
  resetBarbersToDefault: () => void;

  // Onboarding & Admin Panel API functions
  submitApplication: (appData: any, services: any[]) => Promise<{ success: boolean; message: string }>;
  checkApplicationStatus: (email: string) => Promise<{ success: boolean; application: any }>;
  adminFetchApplications: () => Promise<{ success: boolean; applications: any[] }>;
  adminEditApplication: (id: number, appData: any, services: any[]) => Promise<{ success: boolean; message: string }>;
  adminApproveApplication: (id: number) => Promise<{ success: boolean; message: string }>;
  adminRejectApplication: (id: number, feedback: string) => Promise<{ success: boolean; message: string }>;
}

// ==========================================
// SEED DATA (INDIANIZED BHOPAL CONTEXT)
// ==========================================

const INITIAL_SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Luxe Haircut & Styling',
    description: 'Precision scissor and clipper cut with hair wash, conditioning head massage, and blowout styling.',
    price: 250,
    durationMinutes: 30,
  },
  {
    id: 's2',
    name: 'Beard Sculpting & Straight Razor Alignment',
    description: 'Professional beard trimming and alignment with warm lather, hot towels, and rich sandalwood beard oil.',
    price: 120,
    durationMinutes: 20,
  },
  {
    id: 's3',
    name: 'Traditional Champi (Herbal Head Oil Massage)',
    description: 'Classic deep-cleansing head massage using premium warm coconut or mahabhringraj herbal oils to relieve stress.',
    price: 150,
    durationMinutes: 20,
  },
  {
    id: 's4',
    name: 'Active Charcoal Face Detan & Clean-up',
    description: 'Deep exfoliating detanning scrub, warm steam, active charcoal clay pack, and face massage.',
    price: 300,
    durationMinutes: 30,
  },
  {
    id: 's5',
    name: 'Natural Hair Color & Blend (L\'Oreal)',
    description: 'Smooth gray blending or full natural black/dark brown hair color application.',
    price: 450,
    durationMinutes: 45,
  },
];

const INITIAL_BARBERS: Barber[] = [
  {
    id: 'b1',
    name: 'Looks Salon',
    title: 'Premium Professional Grooming',
    specialty: 'High-End Scissor Cuts & Premium Treatments',
    rating: 4.9,
    reviewsCount: 310,
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1605497746444-ac9dbd39f4a5?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'DB City Mall, MP Nagar, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Looks+Salon+DB+City+Mall+Bhopal',
    distanceMeters: 2000,
    routeCoordinates: [],
    leadStylist: 'Senior Stylist',
    lat: 23.232696,
    lon: 77.429901,
    chairsCount: 3
  },
  {
    id: 'b2',
    name: 'Dreamland Salon & Skin Care',
    title: 'Popular MP Nagar Salon',
    specialty: 'Textured Fades & Skin Care',
    rating: 4.8,
    reviewsCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Shop No. 52, Zone-II, MP Nagar, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dreamland+Salon+MP+Nagar+Bhopal',
    distanceMeters: 1800,
    routeCoordinates: [],
    leadStylist: 'Master Stylist',
    lat: 23.231500,
    lon: 77.432000,
    chairsCount: 2
  },
  {
    id: 'b3',
    name: 'Ideal Family Salon',
    title: 'Family Oriented Care',
    specialty: 'Classic Family Styling & Treatments',
    rating: 4.7,
    reviewsCount: 185,
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Arera Colony, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ideal+Family+Salon+Arera+Colony+Bhopal',
    distanceMeters: 3000,
    routeCoordinates: [],
    leadStylist: 'Deepali Sen',
    lat: 23.220872,
    lon: 77.429364,
    chairsCount: 3
  },
  {
    id: 'b4',
    name: 'Magic Hands Salon',
    title: 'Mens & Womens Grooming',
    specialty: 'Precision Clipper Cuts & Detan',
    rating: 4.5,
    reviewsCount: 95,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1605497746444-ac9dbd39f4a5?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Karond, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Magic+Hands+Salon+Karond+Bhopal',
    distanceMeters: 6000,
    routeCoordinates: [],
    leadStylist: 'Vicky Kumar',
    lat: 23.297422,
    lon: 77.402544,
    chairsCount: 2
  },
  {
    id: 'b5',
    name: 'Mirrors Unisex Salon',
    title: 'Beauty & Hair Care',
    specialty: 'Hair Botox & Professional Coloring',
    rating: 4.6,
    reviewsCount: 120,
    imageUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Airport Road, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mirrors+Unisex+Salon+Airport+Road+Bhopal',
    distanceMeters: 7000,
    routeCoordinates: [],
    leadStylist: 'Sameer Khan',
    lat: 23.291797,
    lon: 77.353161,
    chairsCount: 4
  },
  {
    id: 'b6',
    name: '7 Styles Salon',
    title: 'Men\'s Grooming Specialist',
    specialty: 'Beard Styling & Modern Fades',
    rating: 4.8,
    reviewsCount: 205,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Arera Colony, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=7+Styles+Salon+Arera+Colony+Bhopal',
    distanceMeters: 3100,
    routeCoordinates: [],
    leadStylist: 'Vikram Malhotra',
    lat: 23.218800,
    lon: 77.425300,
    chairsCount: 2
  },
  {
    id: 'b7',
    name: 'Hemant\'s Salon',
    title: 'Strong Grooming Reputation',
    specialty: 'Traditional Hot Towel Shave & Champi',
    rating: 4.7,
    reviewsCount: 150,
    imageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1605497746444-ac9dbd39f4a5?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Surendra Palace, Narayan Nagar, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hemant+Salon+Surendra+Palace+Bhopal',
    distanceMeters: 6500,
    routeCoordinates: [],
    leadStylist: 'Hemant Sen',
    lat: 23.197000,
    lon: 77.447000,
    chairsCount: 2
  },
  {
    id: 'b8',
    name: 'Vishal The Barber Shop',
    title: 'Local Mens Grooming',
    specialty: 'Buzzcuts, Trimming & Oil Massages',
    rating: 4.4,
    reviewsCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250&h=250',
    delayStatus: 'On Time',
    portfolioImages: [
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=400&h=400',
      'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&q=80&w=400&h=400',
    ],
    location: 'Bagh Swaniya, Bhopal',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Vishal+The+Barber+Shop+Bagh+Swaniya+Bhopal',
    distanceMeters: 5500,
    routeCoordinates: [],
    leadStylist: 'Vishal Kumar',
    lat: 23.208500,
    lon: 77.452000,
    chairsCount: 2
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'a-mock-1',
    customerId: 'cust-faizan',
    customerName: 'Faizan',
    barberId: 'b1',
    barberName: 'ScissorsRock Hair Studio',
    date: new Date().toISOString().split('T')[0], // Today
    startTime: '10:00',
    endTime: '10:50',
    services: [
      INITIAL_SERVICES[0], // Luxe Haircut (30m - ₹250)
      INITIAL_SERVICES[2], // Traditional Champi (20m - ₹150)
    ],
    totalPrice: 400,
    totalDuration: 50,
    status: 'completed',
    travelOtp: '2026',
    notifications: ['Customer has arrived!', 'OTP confirmed.'],
  },
  {
    id: 'a-mock-2',
    customerId: 'cust-faizan',
    customerName: 'Faizan',
    barberId: 'b1',
    barberName: 'ScissorsRock Hair Studio',
    date: new Date().toISOString().split('T')[0], // Today
    startTime: '16:30',
    endTime: '17:10',
    services: [
      INITIAL_SERVICES[1], // Beard Sculpting (20m - ₹120)
      INITIAL_SERVICES[3], // Charcoal Detan (30m - ₹300)
    ],
    totalPrice: 420,
    totalDuration: 50,
    status: 'upcoming',
    travelOtp: '8841',
    notifications: [],
    userLat: 23.2495,
    userLon: 77.4172,
    barberLat: 23.2425,
    barberLon: 77.4190,
    travelLat: 23.2495,
    travelLon: 77.4172,
    travelSimProgress: 0,
    travelDistance: 820,
    travelEta: 6,
    travelStatus: 'Departing Jinsi Home...',
    travelRouteCoordinates: [
      { lat: 23.2495, lng: 77.4172 },
      { lat: 23.2460, lng: 77.4180 },
      { lat: 23.2435, lng: 77.4185 },
      { lat: 23.2425, lng: 77.4190 }
    ]
  },
];

// ==========================================
// MOCK USERS DATABASE (CREDENTIALS)
// ==========================================

const MOCK_USERS: { email: string; pass: string; user: User }[] = [
  {
    email: 'faizan@barbo.in',
    pass: '123456',
    user: {
      id: 'cust-faizan',
      email: 'faizan@barbo.in',
      name: 'Faizan',
      role: 'customer',
    },
  },
  {
    email: 'rajesh@barbo.in',
    pass: '123456',
    user: {
      id: 'barber-rajesh',
      email: 'rajesh@barbo.in',
      name: 'ScissorsRock Hair Studio',
      role: 'barber',
      barberId: 'b1', // Links to ScissorsRock Hair Studio b1
    },
  },
  {
    email: 'admin@barbo.in',
    pass: '123456',
    user: {
      id: 'admin-user',
      email: 'admin@barbo.in',
      name: 'System Admin',
      role: 'admin',
    },
  },
];

// ==========================================
// HELPER GEOLOCATION FUNCTIONS
// ==========================================

// Haversine formula to compute exact distance in meters between two lat/lon coordinates
// calculateHaversineDistance removed

// ==========================================
// CONTEXT PROVIDER
// ==========================================

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001/api';

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('barbo_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [barbers, setBarbers] = useState<Barber[]>(INITIAL_BARBERS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('barbo_appointments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_APPOINTMENTS;
  });

  // Persist appointments locally to support offline fallback state
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('barbo_appointments', JSON.stringify(appointments));
    }
  }, [appointments, currentUser]);

  // Geolocation & Search States
  const [userCoordinates, setUserCoordinatesState] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = localStorage.getItem('barbo_user_coords');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { lat: 23.2495, lng: 77.4172 }; // Jinsi, Jahangirabad
  });

  const [locationName, setLocationName] = useState<string>(() => {
    return localStorage.getItem('barbo_location_name') || 'Jinsi, Jahangirabad, Bhopal';
  });

  const [isMapLoading, setIsMapLoading] = useState<boolean>(false);

  const setUserCoordinates = (coords: { lat: number; lng: number } | null) => {
    setUserCoordinatesState(coords);
    if (coords) {
      localStorage.setItem('barbo_user_coords', JSON.stringify(coords));
    } else {
      localStorage.removeItem('barbo_user_coords');
    }
  };

  useEffect(() => {
    localStorage.setItem('barbo_location_name', locationName);
  }, [locationName]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('barbo_active_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('barbo_active_user');
    }
  }, [currentUser]);

  // Load initial services catalog from database
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${BASE_URL}/services`);
        if (res.ok) {
          const data = await res.json();
          setServices(data);
        }
      } catch (err) {
        console.warn("Failed to load services from backend. Using offline seeds fallback.");
      }
    };
    fetchServices();
  }, []);

  // Load barbers based on center coordinates
  useEffect(() => {
    const initLocal = async () => {
      setIsMapLoading(true);
      const lat = userCoordinates?.lat || 23.2495;
      const lng = userCoordinates?.lng || 77.4172;
      try {
        const res = await fetch(`${BASE_URL}/barbers?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          setBarbers(data);
        }
      } catch (err) {
        console.warn("Failed to load barbers from backend. Using offline seeds fallback.");
      } finally {
        setIsMapLoading(false);
      }
    };
    initLocal();
  }, [userCoordinates]);

  // Load appointments dynamically when user logs in
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!currentUser) {
        setAppointments([]);
        return;
      }
      try {
        const res = await fetch(`${BASE_URL}/appointments?userId=${currentUser.id}&role=${currentUser.role}`);
        if (res.ok) {
          const data = await res.json();
          setAppointments(data);
        } else {
          // Fallback to local storage if DB is down but server is running
          const saved = localStorage.getItem('barbo_appointments');
          if (saved) {
            try {
              setAppointments(JSON.parse(saved));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Failed to load appointments from backend. Using offline seeds fallback.");
        const saved = localStorage.getItem('barbo_appointments');
        if (saved) {
          try {
            setAppointments(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };
    fetchAppointments();

    const intervalId = setInterval(fetchAppointments, 3000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Dynamic Barber Offsetting if Overpass finds nothing
  const fetchLocalBarbers = async (lat: number, lng: number, searchName?: string) => {
    setIsMapLoading(true);
    if (searchName) {
      setLocationName(searchName);
    }
    
    try {
      const backendRes = await fetch(`${BASE_URL}/barbers?lat=${lat}&lng=${lng}`);
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData && backendData.length > 0) {
          setBarbers(backendData);
        } else {
          setBarbers(INITIAL_BARBERS);
        }
      } else {
        setBarbers(INITIAL_BARBERS);
      }
    } catch (backendErr) {
      console.warn("Local MySQL backend query failed", backendErr);
      setBarbers(INITIAL_BARBERS);
    } finally {
      setIsMapLoading(false);
    }
  };

  const resetBarbersToDefault = async () => {
    setLocationName('Jinsi, Jahangirabad, Bhopal');
    setUserCoordinates({ lat: 23.2495, lng: 77.4172 });
    try {
      const res = await fetch(`${BASE_URL}/barbers?lat=23.2495&lng=77.4172`);
      if (res.ok) {
        const data = await res.json();
        setBarbers(data);
        return;
      }
    } catch(e) {}
    setBarbers(INITIAL_BARBERS);
  };

  // Auth Functions pointing to local MySQL database
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        return { success: true, message: 'Login successful!' };
      } else {
        if (res.status === 500 || res.status === 503) {
          throw new Error('Database connection failed');
        }
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch (err) {
      console.warn("Express server offline, running fallback local credential verifier.");
      const trimmedEmail = email.trim().toLowerCase();
      const found = MOCK_USERS.find((u) => u.email === trimmedEmail);

      if (!found) {
        return { success: false, message: 'Invalid credentials. Use faizan@barbo.in or rajesh@barbo.in' };
      }
      if (found.pass !== password) {
        return { success: false, message: 'Incorrect password. Hint: 123456' };
      }

      const loggedUser = { ...found.user };
      if (loggedUser.role === 'barber' && barbers.length > 0) {
        loggedUser.barberId = barbers[0].id;
      }

      setCurrentUser(loggedUser);
      return { success: true, message: 'Login successful! (Offline Fallback)' };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        return { success: true, message: 'Registration successful!' };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err) {
      console.warn("Express server offline, running fallback local credential creator.");
      const trimmedEmail = email.trim().toLowerCase();
      const exists = MOCK_USERS.some((u) => u.email === trimmedEmail);
      if (exists) {
        return { success: false, message: 'Email already registered.' };
      }

      const newUserId = `cust-${Date.now()}`;
      const newUser: User = {
        id: newUserId,
        email: trimmedEmail,
        name: name.trim(),
        role: 'customer'
      };

      MOCK_USERS.push({
        email: trimmedEmail,
        pass: password,
        user: newUser
      });

      setCurrentUser(newUser);
      return { success: true, message: 'Registration successful! (Offline Fallback)' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // Booking System Operations writing directly to database
  const bookAppointment = async (barberId: string, date: string, startTime: string, serviceIds: string[], paymentMethod?: string, paymentStatus?: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: currentUser.id,
          customerName: currentUser.name,
          barberId,
          date,
          startTime,
          serviceIds,
          paymentMethod,
          paymentStatus
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments((prev) => [data.appointment, ...prev]);
        return true;
      } else {
        if (res.status === 500 || res.status === 503) {
          throw new Error('Database connection failed');
        }
        alert(data.message || 'Failed to book slot.');
        return false;
      }
    } catch (err) {
      console.warn("Backend server offline, running fallback offline reservation.");
      // Validate that the slot is at least 30 minutes in the future
      const [yVal, mVal, dVal] = date.split('-').map(Number);
      const [hVal, minVal] = startTime.split(':').map(Number);
      const bookedTime = new Date(yVal, mVal - 1, dVal, hVal, minVal, 0);
      const now = new Date();
      if (bookedTime.getTime() - now.getTime() < 30 * 60 * 1000) {
        alert('New bookings must be scheduled at least 30 minutes in advance.');
        return false;
      }

      const selectedServices = services.filter((s) => serviceIds.includes(s.id));
      if (selectedServices.length === 0) return false;

      const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

      const [startHour, startMin] = startTime.split(':').map(Number);
      let endHour = startHour;
      let endMin = startMin + totalDuration;

      if (endMin >= 60) {
        endHour += Math.floor(endMin / 60);
        endMin = endMin % 60;
      }

      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      const targetBarber = barbers.find((b) => b.id === barberId);

      if (!targetBarber) return false;

      const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const startLat = userCoordinates?.lat || 23.2495;
      const startLon = userCoordinates?.lng || 77.4172;

      const newAppointment: Appointment = {
        id: `a-${Date.now()}`,
        customerId: currentUser.id,
        customerName: currentUser.name,
        barberId,
        barberName: targetBarber.name,
        date,
        startTime,
        endTime,
        services: selectedServices,
        totalPrice,
        totalDuration,
        status: 'upcoming',
        paymentMethod: paymentMethod || 'Pay At Shop',
        paymentStatus: paymentStatus || 'unpaid',
        travelOtp: randomOtp,
        notifications: [],
        userLat: startLat,
        userLon: startLon,
        barberLat: targetBarber.lat,
        barberLon: targetBarber.lon,
        travelLat: startLat,
        travelLon: startLon,
        travelSimProgress: 0,
        travelDistance: targetBarber.distanceMeters,
        travelEta: Math.max(2, Math.round(targetBarber.distanceMeters / 150)),
        travelStatus: 'Departing Jahangirabad Home...',
        travelRouteCoordinates: targetBarber.routeCoordinates
      };

      setAppointments((prev) => [newAppointment, ...prev]);
      return true;
    }
  };

  const rescheduleAppointment = async (appointmentId: string, date: string, startTime: string, serviceIds?: string[]): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${BASE_URL}/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime, serviceIds })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments((prev) =>
          prev.map((app) => (app.id === appointmentId ? data.appointment : app))
        );
        return { success: true, message: data.message };
      } else {
        if (res.status === 500 || res.status === 503) {
          throw new Error('Database connection failed');
        }
        return { success: false, message: data.message || 'Failed to reschedule.' };
      }
    } catch (err) {
      console.warn("Server offline, performing offline fallback reschedule.");
      const app = appointments.find(a => a.id === appointmentId);
      if (!app) return { success: false, message: 'Appointment not found.' };

      const now = new Date();

      // Validate that the new scheduled time is not in the past
      const [parsedY, parsedM, parsedD] = date.split('-').map(Number);
      const [parsedH, parsedMin] = startTime.split(':').map(Number);
      const newScheduledTime = new Date(parsedY, parsedM - 1, parsedD, parsedH, parsedMin, 0);
      if (newScheduledTime.getTime() <= now.getTime()) {
        return { success: false, message: 'Cannot reschedule to a past date or time.' };
      }

      // Validate offline reschedule window: at least 30 minutes if time/date changed, or 5 minutes if only services changed
      const isDateTimeChanged = app.date !== date || app.startTime !== startTime;
      const cutoffMinutes = isDateTimeChanged ? 30 : 5;

      const [y, m, dStr] = app.date.split('-').map(Number);
      const [hours, minutes] = app.startTime.split(':').map(Number);
      const scheduledTime = new Date(y, m - 1, dStr, hours, minutes, 0);
      const timeDiffMinutes = (scheduledTime.getTime() - now.getTime()) / (60 * 1000);

      if (timeDiffMinutes < cutoffMinutes) {
        return {
          success: false,
          message: `Rescheduling is only allowed at least ${cutoffMinutes} minutes before the scheduled start time.`
        };
      }

      // Check collision for offline mode (same logic as offline bookAppointment)
      const targetBarber = barbers.find(b => b.id === app.barberId);
      if (!targetBarber) return { success: false, message: 'Barber not found.' };

      // Recalculate duration/price based on new serviceIds if provided
      let updatedServices = app.services;
      let newPrice = app.totalPrice;
      let newDuration = app.totalDuration;
      if (serviceIds) {
        updatedServices = services.filter(s => serviceIds.includes(s.id));
        newPrice = updatedServices.reduce((sum, s) => sum + s.price, 0);
        newDuration = updatedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
      }

      // Calculate end time
      const [newH, newM] = startTime.split(':').map(Number);
      let endH = newH;
      let endM = newM + newDuration;
      if (endM >= 60) {
        endH += Math.floor(endM / 60);
        endM = endM % 60;
      }
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // Check collision
      const collisionTime = (s1: number, e1: number, s2: number, e2: number) => {
        return (s1 < e2 && s2 < e1);
      };

      const timeToMins = (t: string) => {
        const [h, min] = t.split(':').map(Number);
        return h * 60 + min;
      };

      const targetStart = timeToMins(startTime);
      const targetEnd = targetStart + newDuration;

      // Filter other upcoming/in_progress appointments on the same date for this barber
      const otherApps = appointments.filter(a => a.barberId === app.barberId && a.date === date && a.status === 'upcoming' && a.id !== appointmentId);
      let overlapCount = 0;
      for (const ov of otherApps) {
        const s = timeToMins(ov.startTime);
        const e = timeToMins(ov.endTime);
        if (collisionTime(targetStart, targetEnd, s, e)) {
          overlapCount++;
        }
      }

      if (overlapCount >= (targetBarber.chairsCount || 2)) {
        return { success: false, message: 'Time slot collision detected! The salon is at full capacity at the selected time.' };
      }

      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { 
          ...a, 
          date, 
          startTime, 
          endTime, 
          services: updatedServices,
          totalPrice: newPrice,
          totalDuration: newDuration,
          travelSimProgress: 0, 
          travelStatus: 'Preparing Departure...',
          notifications: [`Rescheduled to ${date} at ${startTime}`]
        } : a))
      );

      return { success: true, message: 'Appointment successfully rescheduled (offline).' };
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string, 
    status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
    cancellationReason?: string
  ) => {
    setAppointments((prev) =>
      prev.map((app) => {
        if (app.id === appointmentId) {
          const isRefunded = status === 'cancelled' && app.paymentStatus === 'paid';
          return {
            ...app,
            status,
            paymentStatus: isRefunded ? 'refunded' : app.paymentStatus,
            travelStatus: status === 'cancelled' && cancellationReason ? `Cancelled: ${cancellationReason}` : app.travelStatus,
            notifications: status === 'cancelled' && cancellationReason 
              ? [
                  ...(app.notifications || []), 
                  `Appointment cancelled. Reason: ${cancellationReason}`,
                  ...(isRefunded ? [`Refund of ₹${app.totalPrice} initiated to your original payment method.`] : [])
                ] 
              : app.notifications
          };
        }
        return app;
      })
    );

    try {
      if (status === 'cancelled') {
        const reason = cancellationReason || 'No reason provided';
        await fetch(`${BASE_URL}/appointments/${appointmentId}/telemetry`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            travelStatus: `Cancelled: ${reason}`, 
            travelSimProgress: 0, 
            status: 'cancelled',
            notification: `Appointment cancelled. Reason: ${reason}`
          })
        });
      }
    } catch(e) {}
  };

  const updateBarberDelay = async (barberId: string, delayStatus: string) => {
    setBarbers((prev) =>
      prev.map((barber) => (barber.id === barberId ? { ...barber, delayStatus } : barber))
    );

    try {
      await fetch(`${BASE_URL}/barbers/${barberId}/delay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayStatus })
      });
    } catch (e) {}
  };

  const updateAppointmentTelemetry = async (appointmentId: string, telemetry: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((app) => (app.id === appointmentId ? { ...app, ...telemetry } : app))
    );

    try {
      const notifs = telemetry.notifications || [];
      const latestMessage = notifs.length > 0 ? notifs[notifs.length - 1] : null;

      await fetch(`${BASE_URL}/appointments/${appointmentId}/telemetry`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelLat: telemetry.travelLat,
          travelLon: telemetry.travelLon,
          travelEta: telemetry.travelEta,
          travelDistance: telemetry.travelDistance,
          travelStatus: telemetry.travelStatus,
          travelSimProgress: telemetry.travelSimProgress,
          travelRouteCoordinates: telemetry.travelRouteCoordinates,
          notification: latestMessage
        })
      });
    } catch (e) {}
  };

  // Start appointment with OTP verification (OTP check-in)
  const startAppointmentWithOtp = async (appointmentId: string, otp: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${BASE_URL}/appointments/${appointmentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments((prev) =>
          prev.map((app) => (app.id === appointmentId ? { ...app, status: 'in_progress', notifications: [...(app.notifications || []), "OTP Verified. Service started successfully!"] } : app))
        );
        return { success: true, message: 'OTP verified. Service started!' };
      } else {
        if (res.status === 500 || res.status === 503) {
          throw new Error('Database connection failed');
        }
        return { success: false, message: data.message || 'OTP Verification failed!' };
      }
    } catch (err) {
      console.warn("Server offline, performing offline fallback check-in.");
      const app = appointments.find(a => a.id === appointmentId);
      if (app && app.travelOtp === otp) {
        // Validate offline check-in time: within +/- 30 minutes of scheduled start time
        const [y, m, dStr] = app.date.split('-').map(Number);
        const [hours, minutes] = app.startTime.split(':').map(Number);
        const scheduledTime = new Date(y, m - 1, dStr, hours, minutes, 0);
        const now = new Date();
        const diffMinutes = Math.abs(now.getTime() - scheduledTime.getTime()) / (60 * 1000);

        if (diffMinutes > 30) {
          return {
            success: false,
            message: `Check-in is only allowed within 30 minutes before or after your scheduled start time (${app.startTime}). Please try again closer to your appointment time.`
          };
        }

        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, status: 'in_progress', notifications: [...(a.notifications || []), "OTP check-in authorized (offline)."] } : a))
        );
        return { success: true, message: 'Offline check-in authorized.' };
      }
      return { success: false, message: 'Invalid secure OTP code entered.' };
    }
  };

  // Complete service when finished (no OTP needed)
  const completeAppointment = async (appointmentId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${BASE_URL}/appointments/${appointmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments((prev) =>
          prev.map((app) => (app.id === appointmentId ? { ...app, status: 'completed', notifications: [...(app.notifications || []), "Service completed."] } : app))
        );
        return { success: true, message: 'Service marked completed!' };
      } else {
        if (res.status === 500 || res.status === 503) {
          throw new Error('Database connection failed');
        }
        return { success: false, message: data.message || 'Failed to complete service!' };
      }
    } catch (err) {
      console.warn("Server offline, completing service locally.");
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? { ...app, status: 'completed', notifications: [...(app.notifications || []), "Service completed (offline)."] } : app))
      );
      return { success: true, message: 'Service marked completed locally.' };
    }
  };

  // Submit Review & rating (calls backend or runs offline fallback)
  const submitReview = async (appointmentId: string, barberId: string, rating: number, comment: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'User not logged in' };
    
    try {
      const res = await fetch(`${BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          barberId,
          customerId: currentUser.id,
          rating,
          comment
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppointments((prev) =>
          prev.map((app) => (app.id === appointmentId ? { ...app, reviewed: true } : app))
        );

        // Fetch updated barbers
        const lat = userCoordinates?.lat || 23.2495;
        const lng = userCoordinates?.lng || 77.4172;
        try {
          const bRes = await fetch(`${BASE_URL}/barbers?lat=${lat}&lng=${lng}`);
          if (bRes.ok) {
            const bData = await bRes.json();
            if (bData) setBarbers(bData);
          }
        } catch (e) {}

        return { success: true, message: 'Review submitted successfully!' };
      } else {
        if (res.status === 500 || res.status === 503) {
          throw new Error('Database connection failed');
        }
        return { success: false, message: data.message || 'Failed to submit review.' };
      }
    } catch (err) {
      console.warn("Server offline, submitting review locally.");
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointmentId ? { ...app, reviewed: true } : app))
      );

      setBarbers((prevBarbers) =>
        prevBarbers.map((b) => {
          if (b.id === barberId) {
            const originalCount = b.reviewsCount;
            const originalRating = b.rating;
            const newCount = originalCount + 1;
            const newRating = ((originalRating * originalCount) + rating) / newCount;
            const roundedRating = Math.round(newRating * 10) / 10;
            return { ...b, rating: roundedRating, reviewsCount: newCount };
          }
          return b;
        })
      );      return { success: true, message: 'Review submitted locally.' };
    }
  };

  // Local storage backup for offline/mock applications
  const [mockApplications, setMockApplications] = useState<any[]>(() => {
    const saved = localStorage.getItem('barbo_mock_applications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('barbo_mock_applications', JSON.stringify(mockApplications));
  }, [mockApplications]);

  const submitApplication = async (appData: any, servicesList: any[]) => {
    try {
      const res = await fetch(`${BASE_URL}/onboarding/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appData, services: servicesList })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'Application submitted successfully!' };
      }
      return { success: false, message: data.message || 'Submission failed' };
    } catch (err) {
      console.warn("Express server offline, running fallback local onboarding submission.");
      const email = appData.email.trim().toLowerCase();
      
      // Check existing mock applications
      const existingIdx = mockApplications.findIndex(a => a.email === email);
      if (existingIdx !== -1) {
        const app = mockApplications[existingIdx];
        if (app.status === 'approved') {
          return { success: false, message: 'An application with this email has already been approved' };
        }
        const updated = [...mockApplications];
        updated[existingIdx] = {
          ...app,
          shopName: appData.shopName,
          ownerName: appData.ownerName,
          contactNumber: appData.contactNumber,
          location: appData.location,
          lat: appData.lat,
          lon: appData.lon,
          chairsCount: appData.chairsCount,
          openingTime: appData.openingTime,
          closingTime: appData.closingTime,
          status: 'pending',
          rejectionFeedback: null,
          updatedAt: new Date().toISOString(),
          services: servicesList.map((s, idx) => ({ ...s, id: `mock-s-${app.id}-${idx}`, durationMinutes: Number(s.durationMinutes) }))
        };
        setMockApplications(updated);
      } else {
        const newId = Date.now();
        const newApp = {
          id: newId,
          shopName: appData.shopName,
          ownerName: appData.ownerName,
          email,
          contactNumber: appData.contactNumber,
          location: appData.location,
          lat: appData.lat,
          lon: appData.lon,
          chairsCount: appData.chairsCount,
          openingTime: appData.openingTime,
          closingTime: appData.closingTime,
          status: 'pending',
          rejectionFeedback: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          services: servicesList.map((s, idx) => ({ ...s, id: `mock-s-${newId}-${idx}`, durationMinutes: Number(s.durationMinutes) }))
        };
        setMockApplications(prev => [...prev, newApp]);
      }
      return { success: true, message: 'Application submitted successfully! (Offline Fallback)' };
    }
  };

  const checkApplicationStatus = async (email: string) => {
    try {
      const res = await fetch(`${BASE_URL}/onboarding/status/${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, application: data.application };
      }
      return { success: false, application: null };
    } catch (err) {
      console.warn("Express server offline, running fallback local onboarding status checker.");
      const trimmedEmail = email.trim().toLowerCase();
      const found = mockApplications.find(a => a.email === trimmedEmail);
      if (!found) {
        return { success: false, application: null };
      }
      return { success: true, application: found };
    }
  };

  const adminFetchApplications = async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/applications`);
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, applications: data.applications };
      }
      return { success: false, applications: [] };
    } catch (err) {
      console.warn("Express server offline, running fallback local admin applications retrieval.");
      return { success: true, applications: mockApplications };
    }
  };

  const adminEditApplication = async (id: number, appData: any, servicesList: any[]) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appData, services: servicesList })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'Application updated successfully!' };
      }
      return { success: false, message: data.message || 'Update failed' };
    } catch (err) {
      console.warn("Express server offline, running fallback local admin application editor.");
      const updated = mockApplications.map(a => {
        if (a.id === id) {
          return {
            ...a,
            ...appData,
            services: servicesList.map((s, idx) => ({ ...s, id: `mock-s-${id}-${idx}`, durationMinutes: Number(s.durationMinutes) })),
            updatedAt: new Date().toISOString()
          };
        }
        return a;
      });
      setMockApplications(updated);
      return { success: true, message: 'Application updated successfully! (Offline Fallback)' };
    }
  };

  const adminApproveApplication = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/applications/${id}/approve`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Trigger live refresh of barbers & services
        const lat = userCoordinates?.lat || 23.2495;
        const lng = userCoordinates?.lng || 77.4172;
        fetchLocalBarbers(lat, lng);
        
        // Refresh services list
        try {
          const sRes = await fetch(`${BASE_URL}/services`);
          if (sRes.ok) {
            const sData = await sRes.json();
            setServices(sData);
          }
        } catch (e) {}

        return { success: true, message: data.message || 'Application approved successfully!' };
      }
      return { success: false, message: data.message || 'Approval failed' };
    } catch (err) {
      console.warn("Express server offline, running fallback local admin application approval.");
      const app = mockApplications.find(a => a.id === id);
      if (!app) {
        return { success: false, message: 'Application not found' };
      }

      // Update application status
      setMockApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));

      // Provision Barber Profile
      const newBarberId = `b-${Date.now()}`;
      const newBarber: Barber = {
        id: newBarberId,
        name: app.shopName,
        title: 'Premium Professional Grooming',
        specialty: 'Custom Styling & Grooming',
        rating: 4.8,
        reviewsCount: 0,
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=250&h=250',
        delayStatus: 'On Time',
        portfolioImages: [],
        location: app.location,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(app.shopName + ' ' + app.location)}`,
        distanceMeters: 1500,
        routeCoordinates: [
          { lat: userCoordinates?.lat || 23.2495, lng: userCoordinates?.lng || 77.4172 },
          { lat: app.lat, lng: app.lon }
        ],
        leadStylist: app.ownerName,
        lat: app.lat,
        lon: app.lon,
        chairsCount: app.chairsCount
      };

      setBarbers(prev => [...prev, newBarber]);

      // Provision Custom Services
      const newServices: Service[] = app.services.map((s: any, idx: number) => ({
        id: `s-${newBarberId}-${idx}`,
        name: s.name,
        description: `Premium ${s.name} service custom tailored for you.`,
        price: Number(s.price),
        durationMinutes: Number(s.durationMinutes),
        barberId: newBarberId
      }));

      setServices(prev => [...prev, ...newServices]);

      // Provision User Account
      const newUserId = `barber-user-${Date.now()}`;
      const newUser: User = {
        id: newUserId,
        email: app.email,
        name: app.ownerName,
        role: 'barber',
        barberId: newBarberId
      };

      // Add to MOCK_USERS
      MOCK_USERS.push({
        email: app.email,
        pass: '123456', // default
        user: newUser
      });

      return { success: true, message: 'Application approved and accounts provisioned! (Offline Fallback)' };
    }
  };

  const adminRejectApplication = async (id: number, feedback: string) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'Application rejected successfully.' };
      }
      return { success: false, message: data.message || 'Rejection failed' };
    } catch (err) {
      console.warn("Express server offline, running fallback local admin application rejection.");
      setMockApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejectionFeedback: feedback } : a));
      return { success: true, message: 'Application rejected with feedback. (Offline Fallback)' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        signup,
        logout,
        barbers,
        services,
        appointments,
        bookAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        updateBarberDelay,
        updateAppointmentTelemetry,
        startAppointmentWithOtp,
        completeAppointment,
        submitReview,
        
        // Geolocation search bindings
        userCoordinates,
        setUserCoordinates,
        locationName,
        setLocationName,
        isMapLoading,
        setIsMapLoading,
        fetchLocalBarbers,
        resetBarbersToDefault,

        // Onboarding & Admin
        submitApplication,
        checkApplicationStatus,
        adminFetchApplications,
        adminEditApplication,
        adminApproveApplication,
        adminRejectApplication
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
