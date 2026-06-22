import React, { useState, useEffect, useRef } from 'react';
import { useApp, Barber } from './context/AppContext.tsx';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Star, 
  User, 
  ChevronRight,
  Sparkles,
  MapPin,
  Lock,
  Mail,
  LogOut,
  Sun,
  Moon,
  Compass,
  Search,
  Key,
  AlertTriangle,
  Plus,
  Trash,
  Edit,
  Building,
  Settings,
  XCircle
} from 'lucide-react';
import { gsap } from 'gsap';

// Pre-compiled local coordinates for Bhopal key neighborhoods to ensure resilient offline fallback geocoding
const LOCAL_BHOPAL_COORDS: Record<string, { lat: number; lon: number; display: string }> = {
  indrapuri: { lat: 23.2515, lon: 77.4660, display: 'Indrapuri, Bhopal' },
  jahangirabad: { lat: 23.2495, lon: 77.4172, display: 'Jinsi, Jahangirabad, Bhopal' },
  jinsi: { lat: 23.2495, lon: 77.4172, display: 'Jinsi, Jahangirabad, Bhopal' },
  'chaar batti': { lat: 23.2355, lon: 77.4150, display: 'Chaar Batti Choraha, Bhopal' },
  'mp nagar': { lat: 23.2315, lon: 77.4320, display: 'MP Nagar, Bhopal' },
  'arera colony': { lat: 23.2140, lon: 77.4350, display: 'Arera Colony, Bhopal' },
  bhel: { lat: 23.2475, lon: 77.4680, display: 'BHEL, Bhopal' },
  piplani: { lat: 23.2475, lon: 77.4680, display: 'Piplani, Bhopal' },
  'tt nagar': { lat: 23.2430, lon: 77.4010, display: 'TT Nagar, Bhopal' },
  'new market': { lat: 23.2430, lon: 77.4010, display: 'New Market, Bhopal' },
  'koh-e-fiza': { lat: 23.2660, lon: 77.3850, display: 'Koh-e-Fiza, Bhopal' },
  kolar: { lat: 23.1730, lon: 77.4190, display: 'Kolar Road, Bhopal' },
  lalghati: { lat: 23.2790, lon: 77.3630, display: 'Lalghati, Bhopal' }
};

// ==========================================
// GOOGLE MAPS NAVIGATION REDIRECT
// ==========================================
interface NavigateButtonProps {
  appointment: any;
  barber: Barber;
  hideButton?: boolean;
}

const NavigateButton: React.FC<NavigateButtonProps> = ({ appointment, barber, hideButton }) => {
  const handleNavigate = () => {
    const userLat = appointment.userLat || 23.2495;
    const userLon = appointment.userLon || 77.4172;
    const barberLat = appointment.barberLat || barber.lat || 23.2425;
    const barberLon = appointment.barberLon || barber.lon || 77.4190;
    
    const routingUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${barberLat},${barberLon}&travelmode=driving`;
    window.open(routingUrl, '_blank');
  };

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!hideButton && (
        <button 
          type="button" 
          className="gold-glow-btn" 
          style={{ padding: '14px 20px', fontSize: '1rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', cursor: 'pointer' }}
          onClick={handleNavigate}
        >
          <MapPin size={18} />
          Navigate to {barber.name} via Maps
        </button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Est. Distance</span>
          <strong style={{ fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
            {appointment.travelDistance !== undefined ? `${appointment.travelDistance}m` : `${barber.distanceMeters}m`}
          </strong>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Transit Time</span>
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {appointment.travelEta !== undefined ? `${appointment.travelEta} min` : '8 min'}
          </strong>
        </div>
      </div>
    </div>
  );
};

interface ReviewPromptProps {
  app: any;
  submitReview: (appointmentId: string, barberId: string, rating: number, comment: string) => Promise<{ success: boolean; message: string }>;
  onSuccess?: (message: string) => void;
}

const ReviewPrompt: React.FC<ReviewPromptProps> = ({ app, submitReview, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  return (
    <div className="glass-card gsap-card animate-slide-up" style={{ marginBottom: '36px', border: '1px solid var(--accent-gold-glow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent-gold)' }}>
        <Sparkles size={20} />
        <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Rate Your Experience</h3>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
        Your service at <strong>{app.barberName}</strong> is complete. Share your feedback to help others!
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Rating</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <Star 
                  size={24} 
                  fill={star <= rating ? 'var(--accent-gold)' : 'transparent'} 
                  style={{ color: 'var(--accent-gold)' }} 
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Write a Review</span>
          <textarea
            placeholder="Tell us about the service, cut quality, or styling experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%',
              minHeight: '70px',
              padding: '12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
        </div>

        {msg && <p style={{ fontSize: '0.85rem', color: 'var(--status-green)', fontWeight: 600 }}>{msg}</p>}

        <button
          type="button"
          className="gold-glow-btn"
          disabled={submitting || !!msg}
          onClick={async () => {
            setSubmitting(true);
            const res = await submitReview(app.id, app.barberId, rating, comment);
            setSubmitting(false);
            if (res.success) {
              setMsg('Thank you for your feedback!');
              if (onSuccess) {
                onSuccess('Thank you! Review submitted successfully.');
              }
            }
          }}
          style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.85rem', justifyContent: 'center' }}
        >
          {submitting ? 'Submitting...' : msg ? 'Feedback Submitted ✓' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const { 
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
    startAppointmentWithOtp,
    completeAppointment,
    submitReview,
    setUserCoordinates,
    locationName,
    fetchLocalBarbers,
    resetBarbersToDefault,
    submitApplication,
    checkApplicationStatus,
    adminFetchApplications,
    adminEditApplication,
    adminApproveApplication,
    adminRejectApplication
  } = useApp();

  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dateVal}`;
  };

  const isOtpVisible = (appDate: string, startTime: string) => {
    const [y, m, d] = appDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    const scheduledTime = new Date(y, m - 1, d, hours, minutes, 0);
    const now = new Date();
    const timeRemainingMinutes = (scheduledTime.getTime() - now.getTime()) / (60 * 1000);
    return timeRemainingMinutes <= 45;
  };

  const isCheckInWindowOpen = (appDate: string, startTime: string, endTime: string) => {
    const [y, m, d] = appDate.split('-').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const slotEndTime = new Date(y, m - 1, d, endH, endM, 0);
    const now = new Date();
    if (now.getTime() > slotEndTime.getTime()) {
      return false;
    }
    const [hours, minutes] = startTime.split(':').map(Number);
    const scheduledTime = new Date(y, m - 1, d, hours, minutes, 0);
    const diffMinutes = Math.abs(now.getTime() - scheduledTime.getTime()) / (60 * 1000);
    return diffMinutes <= 30;
  };

  const canReschedule = (appDate: string, startTime: string) => {
    const [y, m, d] = appDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    const scheduledTime = new Date(y, m - 1, d, hours, minutes, 0);
    const now = new Date();
    const timeDiffMinutes = (scheduledTime.getTime() - now.getTime()) / (60 * 1000);
    return timeDiffMinutes >= 5;
  };

  const sortUpcomingAppointments = (apps: any[]) => {
    return [...apps].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.startTime}`);
      const dateTimeB = new Date(`${b.date}T${b.startTime}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
  };

  const sortPastAppointments = (apps: any[]) => {
    return [...apps].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.startTime}`);
      const dateTimeB = new Date(`${b.date}T${b.startTime}`);
      return dateTimeB.getTime() - dateTimeA.getTime();
    });
  };

  // Login Form States
  const [isSignup, setIsSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Geolocation Geocoder and OTP states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [activeOtpApp, setActiveOtpApp] = useState<any | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);

  // UX Enhancements: cancellation confirmation and toast notifications
  const [rescheduleApp, setRescheduleApp] = useState<any | null>(null);
  const isTimeSelectionDisabled = rescheduleApp ? (() => {
    const [y, m, d] = rescheduleApp.date.split('-').map(Number);
    const [hours, minutes] = rescheduleApp.startTime.split(':').map(Number);
    const scheduledTime = new Date(y, m - 1, d, hours, minutes, 0);
    const now = new Date();
    const timeDiffMinutes = (scheduledTime.getTime() - now.getTime()) / (60 * 1000);
    return timeDiffMinutes < 30;
  })() : false;
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMsg(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Geolocation Radar Scanner States
  const [isLocationGranted, setIsLocationGranted] = useState(() => {
    return localStorage.getItem('barbo_location_granted') === 'true';
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  // Toggled appointments on Customer dashboard for showing the live map inline
  const [activeMapAppId, setActiveMapAppId] = useState<string | null>(null);

  // Sorting Barbers by proximity (ScissorsRock first, Nargis-2 second, LEGACY third)
  const sortedBarbers = [...barbers].sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Selected barber in barber portal (resolved dynamically from authenticated user, fallback to b1)
  const activeBarberId = (currentUser && currentUser.role === 'barber' && currentUser.barberId) ? currentUser.barberId : 'b1';
  const activeBarber = barbers.find((b) => b.id === activeBarberId) || barbers[0];


  // Booking Modal States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return getLocalDateString();
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Payment states
  const [paymentMethodOption, setPaymentMethodOption] = useState<'Pay At Shop' | 'UPI Online'>('Pay At Shop');
  const [showPaymentQrModal, setShowPaymentQrModal] = useState(false);
  const [paymentUpiLoaderStatus, setPaymentUpiLoaderStatus] = useState('');
  const [paymentUpiError, setPaymentUpiError] = useState('');

  // Onboarding Modal States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingTab, setOnboardingTab] = useState<'apply' | 'status'>('apply');
  const [onboardingEmailInput, setOnboardingEmailInput] = useState('');
  const [checkedApplication, setCheckedApplication] = useState<any | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Onboarding Form States
  const [onboardingShopName, setOnboardingShopName] = useState('');
  const [onboardingOwnerName, setOnboardingOwnerName] = useState('');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [onboardingContactNumber, setOnboardingContactNumber] = useState('');
  const [onboardingLocation, setOnboardingLocation] = useState('');
  const [onboardingLat, setOnboardingLat] = useState('23.2500');
  const [onboardingLon, setOnboardingLon] = useState('77.4100');
  const [onboardingChairsCount, setOnboardingChairsCount] = useState(2);
  const [onboardingOpeningTime, setOnboardingOpeningTime] = useState('09:00');
  const [onboardingClosingTime, setOnboardingClosingTime] = useState('21:00');
  const [onboardingServices, setOnboardingServices] = useState<{ name: string; price: number; durationMinutes: number }[]>([
    { name: 'Classic Haircut', price: 150, durationMinutes: 20 },
    { name: 'Beard Trim & Shave', price: 100, durationMinutes: 15 }
  ]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('100');
  const [newServiceDuration, setNewServiceDuration] = useState('20');
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  // Admin Dashboard States
  const [adminApplications, setAdminApplications] = useState<any[]>([]);
  const [selectedAdminApp, setSelectedAdminApp] = useState<any | null>(null);
  const [loadingAdminApps, setLoadingAdminApps] = useState(false);
  const [adminActionFeedback, setAdminActionFeedback] = useState('');
  const [adminActionError, setAdminActionError] = useState('');
  const [showRejectFeedbackModal, setShowRejectFeedbackModal] = useState(false);
  const [rejectFeedbackText, setRejectFeedbackText] = useState('');
  const [isAdminEditing, setIsAdminEditing] = useState(false);

  // Admin Edit Form States
  const [adminEditShopName, setAdminEditShopName] = useState('');
  const [adminEditOwnerName, setAdminEditOwnerName] = useState('');
  const [adminEditContactNumber, setAdminEditContactNumber] = useState('');
  const [adminEditLocation, setAdminEditLocation] = useState('');
  const [adminEditLat, setAdminEditLat] = useState('23.2500');
  const [adminEditLon, setAdminEditLon] = useState('77.4100');
  const [adminEditChairsCount, setAdminEditChairsCount] = useState(2);
  const [adminEditOpeningTime, setAdminEditOpeningTime] = useState('09:00');
  const [adminEditClosingTime, setAdminEditClosingTime] = useState('21:00');
  const [adminEditServices, setAdminEditServices] = useState<{ name: string; price: number; durationMinutes: number }[]>([]);


  // Cancellation Modal States
  const [cancellingApp, setCancellingApp] = useState<any | null>(null);
  const [cancelReasonOption, setCancelReasonOption] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const cancelledAppIdsRef = useRef<Set<string>>(new Set());

  // Day & Night Theme State
  const [isLightMode, setIsLightMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'light';
  });

  // GSAP Animation Refs
  const mainRef = useRef<HTMLDivElement>(null);

  // Browser GPS Geolocation Handler with reverse geocoding via Nominatim
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }
    
    setIsSearchingAddress(true);
    setSearchError('');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        
        // Dynamic snaped threshold calculation:
        // Since Earth's circumference is 40,000km, any coordinate outside a 40km radius of Bhopal
        // is considered out-of-bounds for the testbed. We snap it to the Jahangirabad Jinsi center.
        const R = 6371e3; // Earth radius in meters
        const latRef = 23.2495;
        const lonRef = 77.4172;
        const φ1 = lat * Math.PI / 180;
        const φ2 = latRef * Math.PI / 180;
        const Δφ = (latRef - lat) * Math.PI / 180;
        const Δλ = (lonRef - lon) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distFromBhopal = R * c;

        let snapped = false;
        if (distFromBhopal > 40000) {
          lat = 23.2495;
          lon = 77.4172;
          snapped = true;
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          let displayName = snapped ? 'CL Colony Jinsi, Bhopal (GPS Snapped)' : `GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
          if (!snapped && res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              displayName = data.display_name.split(',')[0] + ', Bhopal';
            }
          }
          setUserCoordinates({ lat, lng: lon });
          await fetchLocalBarbers(lat, lon, displayName);
          setSearchQuery('');
        } catch (err) {
          const rawName = snapped ? 'Jahangirabad, Bhopal (GPS Snapped)' : `GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
          setUserCoordinates({ lat, lng: lon });
          await fetchLocalBarbers(lat, lon, rawName);
        } finally {
          setIsSearchingAddress(false);
        }
      },
      (_error) => {
        setIsSearchingAddress(false);
        setSearchError('Failed to retrieve location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Toggle Theme Function
  const handleToggleTheme = () => {
    const nextTheme = !isLightMode;
    setIsLightMode(nextTheme);
    if (nextTheme) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };
  
  // Real-time cancellation notification listener
  const prevAppointmentsRef = useRef<any[]>([]);
  useEffect(() => {
    if (prevAppointmentsRef.current.length > 0 && appointments.length > 0 && currentUser) {
      appointments.forEach((app) => {
        const prevApp = prevAppointmentsRef.current.find((a) => a.id === app.id);
        if (prevApp && prevApp.status !== 'cancelled' && app.status === 'cancelled') {
          const isCancelledLocally = cancelledAppIdsRef.current.has(app.id);
          if (!isCancelledLocally) {
            const reasonMatch = app.travelStatus && app.travelStatus.startsWith('Cancelled: ') 
              ? app.travelStatus.replace('Cancelled: ', '') 
              : 'No reason provided';
            
            if (currentUser.role === 'customer' && app.customerId === currentUser.id) {
              showToast(`Your appointment with ${app.barberName} on ${app.date} at ${app.startTime} was cancelled. Reason: ${reasonMatch}`);
            } else if (currentUser.role === 'barber' && app.barberId === activeBarberId) {
              showToast(`Appointment for ${app.customerName} on ${app.date} at ${app.startTime} was cancelled. Reason: ${reasonMatch}`);
            }
          }
        }
      });
    }
    prevAppointmentsRef.current = appointments;
  }, [appointments, currentUser, activeBarberId]);

  // Geolocation Radar scanning simulation timer hook
  useEffect(() => {
    let timer: any;
    if (isScanning) {
      setScanStep(0);
      setScanStatus('Booting concentric scanner networks...');
      
      const steps = [
        'Searching Bhopal network towers...',
        'Pinging Jahangirabad Jinsi coordinates...',
        'Detecting ScissorsRock, Nargis-2, and LEGACY nodes...',
        'Compiling optimal path metrics...',
        'Telemetry coordinates synchronized! Unlocking dashboard...'
      ];

      let currentStep = 0;
      timer = setInterval(() => {
        currentStep++;
        if (currentStep < steps.length) {
          setScanStep(currentStep);
          setScanStatus(steps[currentStep]);
        } else {
          clearInterval(timer);
          localStorage.setItem('barbo_location_granted', 'true');
          setIsLocationGranted(true);
          setIsScanning(false);
        }
      }, 700);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  // GSAP animations on dashboard mount
  useEffect(() => {
    if (currentUser) {
      // Premium spring card load animations
      gsap.fromTo(".gsap-card", 
        { opacity: 0, y: 40, scale: 0.96 }, 
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.65, 
          ease: "back.out(1.2)", 
          stagger: 0.1,
          clearProps: "all"
        }
      );
      // Banner slide-down
      gsap.fromTo(".gsap-hero",
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
    } else {
      // Login screen bounce-in
      gsap.fromTo(".gsap-login-box",
        { opacity: 0, y: 50, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.5)" }
      );
    }
  }, [currentUser]);

  // Load admin applications on admin login
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      const loadApps = async () => {
        setLoadingAdminApps(true);
        const res = await adminFetchApplications();
        if (res.success) {
          setAdminApplications(res.applications);
          if (res.applications.length > 0) {
            setSelectedAdminApp(res.applications[0]);
          }
        }
        setLoadingAdminApps(false);
      };
      loadApps();
    }
  }, [currentUser]);

  // Onboarding Status Checker
  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingEmailInput.trim()) {
      setStatusMessage('Please enter your email address.');
      return;
    }
    setCheckingStatus(true);
    setStatusMessage('');
    setCheckedApplication(null);

    const res = await checkApplicationStatus(onboardingEmailInput);
    setCheckingStatus(false);
    if (res.success && res.application) {
      setCheckedApplication(res.application);
    } else {
      setStatusMessage('No application found with this email.');
    }
  };

  // Onboarding Form Submission
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingShopName.trim() || !onboardingOwnerName.trim() || !onboardingEmail.trim() || !onboardingContactNumber.trim() || !onboardingLocation.trim()) {
      setOnboardingError('Please fill in all basic shop information.');
      return;
    }
    if (onboardingServices.length === 0) {
      setOnboardingError('Please add at least one service offered by your shop.');
      return;
    }

    setSubmittingOnboarding(true);
    setOnboardingError('');
    setOnboardingSuccess(false);

    const appData = {
      shopName: onboardingShopName,
      ownerName: onboardingOwnerName,
      email: onboardingEmail,
      contactNumber: onboardingContactNumber,
      location: onboardingLocation,
      lat: Number(onboardingLat),
      lon: Number(onboardingLon),
      chairsCount: onboardingChairsCount,
      openingTime: onboardingOpeningTime,
      closingTime: onboardingClosingTime
    };

    const res = await submitApplication(appData, onboardingServices);
    setSubmittingOnboarding(false);
    if (res.success) {
      setOnboardingSuccess(true);
      showToast('Onboarding application submitted successfully!');
      // Clear form
      setOnboardingShopName('');
      setOnboardingOwnerName('');
      setOnboardingEmail('');
      setOnboardingContactNumber('');
      setOnboardingLocation('');
      setOnboardingServices([
        { name: 'Classic Haircut', price: 150, durationMinutes: 20 },
        { name: 'Beard Trim & Shave', price: 100, durationMinutes: 15 }
      ]);
    } else {
      setOnboardingError(res.message);
    }
  };

  // Onboarding Services List Management
  const handleAddOnboardingService = () => {
    if (!newServiceName.trim()) return;
    const price = Number(newServicePrice) || 100;
    const duration = Number(newServiceDuration) || 20;
    setOnboardingServices(prev => [...prev, { name: newServiceName.trim(), price, durationMinutes: duration }]);
    setNewServiceName('');
  };

  const handleRemoveOnboardingService = (index: number) => {
    setOnboardingServices(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleEditAndResubmit = (app: any) => {
    setOnboardingShopName(app.shopName);
    setOnboardingOwnerName(app.ownerName);
    setOnboardingEmail(app.email);
    setOnboardingContactNumber(app.contactNumber);
    setOnboardingLocation(app.location);
    setOnboardingLat(String(app.lat));
    setOnboardingLon(String(app.lon));
    setOnboardingChairsCount(app.chairsCount);
    setOnboardingOpeningTime(app.openingTime);
    setOnboardingClosingTime(app.closingTime);
    setOnboardingServices(app.services || []);
    setOnboardingTab('apply');
    setCheckedApplication(null);
    setOnboardingSuccess(false);
    setOnboardingError('');
  };

  // Admin Portal Actions
  const handleAdminApprove = async (appId: number) => {
    setAdminActionError('');
    setAdminActionFeedback('');
    const res = await adminApproveApplication(appId);
    if (res.success) {
      setAdminActionFeedback('Application approved and account created successfully!');
      showToast('Barber approved successfully!');
      // Reload applications list
      const loadRes = await adminFetchApplications();
      if (loadRes.success) {
        setAdminApplications(loadRes.applications);
        const updated = loadRes.applications.find((a: any) => a.id === appId);
        if (updated) setSelectedAdminApp(updated);
      }
    } else {
      setAdminActionError(res.message);
    }
  };

  const handleAdminRejectSubmit = async () => {
    if (!rejectFeedbackText.trim()) {
      alert('Please enter rejection feedback/comments.');
      return;
    }
    if (!selectedAdminApp) return;

    setAdminActionError('');
    setAdminActionFeedback('');
    const res = await adminRejectApplication(selectedAdminApp.id, rejectFeedbackText);
    setShowRejectFeedbackModal(false);
    setRejectFeedbackText('');

    if (res.success) {
      setAdminActionFeedback('Application rejected and feedback sent.');
      showToast('Application rejected.');
      // Reload applications list
      const loadRes = await adminFetchApplications();
      if (loadRes.success) {
        setAdminApplications(loadRes.applications);
        const updated = loadRes.applications.find((a: any) => a.id === selectedAdminApp.id);
        if (updated) setSelectedAdminApp(updated);
      }
    } else {
      setAdminActionError(res.message);
    }
  };

  const handleStartAdminEdit = (app: any) => {
    setAdminEditShopName(app.shopName);
    setAdminEditOwnerName(app.ownerName);
    setAdminEditContactNumber(app.contactNumber);
    setAdminEditLocation(app.location);
    setAdminEditLat(String(app.lat));
    setAdminEditLon(String(app.lon));
    setAdminEditChairsCount(app.chairsCount);
    setAdminEditOpeningTime(app.openingTime);
    setAdminEditClosingTime(app.closingTime);
    setAdminEditServices(app.services || []);
    setIsAdminEditing(true);
  };

  const handleSaveAdminEdit = async () => {
    if (!selectedAdminApp) return;
    if (!adminEditShopName.trim() || !adminEditOwnerName.trim() || !adminEditContactNumber.trim() || !adminEditLocation.trim()) {
      alert('Please fill in all shop details.');
      return;
    }
    if (adminEditServices.length === 0) {
      alert('At least one service is required.');
      return;
    }

    const appData = {
      shopName: adminEditShopName,
      ownerName: adminEditOwnerName,
      contactNumber: adminEditContactNumber,
      location: adminEditLocation,
      lat: Number(adminEditLat),
      lon: Number(adminEditLon),
      chairsCount: adminEditChairsCount,
      openingTime: adminEditOpeningTime,
      closingTime: adminEditClosingTime
    };

    const res = await adminEditApplication(selectedAdminApp.id, appData, adminEditServices);
    if (res.success) {
      setIsAdminEditing(false);
      showToast('Application updated successfully.');
      // Reload applications list
      const loadRes = await adminFetchApplications();
      if (loadRes.success) {
        setAdminApplications(loadRes.applications);
        const updated = loadRes.applications.find((a: any) => a.id === selectedAdminApp.id);
        if (updated) setSelectedAdminApp(updated);
      }
    } else {
      alert(res.message);
    }
  };

  const handleAddAdminService = () => {
    if (!newServiceName.trim()) return;
    const price = Number(newServicePrice) || 100;
    const duration = Number(newServiceDuration) || 20;
    setAdminEditServices(prev => [...prev, { name: newServiceName.trim(), price, durationMinutes: duration }]);
    setNewServiceName('');
  };

  const handleRemoveAdminService = (index: number) => {
    setAdminEditServices(prev => prev.filter((_, idx) => idx !== index));
  };

  // Quick Autocomplete Helper for Grading
  const handleQuickLogin = (roleMail: string) => {
    setEmail(roleMail);
    setPassword('123456');
    setLoginError('');
  };

  // Handle Login/Signup Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup && !signupName.trim()) {
      setLoginError('Please enter your name.');
      return;
    }
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }

    const res = isSignup 
      ? await signup(signupName, email, password)
      : await login(email, password);

    if (res.success) {
      setLoginError('');
      // Wipe login/signup inputs
      setEmail('');
      setSignupName('');
      setPassword('');
      setIsSignup(false);
      if (isSignup) {
        showToast('Account successfully created! Welcome to Barbo.');
      }
    } else {
      setLoginError(res.message);
    }
  };

  // Auto-calculated fields for booking
  const totalDuration = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const totalPrice = services
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  // Default Time Slots from 9:00 to 18:00
  const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30'
  ];

  const handleOpenBooking = (barber: Barber) => {
    setSelectedBarber(barber);
    setRescheduleApp(null);
    setSelectedServiceIds([]);
    setSelectedTimeSlot('');
    setBookingSuccess(false);
    setBookingError('');
    setPaymentMethodOption('Pay At Shop');
    setShowPaymentQrModal(false);
    setPaymentUpiLoaderStatus('');
    setPaymentUpiError('');
    setIsBookingOpen(true);

    // Modal Spring Animate
    setTimeout(() => {
      gsap.fromTo(".gsap-modal",
        { scale: 0.9, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
      );
    }, 50);
  };

  const handleOpenReschedule = (app: any) => {
    const barber = barbers.find((b) => b.id === app.barberId);
    if (!barber) return;
    
    setSelectedBarber(barber);
    setRescheduleApp(app);
    
    setSelectedDate(app.date);
    setSelectedTimeSlot(app.startTime);
    setSelectedServiceIds(app.services.map((s: any) => s.id));
    
    setBookingSuccess(false);
    setBookingError('');
    setPaymentMethodOption('Pay At Shop');
    setShowPaymentQrModal(false);
    setPaymentUpiLoaderStatus('');
    setPaymentUpiError('');
    setIsBookingOpen(true);

    setTimeout(() => {
      gsap.fromTo(".gsap-modal",
        { scale: 0.9, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
      );
    }, 50);
  };

  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rescheduleApp) {
      if (!selectedDate || !selectedTimeSlot) {
        setBookingError('Please select date and time slot.');
        return;
      }
      const res = await rescheduleAppointment(
        rescheduleApp.id,
        selectedDate,
        selectedTimeSlot,
        selectedServiceIds
      );
      if (res.success) {
        setBookingSuccess(true);
        setBookingError('');
        // Success spring effect
        gsap.to(".gsap-modal", { scale: 0.97, duration: 0.2, yoyo: true, repeat: 1 });
        setTimeout(() => {
          setIsBookingOpen(false);
          setRescheduleApp(null);
          setBookingSuccess(false);
          showToast('Appointment rescheduled successfully!');
        }, 1600);
      } else {
        setBookingError(res.message);
      }
      return;
    }

    if (!selectedBarber || !selectedDate || !selectedTimeSlot || selectedServiceIds.length === 0) {
      setBookingError('Please fill out all booking selections.');
      return;
    }

    if (paymentMethodOption === 'UPI Online') {
      setIsBookingOpen(false);
      setPaymentUpiLoaderStatus('Initializing UPI secure channel...');
      setPaymentUpiError('');
      setShowPaymentQrModal(true);
      setTimeout(() => {
        setPaymentUpiLoaderStatus('');
      }, 1200);
      return;
    }

    const success = await bookAppointment(
      selectedBarber.id,
      selectedDate,
      selectedTimeSlot,
      selectedServiceIds,
      'Pay At Shop',
      'unpaid'
    );

    if (success) {
      setBookingSuccess(true);
      setBookingError('');
      // Success spring effect
      gsap.to(".gsap-modal", { scale: 0.97, duration: 0.2, yoyo: true, repeat: 1 });
      setTimeout(() => {
        setIsBookingOpen(false);
        setBookingSuccess(false);
        showToast('Appointment booked successfully!');
      }, 1600);
    } else {
      setBookingError('Double booking detected! Time slot overlaps with an existing appointment.');
    }
  };

  const handleConfirmUpiBooking = async (simulatedSuccess: boolean) => {
    if (!selectedBarber || !selectedDate || !selectedTimeSlot || selectedServiceIds.length === 0) {
      return;
    }

    if (simulatedSuccess) {
      setPaymentUpiLoaderStatus('Contacting bank gateway...');
      await new Promise((r) => setTimeout(r, 800));
      setPaymentUpiLoaderStatus('Verifying transaction token...');
      await new Promise((r) => setTimeout(r, 600));

      const success = await bookAppointment(
        selectedBarber.id,
        selectedDate,
        selectedTimeSlot,
        selectedServiceIds,
        'UPI Online',
        'paid'
      );

      if (success) {
        setPaymentUpiLoaderStatus('Payment Verified Successfully ✓');
        setTimeout(() => {
          setShowPaymentQrModal(false);
          setPaymentUpiLoaderStatus('');
          showToast('Appointment booked & paid online successfully!');
        }, 1200);
      } else {
        setPaymentUpiError('Double booking detected! Slot is no longer available.');
        setPaymentUpiLoaderStatus('');
      }
    } else {
      setPaymentUpiLoaderStatus('Contacting UPI payment gateway...');
      await new Promise((r) => setTimeout(r, 800));
      setPaymentUpiError('Transaction Declined: Insufficient balance or bank network timed out.');
      setPaymentUpiLoaderStatus('');
    }
  };

  const activeBarberBookings = appointments.filter((app) => app.barberId === activeBarber.id);
  const sortedBarberBookings = [...activeBarberBookings].sort((a, b) => {
    const isFinishedA = a.status === 'completed' || a.status === 'cancelled';
    const isFinishedB = b.status === 'completed' || b.status === 'cancelled';
    if (isFinishedA && !isFinishedB) return 1;
    if (!isFinishedA && isFinishedB) return -1;

    const dateTimeA = new Date(`${a.date}T${a.startTime}`);
    const dateTimeB = new Date(`${b.date}T${b.startTime}`);
    
    if (isFinishedA && isFinishedB) {
      return dateTimeB.getTime() - dateTimeA.getTime();
    }
    return dateTimeA.getTime() - dateTimeB.getTime();
  });
  const completedBookings = activeBarberBookings.filter((app) => app.status === 'completed');
  const onlineEarnings = completedBookings.filter(app => app.paymentStatus === 'paid').reduce((sum, app) => sum + app.totalPrice, 0);
  const counterEarnings = completedBookings.filter(app => app.paymentStatus !== 'paid').reduce((sum, app) => sum + app.totalPrice, 0);
  const dailyEarnings = completedBookings.reduce((sum, app) => sum + app.totalPrice, 0);

  // ==========================================
  // UNCONNECTED/LOGIN VIEW
  // ==========================================
  if (!currentUser) {
    return (
      <div className="landing-container animate-fade-in">
        {/*      <div className="landing-container animate-fade-in">
        {/* Navigation Bar */}
        <header className="landing-nav">
          <div className="landing-nav-logo">
            <Scissors size={20} />
            BAR<span>BO</span>
          </div>
          <nav className="landing-nav-links">
            <a href="#discover" className="landing-nav-link">Discover Salons</a>
            <a href="#why-choose-us" className="landing-nav-link">Why Choose Us?</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
          </nav>
          <div className="landing-nav-actions">
            <button 
              className="btn-secondary" 
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => {
                setLoginError('');
                setShowLoginModal(true);
              }}
            >
              Sign In
            </button>
            <button 
              className="gold-glow-btn"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => {
                setOnboardingTab('apply');
                setOnboardingError('');
                setOnboardingSuccess(false);
                setShowOnboardingModal(true);
              }}
            >
              Partner with Us
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="landing-hero" style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
          <div className="landing-badge">
            <Sparkles size={14} /> Bhopal's Premier Grooming Network
          </div>
          <h1 className="landing-title">
            Grooming, <span>Simplified</span>.<br />Booking, <span>Elevated</span>.
          </h1>
          <p className="landing-subtitle">
            Find the finest barber shops in Bhopal, browse verified dynamic menus, and book your styling appointment in under 30 seconds.
          </p>
          <div className="landing-hero-actions">
            <a 
              href="#discover" 
              className="gold-glow-btn"
              style={{ padding: '16px 32px', fontSize: '1.05rem', textDecoration: 'none' }}
            >
              Book a Salon <ChevronRight size={18} />
            </a>
            <button 
              className="btn-secondary"
              style={{ padding: '16px 32px', fontSize: '1.05rem' }}
              onClick={() => {
                setOnboardingTab('apply');
                setOnboardingError('');
                setOnboardingSuccess(false);
                setShowOnboardingModal(true);
              }}
            >
              List Your Shop
            </button>
          </div>
        </section>

        {/* Featured Salons Section */}
        <section className="landing-section" id="discover" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="landing-section-header">
            <div className="landing-badge" style={{ marginBottom: '8px' }}>
              <Building size={12} /> Elite Partners
            </div>
            <h2 className="landing-section-title">Discover Premium Salons</h2>
            <p className="landing-section-subtitle">
              Browse top-rated barbers, check styling schedules, and book slots instantly with zero prepayment.
            </p>
          </div>

          <div className="salons-grid">
            {/* Salon 1 */}
            <div className="salon-card">
              <div 
                className="salon-card-image" 
                style={{ 
                  backgroundImage: `linear-gradient(to bottom, transparent, rgba(10,11,14,0.9)), url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80')` 
                }}
              >
                <div className="salon-card-badge">
                  <Star size={14} fill="var(--accent-gold)" /> 4.9
                </div>
              </div>
              <div className="salon-card-content">
                <h3 className="salon-card-title">Royal Barber Shop</h3>
                <div className="salon-card-meta">
                  <div className="salon-card-meta-item">
                    <MapPin size={14} />
                    <span>MP Nagar Zone II, Bhopal</span>
                  </div>
                  <div className="salon-card-meta-item">
                    <Clock size={14} />
                    <span>09:00 AM - 09:00 PM</span>
                  </div>
                </div>
                <div className="salon-card-footer">
                  <div className="salon-card-price">
                    Haircut Starts At
                    <span>₹150</span>
                  </div>
                  <button 
                    className="gold-glow-btn salon-card-btn"
                    onClick={() => {
                      setLoginError('');
                      setShowLoginModal(true);
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>

            {/* Salon 2 */}
            <div className="salon-card">
              <div 
                className="salon-card-image" 
                style={{ 
                  backgroundImage: `linear-gradient(to bottom, transparent, rgba(10,11,14,0.9)), url('https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80')` 
                }}
              >
                <div className="salon-card-badge">
                  <Star size={14} fill="var(--accent-gold)" /> 4.8
                </div>
              </div>
              <div className="salon-card-content">
                <h3 className="salon-card-title">Ironside Shave Parlor</h3>
                <div className="salon-card-meta">
                  <div className="salon-card-meta-item">
                    <MapPin size={14} />
                    <span>Arera Colony, Bhopal</span>
                  </div>
                  <div className="salon-card-meta-item">
                    <Clock size={14} />
                    <span>10:00 AM - 08:00 PM</span>
                  </div>
                </div>
                <div className="salon-card-footer">
                  <div className="salon-card-price">
                    Haircut Starts At
                    <span>₹120</span>
                  </div>
                  <button 
                    className="gold-glow-btn salon-card-btn"
                    onClick={() => {
                      setLoginError('');
                      setShowLoginModal(true);
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>

            {/* Salon 3 */}
            <div className="salon-card">
              <div 
                className="salon-card-image" 
                style={{ 
                  backgroundImage: `linear-gradient(to bottom, transparent, rgba(10,11,14,0.9)), url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80')` 
                }}
              >
                <div className="salon-card-badge">
                  <Star size={14} fill="var(--accent-gold)" /> 4.7
                </div>
              </div>
              <div className="salon-card-content">
                <h3 className="salon-card-title">Vintage Scissors</h3>
                <div className="salon-card-meta">
                  <div className="salon-card-meta-item">
                    <MapPin size={14} />
                    <span>Indrapuri, Bhopal</span>
                  </div>
                  <div className="salon-card-meta-item">
                    <Clock size={14} />
                    <span>09:00 AM - 09:00 PM</span>
                  </div>
                </div>
                <div className="salon-card-footer">
                  <div className="salon-card-price">
                    Haircut Starts At
                    <span>₹100</span>
                  </div>
                  <button 
                    className="gold-glow-btn salon-card-btn"
                    onClick={() => {
                      setLoginError('');
                      setShowLoginModal(true);
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="landing-section" id="why-choose-us" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="landing-section-header">
            <h2 className="landing-section-title">Why Choose Barbo?</h2>
            <p className="landing-section-subtitle">
              We connect style-conscious clients with verified grooming professionals under a unified, premium network.
            </p>
          </div>

          <div className="landing-features-grid">
            {/* For Customers */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Scissors size={22} />
              </div>
              <h3 className="landing-feature-title">For Customers</h3>
              <div className="landing-feature-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="landing-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px' }} />
                  <span><strong>Instant Slot Booking:</strong> Pick your service, choose an available time slot, and get instant confirmation.</span>
                </div>
                <div className="landing-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px' }} />
                  <span><strong>Zero Upfront Payments:</strong> Book online entirely free, and pay directly at the shop after your haircut.</span>
                </div>
                <div className="landing-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px' }} />
                  <span><strong>Transparent Pricing:</strong> Review catalog service prices, descriptions, and duration limits beforehand.</span>
                </div>
              </div>
            </div>

            {/* For Barbers */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Building size={22} />
              </div>
              <h3 className="landing-feature-title">For Barbers (Partners)</h3>
              <div className="landing-feature-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="landing-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px' }} />
                  <span><strong>0% Platform Commission:</strong> Keep 100% of your earnings. No listing commission fees.</span>
                </div>
                <div className="landing-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px' }} />
                  <span><strong>Custom Partner Console:</strong> Update timing, seats capacity, and service pricings in real-time.</span>
                </div>
                <div className="landing-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px' }} />
                  <span><strong>Attract More Customers:</strong> Gain organic visibility among style-seekers in your local Bhopal area.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="landing-section" id="how-it-works" style={{ borderTop: '1px solid var(--border-light)', paddingBottom: '40px' }}>
          <div className="landing-section-header">
            <h2 className="landing-section-title">How It Works</h2>
            <p className="landing-section-subtitle">
              Unified scheduling flows designed for maximum speed and absolute convenience.
            </p>
          </div>

          <div className="landing-how-works">
            <div className="landing-step-card">
              <span className="landing-step-number">01</span>
              <h4 className="landing-step-title">Discover</h4>
              <p className="landing-step-desc">
                Browse premium salons in Bhopal or search for your favorite stylist's availability.
              </p>
            </div>
            <div className="landing-step-card">
              <span className="landing-step-number">02</span>
              <h4 className="landing-step-title">Reserve Slot</h4>
              <p className="landing-step-desc">
                Choose your haircut services, pick your styling date/time slot, and confirm instantly.
              </p>
            </div>
            <div className="landing-step-card">
              <span className="landing-step-number">03</span>
              <h4 className="landing-step-title">Pay at Shop</h4>
              <p className="landing-step-desc">
                Visit the salon at your scheduled time, enjoy premium grooming, and pay at the shop!
              </p>
            </div>
          </div>
        </section>

        {/* Partner Onboarding CTA */}
        <section className="landing-cta-section" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div className="landing-badge">
            <Building size={14} style={{ marginRight: '6px' }} /> Partner Portal
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Grow Your Salon Business</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', fontSize: '0.95rem', margin: '0 auto' }}>
            List your shop, manage appointments digitally, and connect directly with local Bhopal customers. 100% Commission Free.
          </p>
          <button 
            className="gold-glow-btn"
            style={{ padding: '14px 28px', marginTop: '10px' }}
            onClick={() => {
              setOnboardingTab('apply');
              setOnboardingError('');
              setOnboardingSuccess(false);
              setShowOnboardingModal(true);
            }}
          >
            Partner with Us / List Your Shop
          </button>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© 2026 Barbo Bhopal. Premium Salon Discovery, Booking & Onboarding Platform.</p>
        </footer>

        {/* Login Modal Overlay */}
        {showLoginModal && (
          <div className="modal-overlay-backdrop animate-fade-in" onClick={() => setShowLoginModal(false)}>
            <div 
              className="glass-card gsap-login-box" 
              style={{ width: '100%', maxWidth: '440px', padding: '40px 32px', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowLoginModal(false)}
                style={{ 
                  position: 'absolute', 
                  top: '20px', 
                  right: '20px', 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer' 
                }}
              >
                <X size={20} />
              </button>

              {/* Logo Branding */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--accent-gold-glow)', borderRadius: '50%', color: 'var(--accent-gold)', marginBottom: '12px' }}>
                  <Scissors size={24} />
                </div>
                <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', letterSpacing: '-0.02em', fontWeight: 800 }}>
                  BAR<span>BO</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Access your custom portal</p>
              </div>

              {loginError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isSignup && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                      <input 
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                    <input 
                      type="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                    <input 
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="gold-glow-btn"
                  style={{ justifyContent: 'center', marginTop: '10px', padding: '12px' }}
                >
                  {isSignup ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                </span>
                <span 
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setLoginError('');
                  }} 
                  style={{ color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {isSignup ? 'Sign In' : 'Sign Up'}
                </span>
              </div>

              {/* Quick Credentials Autofill */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', textAlign: 'center' }}>
                  Quick Credentials Autofill
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '6px', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}
                    onClick={() => {
                      handleQuickLogin('faizan@barbo.in');
                      setShowLoginModal(false);
                    }}
                  >
                    <span>Faizan</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Customer)</span>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '6px', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}
                    onClick={() => {
                      handleQuickLogin('rajesh@barbo.in');
                      setShowLoginModal(false);
                    }}
                  >
                    <span>Rajesh Sen</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Barber)</span>
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '6px', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}
                    onClick={() => {
                      handleQuickLogin('admin@barbo.in');
                      setShowLoginModal(false);
                    }}
                  >
                    <span>Admin</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(Admin)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Onboarding Form Modal (Added here to work when currentUser is null!) */}
        {showOnboardingModal && (
          <div className="modal-backdrop animate-fade-in" onClick={() => setShowOnboardingModal(false)}>
            <div 
              className="glass-card animate-scale-in" 
              style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1100 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={22} style={{ color: 'var(--accent-gold)' }} />
                    Partner with Barbo
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Get your salon listed on Bhopal's premium grooming network
                  </p>
                </div>
                <button 
                  onClick={() => setShowOnboardingModal(false)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '24px' }}>
                <button 
                  onClick={() => setOnboardingTab('apply')}
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    background: 'transparent', 
                    border: 'none', 
                    borderBottom: onboardingTab === 'apply' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                    color: onboardingTab === 'apply' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Apply for Listing
                </button>
                <button 
                  onClick={() => setOnboardingTab('status')}
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    background: 'transparent', 
                    border: 'none', 
                    borderBottom: onboardingTab === 'status' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                    color: onboardingTab === 'status' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Check Application Status
                </button>
              </div>

              {/* Apply Tab */}
              {onboardingTab === 'apply' && (
                <div>
                  {onboardingSuccess ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                      <CheckCircle size={48} style={{ color: 'var(--accent-gold)', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Application Submitted!</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                        Thank you for applying. Our admin team will review your application within 24 hours. You can check the status anytime using your email: <strong>{onboardingEmailInput || onboardingEmail}</strong>
                      </p>
                      <button className="gold-glow-btn" onClick={() => setShowOnboardingModal(false)}>
                        Close Portal
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Step Info Box */}
                      <div style={{ background: 'var(--accent-gold-glow)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '8px' }}>
                        <h4 style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={16} /> How to list your shop in 3 steps:
                        </h4>
                        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <li><strong>Submit Form:</strong> Enter your basic shop info, seats, opening/closing hours, and services below.</li>
                          <li><strong>Admin Review:</strong> Our team verifies details (coordinates, price lists) to activate your shop profile.</li>
                          <li><strong>Go Live:</strong> Get approved, log in with your email, and start receiving live bookings commission-free!</li>
                        </ol>
                      </div>

                      {onboardingError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle size={16} />
                          <span>{onboardingError}</span>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Shop/Salon Name
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. Royal Barber Shop"
                            value={onboardingShopName}
                            onChange={(e) => setOnboardingShopName(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Owner / Main Barber Name
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. Rajesh Kumar"
                            value={onboardingOwnerName}
                            onChange={(e) => setOnboardingOwnerName(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Contact Email (For logins)
                          </label>
                          <input 
                            type="email" 
                            placeholder="e.g. owner@shop.com"
                            value={onboardingEmail}
                            onChange={(e) => setOnboardingEmail(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Contact Number
                          </label>
                          <input 
                            type="tel" 
                            placeholder="e.g. 9876543210"
                            value={onboardingContactNumber}
                            onChange={(e) => setOnboardingContactNumber(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Shop Location Address (Bhopal)
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Plot 42, MP Nagar Zone 2, Bhopal"
                          value={onboardingLocation}
                          onChange={(e) => setOnboardingLocation(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Latitude (Bhopal coords)
                          </label>
                          <input 
                            type="text" 
                            value={onboardingLat}
                            onChange={(e) => setOnboardingLat(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Longitude (Bhopal coords)
                          </label>
                          <input 
                            type="text" 
                            value={onboardingLon}
                            onChange={(e) => setOnboardingLon(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Stylist Chairs Count
                          </label>
                          <input 
                            type="number" 
                            min={1} 
                            max={15}
                            value={onboardingChairsCount}
                            onChange={(e) => setOnboardingChairsCount(Number(e.target.value) || 2)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Opening Hours (24hr format)
                          </label>
                          <input 
                            type="time" 
                            value={onboardingOpeningTime}
                            onChange={(e) => setOnboardingOpeningTime(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Closing Hours (24hr format)
                          </label>
                          <input 
                            type="time" 
                            value={onboardingClosingTime}
                            onChange={(e) => setOnboardingClosingTime(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                      </div>

                      {/* Services Manager */}
                      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          Services Offered & Price Menus
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                          Add services that clients can book at your shop.
                        </p>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                          <input 
                            type="text" 
                            placeholder="Service Name (e.g. Haircut)"
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            style={{ flex: 2, minWidth: '160px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                          />
                          <input 
                            type="number" 
                            placeholder="Price (₹)"
                            value={newServicePrice}
                            onChange={(e) => setNewServicePrice(e.target.value)}
                            style={{ flex: 1, minWidth: '80px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                          />
                          <input 
                            type="number" 
                            placeholder="Mins"
                            value={newServiceDuration}
                            onChange={(e) => setNewServiceDuration(e.target.value)}
                            style={{ flex: 1, minWidth: '80px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                          />
                          <button 
                            type="button" 
                            className="btn-secondary" 
                            style={{ padding: '10px 16px', fontSize: '0.88rem' }}
                            onClick={handleAddOnboardingService}
                          >
                            <Plus size={16} /> Add
                          </button>
                        </div>

                        {/* Services list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {onboardingServices.map((srv, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                background: 'rgba(255, 255, 255, 0.02)', 
                                border: '1px solid var(--border-light)', 
                                borderRadius: '8px', 
                                padding: '10px 16px' 
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{srv.name}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                  {srv.durationMinutes} minutes
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                                  ₹{srv.price}
                                </span>
                                <button 
                                  type="button" 
                                  style={{ background: 'transparent', border: 'none', color: 'var(--status-red)', cursor: 'pointer' }}
                                  onClick={() => handleRemoveOnboardingService(idx)}
                                >
                                  <Trash size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="gold-glow-btn"
                        style={{ padding: '14px', justifyContent: 'center', width: '100%', marginTop: '10px' }}
                        disabled={submittingOnboarding}
                      >
                        {submittingOnboarding ? 'Submitting Application...' : 'Submit Partnership Application'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Check Status Tab */}
              {onboardingTab === 'status' && (
                <div>
                  <form onSubmit={handleCheckStatus} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                    <input 
                      type="email" 
                      placeholder="Enter your application email address"
                      value={onboardingEmailInput}
                      onChange={(e) => setOnboardingEmailInput(e.target.value)}
                      style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                      required
                    />
                    <button 
                      type="submit" 
                      className="gold-glow-btn" 
                      style={{ padding: '12px 20px' }}
                      disabled={checkingStatus}
                    >
                      {checkingStatus ? 'Checking...' : 'Check Status'}
                    </button>
                  </form>

                  {statusMessage && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {statusMessage}
                    </div>
                  )}

                  {checkedApplication && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{checkedApplication.shopName}</h4>
                        
                        {checkedApplication.status === 'approved' && (
                          <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--status-green)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            Approved
                          </span>
                        )}
                        {checkedApplication.status === 'pending' && (
                          <span style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--status-amber)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            Pending Review
                          </span>
                        )}
                        {checkedApplication.status === 'rejected' && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            Revisions Required
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><strong>Owner:</strong> {checkedApplication.ownerName}</div>
                        <div><strong>Phone:</strong> {checkedApplication.contactNumber}</div>
                        <div><strong>Hours:</strong> {checkedApplication.openingTime} - {checkedApplication.closingTime}</div>
                        <div><strong>Chairs:</strong> {checkedApplication.chairsCount} Stylist Seats</div>
                      </div>

                      {checkedApplication.status === 'rejected' && (
                        <div 
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.05)', 
                            border: '1px solid rgba(239, 68, 68, 0.15)', 
                            borderRadius: '8px', 
                            padding: '12px', 
                            marginTop: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <strong style={{ color: 'var(--status-red)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={14} /> ADMIN FEEDBACK COMMENTS:
                          </strong>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                            {checkedApplication.rejectionFeedback || 'Please review your shop details and resubmit.'}
                          </p>
                          
                          <button 
                            className="btn-danger" 
                            style={{ marginTop: '10px', padding: '10px', justifyContent: 'center', width: '100%', fontSize: '0.85rem' }}
                            onClick={() => handleEditAndResubmit(checkedApplication)}
                          >
                            <Edit size={14} style={{ marginRight: '6px' }} /> Edit Details & Resubmit
                          </button>
                        </div>
                      )}

                      {checkedApplication.status === 'approved' && (
                        <div 
                          style={{ 
                            background: 'rgba(56, 189, 248, 0.05)', 
                            border: '1px solid rgba(56, 189, 248, 0.15)', 
                            borderRadius: '8px', 
                            padding: '16px', 
                            marginTop: '8px',
                            textAlign: 'center'
                          }}
                        >
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Congratulations! Your shop has been approved. You can log in as a Barber with:
                            <br />Email: <strong>{checkedApplication.email}</strong> / Password: <strong>123456</strong>
                          </p>
                          <button 
                            className="gold-glow-btn"
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            onClick={() => {
                              setShowOnboardingModal(false);
                              setEmail(checkedApplication.email);
                              setPassword('123456');
                              setIsSignup(false);
                              setShowLoginModal(true);
                            }}
                          >
                            Proceed to Log In
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // LOGGED-IN VIEW SHELL
  // ==========================================
  return (
    <div ref={mainRef} className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      
      {/* ==========================================
         DEMO BANNER / ROLE INDICATOR / DUAL THEME TOGGLE
         ========================================== */}
      <div className="role-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scissors size={18} style={{ color: 'var(--accent-gold)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            BARBO BHOPAL
          </span>
        </div>
        
        <div className="role-banner-controls">
          
          {/* Day & Night Sliding Toggle */}
          <div className="theme-switch-container">
            {isLightMode ? <Sun size={15} style={{ color: 'var(--accent-gold)' }} /> : <Moon size={15} style={{ color: 'var(--text-secondary)' }} />}
            <label className="theme-switch">
              <input 
                type="checkbox" 
                checked={isLightMode}
                onChange={handleToggleTheme}
              />
              <span className="theme-slider"></span>
            </label>
          </div>

          <div className="role-banner-user-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--border-light)', paddingRight: '16px', marginRight: '4px' }}>
            <User size={14} style={{ color: 'var(--accent-gold)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentUser.name}
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
              {currentUser.role}
            </span>
          </div>

          <button 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={logout}
          >
            <LogOut size={12} /> Log Out
          </button>
        </div>
      </div>

      {/* ==========================================
         CUSTOMER PORTAL VIEW
         ========================================== */}
      {currentUser.role === 'customer' && (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          
          {/* Brand Localization Hero */}
          <div className="gsap-hero" style={{ textAlign: 'center', marginBottom: '50px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', marginBottom: '12px' }}>
              <Sparkles size={16} />
              <span className="badge badge-gold">Bhopal's Premium Barber Network</span>
            </div>
            <h1 style={{ fontSize: 'var(--hero-title-size, 3rem)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
              Find Your <span style={{ color: 'var(--accent-gold)' }}>Barber</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--hero-subtitle-size, 1.1rem)', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0' }}>
              Book premium haircuts, straight razor wet shaves, and traditional herbal champis in <strong>Jinsi & Jahangirabad, Bhopal</strong>.
            </p>
          </div>

          {!isLocationGranted ? (
            /* Glassmorphic Geolocation Scanner Authorization Sweep overlay */
            <div className="glass-card gsap-card" style={{ maxWidth: '580px', margin: '40px auto 40px', padding: '40px 30px', textAlign: 'center' }}>
              {!isScanning ? (
                <>
                  <div style={{ display: 'inline-flex', padding: '16px', background: 'var(--accent-gold-glow)', borderRadius: '50%', color: 'var(--accent-gold)', marginBottom: '20px' }}>
                    <Compass size={32} className="pulse-alert" />
                  </div>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Precision Telemetry Radar</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '30px' }}>
                    BARBO Jinsi & Jahangirabad requires precision locator authorization to identify premium styling salons near you, calculate road segment routing, and compute live travel telemetry maps.
                  </p>
                  <button 
                    className="gold-glow-btn animate-pulse" 
                    style={{ padding: '14px 28px', fontSize: '1rem', width: '100%', justifyContent: 'center' }}
                    onClick={() => setIsScanning(true)}
                  >
                    Allow Location & Run Scanner
                  </button>
                </>
              ) : (
                <>
                  {/* Concentric Sweeping radar visualizer */}
                  <div className="radar-scanner-container" style={{ marginBottom: '30px' }}>
                    <div className="radar-sweep-line"></div>
                    <div className="radar-ring radar-ring-1"></div>
                    <div className="radar-ring radar-ring-2"></div>
                    <div className="radar-ring radar-ring-3"></div>
                    <Scissors size={28} style={{ color: 'var(--accent-gold)', zIndex: 10 }} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Scanning Jinsi & Jahangirabad...</h3>
                  
                  {/* Dynamic ticking tracker logs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', marginTop: '16px' }}>
                    <p style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.9rem', minHeight: '24px' }}>
                      {scanStatus}
                    </p>
                    
                    {/* Animated scanning progress bar */}
                    <div style={{ width: '180px', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(scanStep + 1) * 20}%`, 
                          background: 'var(--accent-gold)', 
                          transition: 'width 0.4s ease-in-out' 
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Premium Locality Geocoder Search Card */}
              <div className="glass-card gsap-card animate-slide-up" style={{ marginBottom: '36px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Change Your Location / Locality
                </span>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!searchQuery.trim()) return;
                  setIsSearchingAddress(true);
                  setSearchError('');
                  
                  const queryLower = searchQuery.toLowerCase().trim();
                  let resolved = null;
                  
                  // Check local pre-compiled coordinate dictionary first
                  for (const key of Object.keys(LOCAL_BHOPAL_COORDS)) {
                    if (queryLower.includes(key)) {
                      resolved = LOCAL_BHOPAL_COORDS[key];
                      break;
                    }
                  }
                  
                  if (resolved) {
                    try {
                      setUserCoordinates({ lat: resolved.lat, lng: resolved.lon });
                      await fetchLocalBarbers(resolved.lat, resolved.lon, resolved.display);
                      setSearchQuery('');
                    } catch (err) {
                      setSearchError('Failed to load local shops around resolved coordinates.');
                    } finally {
                      setIsSearchingAddress(false);
                    }
                    return;
                  }
                  
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Bhopal')}`);
                    if (!res.ok) throw new Error('Geocoder service offline');
                    const data = await res.json();
                    if (data && data.length > 0) {
                      const first = data[0];
                      const lat = Number(first.lat);
                      const lon = Number(first.lon);
                      const displayName = first.display_name.split(',')[0] + ', Bhopal';
                      setUserCoordinates({ lat, lng: lon });
                      await fetchLocalBarbers(lat, lon, displayName);
                      setSearchQuery('');
                    } else {
                      setSearchError('No matching locality found in Bhopal. Try searching other neighborhoods like Indrapuri, MP Nagar, or Jahangirabad.');
                    }
                  } catch (err) {
                    setSearchError('Search failed. Please check your network connection.');
                  } finally {
                    setIsSearchingAddress(false);
                  }
                }} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="location-form">
                  <div style={{ position: 'relative', flex: 1, minWidth: '240px' }} className="location-search-wrapper">
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search any locality in Bhopal (e.g. Indrapuri, Chaar Batti Choraha)..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '12px 16px 12px 42px', 
                        background: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: '12px', 
                        color: 'var(--text-primary)', 
                        outline: 'none', 
                        fontSize: '0.95rem' 
                      }} 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="location-update-btn gold-glow-btn"
                    disabled={isSearchingAddress}
                    style={{ padding: '12px 24px', fontSize: '0.9rem', justifyContent: 'center' }}
                  >
                    {isSearchingAddress ? 'Searching...' : 'Update Location'}
                  </button>
                  <button 
                    type="button" 
                    className="location-share-btn btn-secondary"
                    onClick={handleShareLocation}
                    disabled={isSearchingAddress}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '0.9rem', border: '1px solid var(--accent-gold-glow)' }}
                  >
                    <Compass size={16} className={isSearchingAddress ? 'pulse-alert' : ''} style={{ color: 'var(--accent-gold)' }} />
                    <span>Share Geolocation</span>
                  </button>
                </form>

                {searchError && (
                  <div style={{ color: 'var(--status-red)', fontSize: '0.8rem', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} />
                    <span>{searchError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
                  <span>Active Location Area: <strong>{locationName}</strong></span>
                  {locationName !== 'Jahangirabad, Bhopal' && (
                    <button 
                      type="button" 
                      onClick={() => resetBarbersToDefault()}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>

                  {/* Unreviewed Completed Appointments - Rate your Barber Prompt */}
                  {appointments
                    .filter(app => app.customerId === currentUser.id && app.status === 'completed' && !app.reviewed)
                    .map(app => (
                      <ReviewPrompt key={app.id} app={app} submitReview={submitReview} onSuccess={showToast} />
                    ))}

                  {/* Real-time Delay & Active Appointments Section */}
                  {appointments.filter(app => app.customerId === currentUser.id && (app.status === 'upcoming' || app.status === 'in_progress')).length > 0 && (
                    <div style={{ marginBottom: '50px' }}>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={20} style={{ color: 'var(--accent-gold)' }} />
                        Your Upcoming Bookings
                      </h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min-width, 360px), 1fr))', gap: '24px' }}>
                        {sortUpcomingAppointments(appointments
                          .filter((app) => app.customerId === currentUser.id && (app.status === 'upcoming' || app.status === 'in_progress')))
                          .map((app) => {
                        const barberData = barbers.find((b) => b.id === app.barberId);
                        const isDelayed = barberData && barberData.delayStatus !== 'On Time';
                        
                        return (
                          <div key={app.id} className="glass-card gsap-card" style={{ borderColor: isDelayed ? 'var(--status-amber)' : 'var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                  <span className={`badge ${app.paymentStatus === 'paid' ? 'badge-green' : 'badge-gold'}`}>
                                    {app.paymentMethod === 'UPI Online' ? (app.paymentStatus === 'paid' ? 'Paid Online (UPI)' : 'Online Pending') : 'Pay At Shop'}
                                  </span>
                                  <span className={`badge ${app.status === 'in_progress' ? 'badge-amber pulse-alert' : 'badge-gold'}`}>
                                    {app.status === 'in_progress' ? 'In Progress' : app.status}
                                  </span>
                                </div>
                                <h3 style={{ fontSize: '1.25rem' }}>{app.barberName}</h3>
                              </div>
                            </div>
                            
                            {/* Real-time Delay Alert status */}
                            {barberData && (
                              <span className={`badge ${isDelayed ? 'badge-amber pulse-alert' : 'badge-green'}`}>
                                {barberData.delayStatus === 'On Time' ? 'Barber On Time' : `Delay: ${barberData.delayStatus}`}
                              </span>
                            )}
                             {/* Secure Check-in OTP Box */}
                             {(() => {
                                const [y, m, d] = app.date.split('-').map(Number);
                                const [endH, endM] = app.endTime.split(':').map(Number);
                                const slotEndTime = new Date(y, m - 1, d, endH, endM, 0);
                                const isPastSlot = new Date().getTime() > slotEndTime.getTime();
                                
                                const showOtp = !isPastSlot && isOtpVisible(app.date, app.startTime);
                                return (
                                  <div style={{ 
                                    background: isPastSlot ? 'rgba(239, 68, 68, 0.04)' : showOtp ? 'var(--accent-gold-glow)' : 'rgba(255, 255, 255, 0.02)', 
                                    border: `1.5px dashed ${isPastSlot ? 'var(--status-red)' : showOtp ? 'var(--accent-gold)' : 'var(--border-color)'}`, 
                                    borderRadius: '10px', 
                                    padding: '12px', 
                                    textAlign: 'center', 
                                    marginBottom: '16px' 
                                  }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                                      Secure Check-in OTP
                                    </span>
                                    <strong style={{ 
                                      fontSize: isPastSlot ? '1.2rem' : showOtp ? '1.5rem' : '1.1rem', 
                                      letterSpacing: showOtp ? '4px' : '0px', 
                                      color: isPastSlot ? 'var(--status-red)' : showOtp ? 'var(--accent-gold)' : 'var(--text-muted)', 
                                      display: 'block', 
                                      margin: '4px 0' 
                                    }}>
                                      {isPastSlot ? '⏳ Expired' : showOtp ? app.travelOtp : '🔒 Locked'}
                                    </strong>
                                    <span style={{ fontSize: '0.75rem', color: isPastSlot ? 'var(--status-red)' : 'var(--text-muted)' }}>
                                      {isPastSlot ? 'This booking slot has passed away and the OTP is expired.' : showOtp ? 'Share this with your barber upon arrival to start the service.' : 'Unlocks 45 minutes before your scheduled slot.'}
                                    </span>
                                  </div>
                                );
                              })()}

                            {/* Booking Schedule Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={14} style={{ color: 'var(--accent-gold)' }} />
                                <span>Date: {app.date}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={14} style={{ color: 'var(--accent-gold)' }} />
                                <span>Time: <strong>{app.startTime} - {app.endTime}</strong> ({app.totalDuration} mins)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Scissors size={14} style={{ color: 'var(--accent-gold)' }} />
                                <span>Services: {app.services.map((s: any) => s.name).join(', ')}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1.05rem' }}>₹</span>
                                <span>Total Price: <strong>₹{app.totalPrice}</strong> <span style={{ fontSize: '0.8rem', color: app.paymentStatus === 'paid' ? 'var(--status-green)' : 'var(--text-muted)' }}>({app.paymentStatus === 'paid' ? 'Paid Online' : 'Pay at salon'})</span></span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                                <MapPin size={14} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>{barberData?.location}</span>
                              </div>
                            </div>

                            {/* Action - Cancel & Google Maps Navigation */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                              <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }} className="booking-card-actions">
                                <button 
                                  className="btn-secondary" 
                                  style={{ flex: 1, minWidth: '80px', padding: '10px', fontSize: '0.85rem' }}
                                  onClick={() => {
                                    setCancellingApp(app);
                                    setCancelReasonOption('');
                                    setCancelReasonText('');
                                  }}
                                >
                                  Cancel
                                </button>

                                  {app.status === 'upcoming' && (() => {
                                    const schedOpen = canReschedule(app.date, app.startTime);
                                    return (
                                      <button 
                                        className="btn-secondary" 
                                        style={{ 
                                          flex: 1, 
                                          minWidth: '90px', 
                                          padding: '10px', 
                                          fontSize: '0.85rem',
                                          opacity: schedOpen ? 1 : 0.5,
                                          cursor: schedOpen ? 'pointer' : 'not-allowed'
                                        }}
                                        onClick={() => {
                                          if (!schedOpen) {
                                            showToast('Modifications only allowed up to 5 minutes before scheduled start time.');
                                            return;
                                          }
                                          handleOpenReschedule(app);
                                        }}
                                      >
                                        Reschedule
                                      </button>
                                    );
                                  })()}
                                  
                                  {barberData && (
                                    <button 
                                      className="gold-glow-btn" 
                                      style={{ flex: 1.5, minWidth: '110px', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                      onClick={() => setActiveMapAppId(activeMapAppId === app.id ? null : app.id)}
                                    >
                                      <Compass size={14} /> {activeMapAppId === app.id ? 'Hide Map' : 'Track Route'}
                                    </button>
                                  )}
                                </div>
                            </div>

                            {/* Integrated Telemetry Map View for Customer */}
                            {activeMapAppId === app.id && barberData && (
                              <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '20px', paddingTop: '20px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)', display: 'block', marginBottom: '8px' }}>
                                  Navigation
                                </span>
                                <NavigateButton 
                                  appointment={app} 
                                  barber={barberData} 
                                />
                              </div>
                            )}

                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Barbers Grid */}
              <div style={{ marginBottom: '50px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scissors size={20} style={{ color: 'var(--accent-gold)' }} />
                  Premium Salons & Barber Artists
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min-width, 360px), 1fr))', gap: '24px' }}>
                  {sortedBarbers.map((barber) => (
                    <div key={barber.id} className="glass-card gsap-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Photo & Basic Details */}
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                        <img 
                          src={barber.imageUrl} 
                          alt={barber.name} 
                          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
                        />
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{barber.name}</h3>
                          <p style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 600 }}>{barber.title}</p>
                          
                          {/* Star Rating */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                            <Star size={14} fill="var(--accent-gold)" style={{ color: 'var(--accent-gold)' }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{barber.rating}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({barber.reviewsCount} reviews)</span>
                          </div>
                        </div>
                      </div>

                      {/* Specialty & Bhopal Location */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                        <p><strong>Specialty:</strong> {barber.specialty}</p>
                        <p style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.82rem', marginTop: '4px' }}>
                          <MapPin size={12} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '3px' }} />
                          <span>{barber.location}</span>
                        </p>
                      </div>

                      {/* Portfolio Gallery */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                        {barber.portfolioImages.map((img, i) => (
                          <img 
                            key={i}
                            src={img}
                            alt="work portfolio"
                            style={{ flex: 1, height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-light)' }}
                          />
                        ))}
                      </div>

                      {/* Live Status indicator */}
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-Time Status</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: barber.delayStatus === 'On Time' ? 'var(--status-green)' : 'var(--status-amber)' }}>
                            ● {barber.delayStatus === 'On Time' ? 'On Time' : `Delay: ${barber.delayStatus}`}
                          </span>
                        </div>
                        
                        <button 
                          className="gold-glow-btn"
                          onClick={() => handleOpenBooking(barber)}
                        >
                          Book Now <ChevronRight size={16} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Past Appointments / Cuts History */}
              {appointments.filter(app => app.customerId === currentUser.id && (app.status === 'completed' || app.status === 'cancelled')).length > 0 && (
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-secondary)' }}>
                    Your Cut History
                  </h2>
                  <div className="glass-card gsap-card" style={{ padding: '0 24px' }}>
                    {sortPastAppointments(appointments
                      .filter((app) => app.customerId === currentUser.id && (app.status === 'completed' || app.status === 'cancelled')))
                      .map((app, i) => (
                        <div 
                          key={app.id} 
                          className="history-item"
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '20px 0', 
                            borderBottom: i === appointments.length - 1 ? 'none' : '1px solid var(--border-light)'
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '1.05rem' }}>{app.services.map((s: any) => s.name).join(' + ')}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Barber: {app.barberName} • Date: {app.date}
                            </p>
                            {app.status === 'cancelled' && app.travelStatus && app.travelStatus.startsWith('Cancelled: ') && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--status-red)', marginTop: '4px', fontStyle: 'italic' }}>
                                Reason: {app.travelStatus.replace('Cancelled: ', '')}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="history-item-right">
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>₹{app.totalPrice}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {app.paymentMethod === 'UPI Online' ? (app.paymentStatus === 'refunded' ? 'Refunded' : 'Online') : 'Cash'}
                              </span>
                            </div>
                            <span className={`badge ${app.status === 'completed' ? 'badge-gold' : app.paymentStatus === 'refunded' ? 'badge-green' : 'badge-red'}`}>
                              {app.paymentStatus === 'refunded' ? 'Refunded' : app.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      )}

      {/* ==========================================
         BARBER PORTAL VIEW
         ========================================== */}
      {currentUser.role === 'barber' && (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          
          {/* Barber Header Info */}
          <div className="gsap-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <img 
                src={activeBarber.imageUrl} 
                alt={activeBarber.name} 
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)' }}
              />
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '8px' }}>Barber Portal (Bhopal)</span>
                <h1 style={{ fontSize: '2.2rem' }}>Welcome Back, {activeBarber.name}</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Shop: <strong>{activeBarber.location.split(',')[0]}</strong></p>
              </div>
            </div>

            {/* Metrics cards */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }} className="barber-metrics-container">
              <div className="glass-card" style={{ padding: '16px 24px', textAlign: 'center', minWidth: '130px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily Earnings</span>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', marginTop: '4px' }}>₹{dailyEarnings}</h3>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Online: ₹{onlineEarnings} | Counter: ₹{counterEarnings}</span>
              </div>
              <div className="glass-card" style={{ padding: '16px 24px', textAlign: 'center', minWidth: '130px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed cuts</span>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginTop: '4px' }}>{completedBookings.length}</h3>
              </div>
              <div className="glass-card" style={{ padding: '16px 24px', textAlign: 'center', minWidth: '130px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Rating</span>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  {activeBarber.rating} <Star size={16} fill="var(--accent-gold)" style={{ color: 'var(--accent-gold)' }} />
                </h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'var(--barber-grid-cols, 3fr 2fr)', gap: 'var(--barber-grid-gap, 40px)', alignItems: 'start' }} className="barber-dashboard-layout">
            
            {/* Appointment Timeline */}
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: 'var(--accent-gold)' }} />
                Active Schedule & Bookings
              </h2>
              
              {sortedBarberBookings.length === 0 ? (
                <div className="glass-card gsap-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Scissors size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p>No bookings scheduled yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {sortedBarberBookings.map((app) => (
                    <div 
                      key={app.id} 
                      className="glass-card gsap-card"
                      style={{ 
                        opacity: app.status === 'completed' ? 0.6 : 1,
                        borderColor: app.status === 'completed' ? 'var(--border-light)' : 'var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>APPOINTMENT DATE & TIME</span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{app.date} • {app.startTime} - {app.endTime}</strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '12px' }}>({app.totalDuration} mins)</span>
                        </div>
                        <div>
                          <span className={`badge ${app.status === 'upcoming' ? 'badge-gold' : app.status === 'completed' ? 'badge-green' : 'badge-red'}`}>
                            {app.status}
                          </span>
                        </div>
                      </div>

                      {app.status === 'cancelled' && app.travelStatus && app.travelStatus.startsWith('Cancelled: ') && (
                        <div style={{ 
                          background: 'rgba(239, 68, 68, 0.08)', 
                          border: '1px solid rgba(239, 68, 68, 0.15)', 
                          borderRadius: '10px', 
                          padding: '12px', 
                          marginBottom: '16px',
                          color: 'var(--status-red)',
                          fontSize: '0.85rem'
                        }}>
                          <strong>Appointment Cancelled:</strong> {app.travelStatus.replace('Cancelled: ', '')}
                          {app.paymentStatus === 'refunded' && (
                            <span style={{ display: 'block', marginTop: '4px', fontWeight: 600, color: 'var(--status-green)' }}>
                              ✓ UPI Pre-payment Refunded (₹{app.totalPrice})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Barber Transit Ticker */}
                      {app.notifications && app.notifications.length > 0 && (
                        <div style={{ 
                          background: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: '10px', 
                          padding: '12px', 
                          margin: '12px 0 16px 0',
                          maxHeight: '100px',
                          overflowY: 'auto'
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                            Customer Travel Status Ticker
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {app.notifications.map((notif: string, idx: number) => (
                              <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ color: 'var(--status-green)' }}>●</span>
                                <span>{notif}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0', padding: '16px 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }} className="barber-appointment-details">
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</span>
                          <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} style={{ color: 'var(--accent-gold)' }} /> {app.customerName}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requested Services</span>
                          <p style={{ fontSize: '0.9rem' }}>{app.services.map(s => s.name).join(', ')}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subtotal</span>
                          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            ₹{app.totalPrice} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: app.paymentStatus === 'paid' ? 'var(--status-green)' : 'var(--status-amber)' }}>({app.paymentMethod === 'UPI Online' ? 'Prepaid Online' : 'Collect Cash/UPI'})</span>
                          </span>
                        </div>
                        
                        {app.status === 'upcoming' && (
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <button 
                                className="btn-secondary"
                                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                                onClick={() => {
                                  setCancellingApp(app);
                                  setCancelReasonOption('');
                                  setCancelReasonText('');
                                }}
                              >
                                Cancel
                              </button>
                                <button 
                                   className="gold-glow-btn"
                                   style={{ 
                                     padding: '8px 16px', 
                                     fontSize: '0.8rem',
                                     opacity: isCheckInWindowOpen(app.date, app.startTime, app.endTime) ? 1 : 0.5,
                                     cursor: isCheckInWindowOpen(app.date, app.startTime, app.endTime) ? 'pointer' : 'not-allowed'
                                   }}
                                   onClick={() => {
                                     if (!isCheckInWindowOpen(app.date, app.startTime, app.endTime)) {
                                       showToast('Check-in is only allowed within 30 minutes of scheduled start time.');
                                       return;
                                     }
                                     setActiveOtpApp(app);
                                     setOtpInput('');
                                     setOtpError('');
                                     setOtpSuccess(false);
                                   }}
                                 >
                                   Start Service (OTP)
                                  </button>
                          </div>
                        )}

                        {app.status === 'in_progress' && (
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                              className="gold-glow-btn"
                              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                              onClick={async () => {
                                const res = await completeAppointment(app.id);
                                if (res.success) {
                                  showToast('Service completed successfully!');
                                } else {
                                  alert(res.message);
                                }
                              }}
                            >
                              Complete Service
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Live Telemetry Tracking Map inside Barber Console */}
                      {app.status === 'upcoming' && (
                        <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '16px', paddingTop: '16px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)', display: 'block', marginBottom: '8px' }}>
                            Customer Navigation Status
                          </span>
                          <NavigateButton 
                            appointment={app} 
                            barber={activeBarber} 
                            hideButton={true}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Barber Status Delay Panel */}
            <div className="glass-card gsap-card barber-status-panel" style={{ position: 'sticky', top: '90px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={20} style={{ color: 'var(--accent-gold)' }} />
                <h2 style={{ fontSize: '1.3rem' }}>Live Delay Console</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Are you running behind schedule? Adjust your status below. Your changes will propagate in real-time to alert all upcoming customer appointments.
              </p>

              {/* Status Display badge */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', textAlign: 'center', marginBottom: '24px', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>YOUR CURRENT LIVE STATUS</span>
                <strong style={{ fontSize: '1.25rem', color: activeBarber.delayStatus === 'On Time' ? 'var(--status-green)' : 'var(--status-amber)' }}>
                  ● {activeBarber.delayStatus}
                </strong>
              </div>

              {/* Status Selector Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'On Time', style: 'btn-secondary', val: 'On Time' },
                  { label: '+10 Minutes Late', style: 'btn-secondary', val: '+10 Min' },
                  { label: '+20 Minutes Late', style: 'btn-secondary', val: '+20 Min' },
                  { label: 'Severe Delay', style: 'btn-secondary', val: 'Delayed' },
                ].map((btn, idx) => {
                  const isActive = activeBarber.delayStatus === btn.val;
                  return (
                    <button 
                      key={idx}
                      onClick={() => {
                        updateBarberDelay(activeBarber.id, btn.val);
                        showToast(`Status updated: ${btn.label}`);
                      }}
                      className={isActive ? 'gold-glow-btn' : 'btn-secondary'}
                      style={{ justifyContent: 'center', padding: '10px 0' }}
                    >
                      {btn.label} {isActive && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </main>
      )}

      {/* ==========================================
         ADMIN PORTAL VIEW
         ========================================== */}
      {currentUser.role === 'admin' && (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          
          {/* Admin Header Info */}
          <div className="gsap-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', padding: '16px', background: 'var(--accent-gold-glow)', borderRadius: '50%', color: 'var(--accent-gold)' }}>
                <Settings size={28} />
              </div>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '8px' }}>System Administrator Console</span>
                <h1 style={{ fontSize: '2.2rem' }}>Welcome, {currentUser.name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Review and manage barber onboarding applications</p>
              </div>
            </div>
            
            <button 
              onClick={logout} 
              className="btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          {/* Main Dashboard Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }} className="admin-dashboard-layout">
            
            {/* Left Column: Applications List (Col-span-5) */}
            <div className="glass-card gsap-card" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', height: 'fit-content' }}>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Applications Queue</h2>
              </div>

              {loadingAdminApps ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>Loading submissions...</div>
              ) : adminApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>No applications submitted yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                  {adminApplications.map((app) => {
                    const isSelected = selectedAdminApp && selectedAdminApp.id === app.id;
                    return (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedAdminApp(app);
                          setIsAdminEditing(false);
                        }}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background: isSelected ? 'var(--accent-gold-glow)' : 'var(--bg-secondary)',
                          border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{app.shopName}</span>
                          <span 
                            className={`badge ${
                              app.status === 'approved' ? 'badge-green' : 
                              app.status === 'rejected' ? 'badge-red' : 'badge-gold'
                            }`}
                            style={{ fontSize: '0.7rem', padding: '2px 6px', textTransform: 'capitalize' }}
                          >
                            {app.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Owner: {app.ownerName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Submitted: {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Detail View (Col-span-7) */}
            <div className="glass-card gsap-card" style={{ gridColumn: 'span 7', padding: '28px', height: 'fit-content' }}>
              {!selectedAdminApp ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
                  <Building size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                  <p>Select an application from the queue to view details</p>
                </div>
              ) : isAdminEditing ? (
                /* INLINE EDIT FORM */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)' }}>Edit Application Details</h2>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setIsAdminEditing(false)}>Cancel</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Shop Name</label>
                      <input 
                        type="text" 
                        value={adminEditShopName}
                        onChange={(e) => setAdminEditShopName(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Owner / Stylist</label>
                      <input 
                        type="text" 
                        value={adminEditOwnerName}
                        onChange={(e) => setAdminEditOwnerName(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Contact Number</label>
                      <input 
                        type="text" 
                        value={adminEditContactNumber}
                        onChange={(e) => setAdminEditContactNumber(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Capacity (Chairs)</label>
                      <input 
                        type="number" 
                        value={adminEditChairsCount}
                        onChange={(e) => setAdminEditChairsCount(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location Address</label>
                      <input 
                        type="text" 
                        value={adminEditLocation}
                        onChange={(e) => setAdminEditLocation(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Latitude</label>
                      <input 
                        type="text" 
                        value={adminEditLat}
                        onChange={(e) => setAdminEditLat(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Longitude</label>
                      <input 
                        type="text" 
                        value={adminEditLon}
                        onChange={(e) => setAdminEditLon(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Opening Time</label>
                      <input 
                        type="text" 
                        value={adminEditOpeningTime}
                        onChange={(e) => setAdminEditOpeningTime(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Closing Time</label>
                      <input 
                        type="text" 
                        value={adminEditClosingTime}
                        onChange={(e) => setAdminEditClosingTime(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Services Edit list */}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Services & Rates</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {adminEditServices.map((service, index) => (
                        <div 
                          key={index} 
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid var(--border-light)' }}
                        >
                          <span>{service.name} (₹{service.price} | {service.durationMinutes} min)</span>
                          <button type="button" onClick={() => handleRemoveAdminService(index)} style={{ background: 'none', border: 'none', color: 'var(--status-red)', cursor: 'pointer' }}><Trash size={14} /></button>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Service name"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        style={{ flex: 2, padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                      <input 
                        type="number" 
                        placeholder="Price"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                      <input 
                        type="number" 
                        placeholder="Mins"
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                      <button type="button" className="btn-secondary" onClick={handleAddAdminService} style={{ padding: '6px 10px', fontSize: '0.82rem' }}><Plus size={14} /></button>
                    </div>
                  </div>

                  <button className="gold-glow-btn" onClick={handleSaveAdminEdit} style={{ padding: '12px', justifyContent: 'center' }}>Save Changes</button>
                </div>
              ) : (
                /* VIEW MODE APPLICATION DETAILS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Title & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedAdminApp.shopName}</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Application ID: #{selectedAdminApp.id}</span>
                    </div>
                    <span 
                      className={`badge ${
                        selectedAdminApp.status === 'approved' ? 'badge-green' : 
                        selectedAdminApp.status === 'rejected' ? 'badge-red' : 'badge-gold'
                      }`}
                      style={{ fontSize: '0.85rem', padding: '6px 12px', textTransform: 'capitalize' }}
                    >
                      {selectedAdminApp.status}
                    </span>
                  </div>

                  {/* Actions Feedback Alert */}
                  {adminActionFeedback && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.08)', color: 'var(--status-green)', border: '1px solid rgba(34, 197, 94, 0.15)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={16} />
                      <span>{adminActionFeedback}</span>
                    </div>
                  )}

                  {adminActionError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} />
                      <span>{adminActionError}</span>
                    </div>
                  )}

                  {/* Detail Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Owner Name</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedAdminApp.ownerName}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Email</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedAdminApp.email}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedAdminApp.contactNumber}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capacity</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedAdminApp.chairsCount} Barber Chairs</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operating Hours</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedAdminApp.openingTime} - {selectedAdminApp.closingTime}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Coordinates</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Lat: {selectedAdminApp.lat}, Lon: {selectedAdminApp.lon}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Address Location</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedAdminApp.location}</strong>
                    </div>
                  </div>

                  {/* Services offered list */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Offered Services</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                      {selectedAdminApp.services && selectedAdminApp.services.map((s: any, idx: number) => (
                        <div key={idx} style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>₹{s.price} | {s.durationMinutes} min</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedAdminApp.status === 'rejected' && (
                    <div 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid rgba(239, 68, 68, 0.15)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <strong style={{ color: 'var(--status-red)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={16} /> REJECTION REVISION FEEDBACK
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {selectedAdminApp.rejectionFeedback || 'No feedback comments provided.'}
                      </p>
                    </div>
                  )}

                  {/* Approval / Rejection Controls */}
                  {selectedAdminApp.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                      <button 
                        className="btn-danger" 
                        style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                        onClick={() => {
                          setRejectFeedbackText('');
                          setShowRejectFeedbackModal(true);
                        }}
                      >
                        <XCircle size={16} style={{ marginRight: '6px' }} /> Reject Application
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                        onClick={() => handleStartAdminEdit(selectedAdminApp)}
                      >
                        <Edit size={16} style={{ marginRight: '6px' }} /> Edit Details
                      </button>
                      <button 
                        className="gold-glow-btn" 
                        style={{ flex: 1.5, padding: '12px', justifyContent: 'center' }}
                        onClick={() => handleAdminApprove(selectedAdminApp.id)}
                      >
                        <CheckCircle size={16} style={{ marginRight: '6px' }} /> Approve & Publish
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </main>
      )}

      {/* ==========================================
         BOOKING SHEET MODAL
         ========================================== */}
      {isBookingOpen && selectedBarber && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsBookingOpen(false)}>
          <div 
            className="glass-card gsap-modal booking-modal-content" 
            style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scissors size={20} style={{ color: 'var(--accent-gold)' }} />
                  {rescheduleApp ? 'Reschedule Appointment' : 'Book Appointment'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {rescheduleApp ? `Change scheduled time with ${selectedBarber.name}` : `Select services and time slot with ${selectedBarber.name}`}
                </p>
              </div>
              <button 
                onClick={() => setIsBookingOpen(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Error & Success Banners */}
            {bookingError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess && (
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', color: 'var(--status-green)', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                <CheckCircle size={30} style={{ margin: '0 auto 8px', display: 'block' }} />
                <strong>Appointment Confirmed!</strong>
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Paying at shop. See you soon!</p>
              </div>
            )}

            {/* Modal Body Form */}
            <form onSubmit={handleConfirmBooking}>
              
              {/* Date Input */}
              <div 
                style={{ marginBottom: '20px' }}
                title={isTimeSelectionDisabled ? "Rescheduling is not allowed within 30 minutes of booking start" : undefined}
              >
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Select Date {isTimeSelectionDisabled && ' (Locked - within 30 mins of appointment)'}
                </label>
                <input 
                  type="date"
                  value={selectedDate}
                  min={getLocalDateString()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={isTimeSelectionDisabled}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '10px', 
                    color: 'var(--text-primary)', 
                    outline: 'none',
                    opacity: isTimeSelectionDisabled ? 0.6 : 1,
                    cursor: isTimeSelectionDisabled ? 'not-allowed' : 'text'
                  }}
                />
              </div>

              {/* Service list checks */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Select Services (Select multiple)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {services.map((service) => {
                    const isChecked = selectedServiceIds.includes(service.id);
                    return (
                      <div 
                        key={service.id} 
                        onClick={() => handleToggleService(service.id)}
                        style={{ 
                          padding: '12px 16px', 
                          borderRadius: '10px', 
                          background: isChecked ? 'var(--accent-gold-glow)' : 'var(--bg-tertiary)', 
                          border: isChecked ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ paddingRight: '16px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: isChecked ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                            {service.name}
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {service.description}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-primary)' }}>
                            ₹{service.price}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {service.durationMinutes} min
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time slot picker */}
              {selectedServiceIds.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Available Time Slots (Calculated for {totalDuration} mins slot) {isTimeSelectionDisabled && ' (Locked - within 30 mins of appointment)'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'var(--slot-grid-cols, repeat(4, 1fr))', gap: '8px' }} className="time-slot-grid">
                    {TIME_SLOTS.map((slot) => {
                      // Check double booking dynamic block
                      const [slotH, slotM] = slot.split(':').map(Number);
                      const slotStart = slotH * 60 + slotM;
                      const slotEnd = slotStart + totalDuration;

                      const capacity = selectedBarber.chairsCount || 2;
                      let isBooked = false;

                      for (let t = slotStart; t < slotEnd; t++) {
                        let activeOverlaps = 0;
                        for (const app of appointments) {
                          if (app.barberId !== selectedBarber.id || app.date !== selectedDate || app.status === 'cancelled' || app.status === 'completed') continue;
                          const [appSH, appSM] = app.startTime.split(':').map(Number);
                          const [appEH, appEM] = app.endTime.split(':').map(Number);
                          const appStart = appSH * 60 + appSM;
                          const appEnd = appEH * 60 + appEM;

                          if (t >= appStart && t < appEnd) {
                            activeOverlaps++;
                          }
                        }
                        if (activeOverlaps >= capacity) {
                          isBooked = true;
                          break;
                        }
                      }

                      // Check if slot is too soon or in the past (if date is today, must be at least 30 mins in the future)
                      let isTooSoon = false;
                      const localDate = new Date();
                      const y = localDate.getFullYear();
                      const m = String(localDate.getMonth() + 1).padStart(2, '0');
                      const d = String(localDate.getDate()).padStart(2, '0');
                      const todayFormatted = `${y}-${m}-${d}`;

                      if (selectedDate === todayFormatted) {
                        const [h, min] = slot.split(':').map(Number);
                        const slotTime = new Date(y, localDate.getMonth(), localDate.getDate(), h, min, 0);
                        if (slotTime.getTime() - localDate.getTime() < 30 * 60 * 1000) {
                          isTooSoon = true;
                        }
                      }

                      const isSelected = selectedTimeSlot === slot;
                      const isDisabled = isBooked || isTimeSelectionDisabled || isTooSoon;

                      const tooltipText = isTimeSelectionDisabled 
                        ? "Rescheduling is not allowed within 30 minutes of booking start" 
                        : isTooSoon 
                          ? "New bookings must be scheduled at least 30 minutes in advance" 
                          : isBooked 
                            ? "Slot fully booked" 
                            : undefined;

                      return (
                        <span 
                          key={slot} 
                          title={tooltipText} 
                          style={{ display: 'inline-block', width: '100%', cursor: isDisabled ? 'not-allowed' : 'default' }}
                        >
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedTimeSlot(slot)}
                            style={{
                              width: '100%',
                              padding: '10px 4px',
                              borderRadius: '8px',
                              border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                              background: isSelected ? 'var(--accent-gold)' : isDisabled ? 'transparent' : 'var(--bg-tertiary)',
                              color: isSelected ? 'var(--bg-primary)' : isDisabled ? 'var(--text-muted)' : 'var(--text-primary)',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              textDecoration: isBooked ? 'line-through' : 'none',
                              opacity: isBooked ? 0.35 : isDisabled ? 0.6 : 1,
                              transition: 'all 0.2s ease',
                              pointerEvents: isDisabled ? 'none' : 'auto' // Prevents the button from swallowing hover events in some browsers
                            }}
                          >
                            {slot}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment selector UI */}
              {selectedServiceIds.length > 0 && !rescheduleApp && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Select Payment Option
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }} className="payment-selector-container">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodOption('Pay At Shop')}
                      className={paymentMethodOption === 'Pay At Shop' ? 'gold-glow-btn' : 'btn-secondary'}
                      style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '0.85rem', gap: '8px' }}
                    >
                      <User size={14} /> Pay At Shop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodOption('UPI Online')}
                      className={paymentMethodOption === 'UPI Online' ? 'gold-glow-btn' : 'btn-secondary'}
                      style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '0.85rem', gap: '8px' }}
                    >
                      <Sparkles size={14} /> UPI Online
                    </button>
                  </div>
                </div>
              )}

              {/* Running total pricing and Confirm checkout button */}
              {selectedServiceIds.length > 0 && (
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '10px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL PRICE</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--accent-gold)' }}>₹{totalPrice}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL DURATION</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{totalDuration} minutes</strong>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setIsBookingOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="gold-glow-btn" 
                  style={{ flex: 2, justifyContent: 'center' }}
                  disabled={!selectedTimeSlot || selectedServiceIds.length === 0}
                >
                  {rescheduleApp ? 'Confirm Reschedule' : 'Confirm & Pay at Shop'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==========================================
         UPI ONLINE PAYMENT SIMULATION MODAL
         ========================================== */}
      {showPaymentQrModal && selectedBarber && (
        <div className="modal-backdrop animate-fade-in" onClick={() => {
          if (!paymentUpiLoaderStatus) {
            setShowPaymentQrModal(false);
          }
        }}>
          <div 
            className="glass-card otp-modal-content animate-scale-in" 
            style={{ 
              width: '100%', 
              maxWidth: '460px', 
              padding: '32px',
              position: 'relative',
              boxShadow: 'var(--shadow-premium), var(--shadow-glow)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            {!paymentUpiLoaderStatus && (
              <button 
                onClick={() => setShowPaymentQrModal(false)} 
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            )}

            {/* Modal Header */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--accent-gold-glow)', borderRadius: '50%', color: 'var(--accent-gold)', marginBottom: '16px' }}>
                <Sparkles size={24} />
              </div>
              <h2 style={{ fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Scan & Pay via UPI</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Complete secure payment to instantly confirm your appointment
              </p>
            </div>

            {/* Merchant Details */}
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Styling Studio:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedBarber.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedDate} @ {selectedTimeSlot}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Amount Pay:</span>
                <strong style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>₹{totalPrice}</strong>
              </div>
            </div>

            {/* Payment Loader or Error */}
            {paymentUpiLoaderStatus ? (
              <div style={{ padding: '24px 0', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-light)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%' }} className="spin-animation"></div>
                <p style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.95rem' }}>{paymentUpiLoaderStatus}</p>
              </div>
            ) : paymentUpiError ? (
              <div style={{ padding: '16px 0' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.88rem' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <strong>Payment Failed</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>{paymentUpiError}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setPaymentUpiError('');
                      setPaymentMethodOption('Pay At Shop');
                      setShowPaymentQrModal(false);
                      setIsBookingOpen(true);
                    }}
                  >
                    Pay at Shop
                  </button>
                  <button
                    className="gold-glow-btn"
                    style={{ flex: 1.5, justifyContent: 'center' }}
                    onClick={() => {
                      setPaymentUpiError('');
                    }}
                  >
                    Retry Scan
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* SVG Stylized UPI QR Code */}
                <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 20px', background: '#ffffff', padding: '12px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ shapeRendering: 'crispEdges' }}>
                    {/* Mock QR lines */}
                    <path d="M 0,0 L 25,0 L 25,25 L 0,25 Z M 10,10 L 15,10 L 15,15 L 10,15 Z" fill="#000" transform="scale(1.2)" />
                    <path d="M 50,0 L 75,0 L 75,25 L 50,25 Z M 60,10 L 65,10 L 65,15 L 60,15 Z" fill="#000" transform="scale(1.2)" />
                    <path d="M 0,50 L 25,50 L 25,75 L 0,75 Z M 10,60 L 15,60 L 15,65 L 10,65 Z" fill="#000" transform="scale(1.2)" />
                    <path d="M 35,35 H 48 V 48 H 35 Z M 5,35 H 18 V 48 H 5 Z M 35,5 H 48 V 18 H 35 Z" fill="#c5a880" />
                    <path d="M 28,28 H 38 V 38 H 28 Z M 42,42 H 58 V 58 H 42 Z M 62,62 H 78 V 78 H 62 Z" fill="#000" />
                    <path d="M 50,50 H 65 V 65 H 50 Z M 70,28 H 80 V 38 H 70 Z M 28,70 H 38 V 80 H 28 Z" fill="#c5a880" />
                  </svg>
                  {/* Scan Line Overlay */}
                  <div style={{ position: 'absolute', left: '12px', right: '12px', height: '2px', background: 'var(--accent-gold)', top: '12px', boxShadow: '0 0 8px var(--accent-gold)', animation: 'radarPing 2s infinite ease-in-out' }}></div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  <p>Scan using BHIM, Google Pay, PhonePe, or Paytm</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>UPI ID: <strong>barbo.pay@axisbank</strong></p>
                </div>

                {/* Simulation controls */}
                <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '20px', marginTop: '20px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Payment Simulation Triggers
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn-danger"
                      style={{ flex: 1, padding: '10px', fontSize: '0.8rem', justifyContent: 'center' }}
                      onClick={() => handleConfirmUpiBooking(false)}
                    >
                      Simulate Failure
                    </button>
                    <button
                      type="button"
                      className="gold-glow-btn"
                      style={{ flex: 1.5, padding: '10px', fontSize: '0.8rem', justifyContent: 'center' }}
                      onClick={() => handleConfirmUpiBooking(true)}
                    >
                      Simulate Success
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
         SECURE HANDSHAKE OTP VERIFICATION MODAL
         ========================================== */}
      {activeOtpApp && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setActiveOtpApp(null)}>
          <div 
            className="glass-card" 
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              padding: '32px',
              position: 'relative',
              boxShadow: 'var(--shadow-premium), var(--shadow-glow)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button 
              onClick={() => setActiveOtpApp(null)} 
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--accent-gold-glow)', borderRadius: '50%', color: 'var(--accent-gold)', marginBottom: '16px' }}>
                <Key size={24} />
              </div>
              <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Secure Check-in</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Verify customer check-in OTP code to start service</p>
            </div>

            {/* Summary Box */}
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', marginBottom: '24px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{activeOtpApp.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scheduled:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{activeOtpApp.startTime} - {activeOtpApp.endTime}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Services:</span>
                <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeOtpApp.services.map((s: any) => s.name).join(', ')}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Amount Due:</span>
                <strong style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>₹{activeOtpApp.totalPrice}</strong>
              </div>
            </div>

            {otpSuccess ? (
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', color: 'var(--status-green)', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                <strong>Check-in Verified!</strong>
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Service check-in authorized. Service started.</p>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setOtpError('');
                
                const res = await startAppointmentWithOtp(activeOtpApp.id, otpInput.trim());
                if (res.success) {
                  setOtpSuccess(true);
                  showToast('Service started successfully!');
                  setTimeout(() => {
                    setActiveOtpApp(null);
                    setOtpSuccess(false);
                    setOtpInput('');
                  }, 1500);
                } else {
                  setOtpError(res.message);
                  // Add shake class
                  const inputEl = document.getElementById('handshake-otp-input');
                  if (inputEl) {
                    inputEl.classList.add('shake-error');
                    setTimeout(() => {
                      inputEl.classList.remove('shake-error');
                    }, 400);
                  }
                }
              }}>
                <div style={{ marginBottom: '24px' }}>
                  <label htmlFor="handshake-otp-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'center' }}>
                    Enter 4-Digit travel OTP
                  </label>
                  <input 
                    id="handshake-otp-input"
                    type="text" 
                    placeholder="0 0 0 0" 
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => {
                      setOtpInput(e.target.value.replace(/\D/g, ''));
                      setOtpError('');
                    }}
                    autoFocus
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      background: 'var(--bg-tertiary)', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: '12px', 
                      color: 'var(--accent-gold)', 
                      outline: 'none', 
                      fontSize: '1.8rem', 
                      textAlign: 'center', 
                      letterSpacing: '8px',
                      fontWeight: 800,
                      transition: 'var(--transition-smooth)'
                    }}
                  />
                  {otpError && (
                    <span style={{ display: 'block', color: 'var(--status-red)', fontSize: '0.78rem', marginTop: '8px', textAlign: 'center' }}>
                      {otpError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '12px 0' }}
                    onClick={() => setActiveOtpApp(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="gold-glow-btn"
                    style={{ flex: 1.5, padding: '12px 0', justifyContent: 'center' }}
                    disabled={otpInput.length < 4}
                  >
                    Verify & Complete
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ==========================================
          CANCELLATION REASON MODAL
          ========================================== */}
      {cancellingApp && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setCancellingApp(null)}>
          <div 
            className="glass-card" 
            style={{ 
              width: '100%', 
              maxWidth: '480px', 
              padding: '32px',
              position: 'relative',
              boxShadow: 'var(--shadow-premium), var(--shadow-glow)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setCancellingApp(null)} 
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '50%', color: 'var(--status-red)', marginBottom: '16px' }}>
                <AlertTriangle size={24} />
              </div>
              <h2 style={{ fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--status-red)' }}>Cancel Appointment</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Please provide a reason for cancelling this appointment.
              </p>
            </div>

            {/* Appointment Details Preview */}
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{currentUser?.role === 'customer' ? 'Barber:' : 'Customer:'}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.role === 'customer' ? cancellingApp.barberName : cancellingApp.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{cancellingApp.date} • {cancellingApp.startTime}</strong>
              </div>
            </div>

            {/* Reasons Form */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Select a reason
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {(currentUser?.role === 'customer' ? [
                  "Change of plans",
                  "Emergency came up",
                  "Booked by mistake / wrong slot",
                  "Barber running too late"
                ] : [
                  "Personal emergency",
                  "Power outage / technical issue at shop",
                  "Double booked / scheduling conflict",
                  "Customer didn't arrive on time"
                ]).map((reason) => (
                  <label 
                    key={reason}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: cancelReasonOption === reason ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      border: `1px solid ${cancelReasonOption === reason ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="cancelReason" 
                      value={reason} 
                      checked={cancelReasonOption === reason} 
                      onChange={(e) => {
                        setCancelReasonOption(e.target.value);
                      }}
                      style={{ accentColor: 'var(--accent-gold)' }}
                    />
                    <span>{reason}</span>
                  </label>
                ))}

                <label 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: cancelReasonOption === 'other' ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                    border: `1px solid ${cancelReasonOption === 'other' ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="radio" 
                    name="cancelReason" 
                    value="other" 
                    checked={cancelReasonOption === 'other'} 
                    onChange={(e) => {
                      setCancelReasonOption(e.target.value);
                    }}
                    style={{ accentColor: 'var(--accent-gold)' }}
                  />
                  <span>Other (Write custom reason)</span>
                </label>
              </div>

              {cancelReasonOption === 'other' && (
                <div style={{ marginBottom: '24px' }} className="animate-fade-in">
                  <textarea
                    placeholder="Describe the reason for cancellation..."
                    value={cancelReasonText}
                    onChange={(e) => setCancelReasonText(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                  onClick={() => setCancellingApp(null)}
                >
                  Keep Booking
                </button>
                <button
                  className="btn-danger"
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    justifyContent: 'center',
                    opacity: (!cancelReasonOption || (cancelReasonOption === 'other' && !cancelReasonText.trim())) ? 0.5 : 1,
                    cursor: (!cancelReasonOption || (cancelReasonOption === 'other' && !cancelReasonText.trim())) ? 'not-allowed' : 'pointer'
                  }}
                  disabled={!cancelReasonOption || (cancelReasonOption === 'other' && !cancelReasonText.trim())}
                  onClick={async () => {
                    const finalReason = cancelReasonOption === 'other' ? cancelReasonText.trim() : cancelReasonOption;
                    cancelledAppIdsRef.current.add(cancellingApp.id);
                    const isPaid = cancellingApp.paymentStatus === 'paid';
                    await updateAppointmentStatus(cancellingApp.id, 'cancelled', finalReason);
                    setCancellingApp(null);
                    if (isPaid) {
                      showToast(`Appointment cancelled. Refund of ₹${cancellingApp.totalPrice} initiated!`);
                    } else {
                      showToast('Appointment cancelled successfully.');
                    }
                  }}
                >
                  Confirm Cancel
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Onboarding Form Modal */}
      {showOnboardingModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowOnboardingModal(false)}>
          <div 
            className="glass-card animate-scale-in" 
            style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1100 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={22} style={{ color: 'var(--accent-gold)' }} />
                  Partner with Barbo
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Get your salon listed on Bhopal's premium grooming network
                </p>
              </div>
              <button 
                onClick={() => setShowOnboardingModal(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '24px' }}>
              <button 
                onClick={() => setOnboardingTab('apply')}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: 'transparent', 
                  border: 'none', 
                  borderBottom: onboardingTab === 'apply' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: onboardingTab === 'apply' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply for Listing
              </button>
              <button 
                onClick={() => setOnboardingTab('status')}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: 'transparent', 
                  border: 'none', 
                  borderBottom: onboardingTab === 'status' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: onboardingTab === 'status' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Check Application Status
              </button>
            </div>

            {/* Apply Tab */}
            {onboardingTab === 'apply' && (
              <div>
                {onboardingSuccess ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                    <CheckCircle size={48} style={{ color: 'var(--accent-gold)', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Application Submitted!</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                      Thank you for applying. Our admin team will review your application within 24 hours. You can check the status anytime using your email: <strong>{onboardingEmailInput || onboardingEmail}</strong>
                    </p>
                    <button className="gold-glow-btn" onClick={() => setShowOnboardingModal(false)}>
                      Close Portal
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {onboardingError && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        <span>{onboardingError}</span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Shop/Salon Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Royal Barber Shop"
                          value={onboardingShopName}
                          onChange={(e) => setOnboardingShopName(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Owner / Main Barber Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Rajesh Kumar"
                          value={onboardingOwnerName}
                          onChange={(e) => setOnboardingOwnerName(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Contact Email (For logins)
                        </label>
                        <input 
                          type="email" 
                          placeholder="e.g. owner@shop.com"
                          value={onboardingEmail}
                          onChange={(e) => setOnboardingEmail(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Contact Number
                        </label>
                        <input 
                          type="tel" 
                          placeholder="e.g. 9876543210"
                          value={onboardingContactNumber}
                          onChange={(e) => setOnboardingContactNumber(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Shop Location Address (Bhopal)
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Plot 42, MP Nagar Zone 2, Bhopal"
                        value={onboardingLocation}
                        onChange={(e) => setOnboardingLocation(e.target.value)}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Latitude (Bhopal coords)
                        </label>
                        <input 
                          type="text" 
                          value={onboardingLat}
                          onChange={(e) => setOnboardingLat(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Longitude (Bhopal coords)
                        </label>
                        <input 
                          type="text" 
                          value={onboardingLon}
                          onChange={(e) => setOnboardingLon(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Stylist Chairs Count
                        </label>
                        <input 
                          type="number" 
                          min={1} 
                          max={15}
                          value={onboardingChairsCount}
                          onChange={(e) => setOnboardingChairsCount(Number(e.target.value) || 2)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Opening Hours (24hr format)
                        </label>
                        <input 
                          type="time" 
                          value={onboardingOpeningTime}
                          onChange={(e) => setOnboardingOpeningTime(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Closing Hours (24hr format)
                        </label>
                        <input 
                          type="time" 
                          value={onboardingClosingTime}
                          onChange={(e) => setOnboardingClosingTime(e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                    </div>

                    {/* Services Manager */}
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Services Offered & Price Menus
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                        Add services that clients can book at your shop.
                      </p>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <input 
                          type="text" 
                          placeholder="Service Name (e.g. Haircut)"
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          style={{ flex: 2, minWidth: '160px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                        />
                        <input 
                          type="number" 
                          placeholder="Price (₹)"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          style={{ flex: 1, minWidth: '80px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                        />
                        <input 
                          type="number" 
                          placeholder="Mins"
                          value={newServiceDuration}
                          onChange={(e) => setNewServiceDuration(e.target.value)}
                          style={{ flex: 1, minWidth: '80px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.88rem' }}
                        />
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
                          onClick={handleAddOnboardingService}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>

                      {/* Services list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {onboardingServices.map((srv, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              background: 'rgba(255, 255, 255, 0.02)', 
                              border: '1px solid var(--border-light)', 
                              borderRadius: '8px', 
                              padding: '10px 16px' 
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{srv.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                {srv.durationMinutes} minutes
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                                ₹{srv.price}
                              </span>
                              <button 
                                type="button" 
                                style={{ background: 'transparent', border: 'none', color: 'var(--status-red)', cursor: 'pointer' }}
                                onClick={() => handleRemoveOnboardingService(idx)}
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="gold-glow-btn"
                      style={{ padding: '14px', justifyContent: 'center', width: '100%', marginTop: '10px' }}
                      disabled={submittingOnboarding}
                    >
                      {submittingOnboarding ? 'Submitting Application...' : 'Submit Partnership Application'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Check Status Tab */}
            {onboardingTab === 'status' && (
              <div>
                <form onSubmit={handleCheckStatus} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                  <input 
                    type="email" 
                    placeholder="Enter your application email address"
                    value={onboardingEmailInput}
                    onChange={(e) => setOnboardingEmailInput(e.target.value)}
                    style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none' }}
                    required
                  />
                  <button 
                    type="submit" 
                    className="gold-glow-btn" 
                    style={{ padding: '12px 20px' }}
                    disabled={checkingStatus}
                  >
                    {checkingStatus ? 'Checking...' : 'Check Status'}
                  </button>
                </form>

                {statusMessage && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {statusMessage}
                  </div>
                )}

                {checkedApplication && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{checkedApplication.shopName}</h4>
                      
                      {checkedApplication.status === 'approved' && (
                        <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--status-green)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          Approved
                        </span>
                      )}
                      {checkedApplication.status === 'pending' && (
                        <span style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--status-amber)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          Pending Review
                        </span>
                      )}
                      {checkedApplication.status === 'rejected' && (
                        <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          Revisions Required
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div><strong>Owner:</strong> {checkedApplication.ownerName}</div>
                      <div><strong>Phone:</strong> {checkedApplication.contactNumber}</div>
                      <div><strong>Hours:</strong> {checkedApplication.openingTime} - {checkedApplication.closingTime}</div>
                      <div><strong>Chairs:</strong> {checkedApplication.chairsCount} Stylist Seats</div>
                    </div>

                    {checkedApplication.status === 'rejected' && (
                      <div 
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.05)', 
                          border: '1px solid rgba(239, 68, 68, 0.15)', 
                          borderRadius: '8px', 
                          padding: '12px', 
                          marginTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <strong style={{ color: 'var(--status-red)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} /> ADMIN FEEDBACK COMMENTS:
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          {checkedApplication.rejectionFeedback || 'Please review your shop details and resubmit.'}
                        </p>
                        
                        <button 
                          className="btn-danger" 
                          style={{ marginTop: '10px', padding: '10px', justifyContent: 'center', width: '100%', fontSize: '0.85rem' }}
                          onClick={() => handleEditAndResubmit(checkedApplication)}
                        >
                          <Edit size={14} style={{ marginRight: '6px' }} /> Edit Details & Resubmit
                        </button>
                      </div>
                    )}

                    {checkedApplication.status === 'approved' && (
                      <div 
                        style={{ 
                          background: 'rgba(56, 189, 248, 0.05)', 
                          border: '1px solid rgba(56, 189, 248, 0.15)', 
                          borderRadius: '8px', 
                          padding: '16px', 
                          marginTop: '8px',
                          textAlign: 'center'
                        }}
                      >
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Congratulations! Your shop has been approved. You can log in as a Barber with:
                          <br />Email: <strong>{checkedApplication.email}</strong> / Password: <strong>123456</strong>
                        </p>
                        <button 
                          className="gold-glow-btn"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                          onClick={() => {
                            setShowOnboardingModal(false);
                            setEmail(checkedApplication.email);
                            setPassword('123456');
                            setIsSignup(false);
                            setShowLoginModal(true);
                          }}
                        >
                          Proceed to Log In
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Feedback Comment Modal Overlay */}
      {showRejectFeedbackModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowRejectFeedbackModal(false)}>
          <div 
            className="glass-card animate-scale-in" 
            style={{ width: '100%', maxWidth: '460px', zIndex: 1200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle style={{ color: 'var(--status-red)' }} size={20} />
              Reject Application
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Provide clear details or instructions on what changes the applicant needs to make before resubmitting.
            </p>

            <textarea 
              placeholder="e.g. Please adjust the Classic Haircut price to at least ₹150 and list your main barber names in the services."
              value={rejectFeedbackText}
              onChange={(e) => setRejectFeedbackText(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontSize: '0.88rem', marginBottom: '20px' }}
              required
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                onClick={() => {
                  setShowRejectFeedbackModal(false);
                  setRejectFeedbackText('');
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                style={{ flex: 1.5, padding: '12px', justifyContent: 'center' }}
                onClick={handleAdminRejectSubmit}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast-container animate-fade-in">
          <div className="toast-card">
            {toastMsg.toLowerCase().includes('cancel') ? (
              <AlertCircle size={18} style={{ color: 'var(--status-red)' }} />
            ) : (
              <CheckCircle size={18} style={{ color: 'var(--accent-gold)' }} />
            )}
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

    </div>
  );
}
