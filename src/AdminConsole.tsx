import React, { useState, useEffect } from 'react';
import { useApp, Barber, LocationChangeRequest } from './context/AppContext.tsx';
import { 
  Settings, 
  LogOut, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Edit, 
  XCircle, 
  MapPin 
} from 'lucide-react';

interface AdminConsoleProps {
  showToast: (msg: string) => void;
  logout: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ showToast, logout }) => {
  const {
    currentUser,
    adminFetchApplications,
    adminEditApplication,
    adminApproveApplication,
    adminRejectApplication,
    adminFetchBarbers,
    adminEditBarber,
    adminFetchLocationRequests,
    adminApproveLocationRequest,
    adminRejectLocationRequest
  } = useApp();

  const [adminTab, setAdminTab] = useState<'onboarding' | 'shops' | 'location_requests'>('onboarding');

  // Onboarding Queue states
  const [adminApplications, setAdminApplications] = useState<any[]>([]);
  const [selectedAdminApp, setSelectedAdminApp] = useState<any | null>(null);
  const [loadingAdminApps, setLoadingAdminApps] = useState(false);
  const [isAdminEditing, setIsAdminEditing] = useState(false);

  // Application Edit form states
  const [adminEditShopName, setAdminEditShopName] = useState('');
  const [adminEditOwnerName, setAdminEditOwnerName] = useState('');
  const [adminEditContactNumber, setAdminEditContactNumber] = useState('');
  const [adminEditLocation, setAdminEditLocation] = useState('');
  const [adminEditMapsUrl, setAdminEditMapsUrl] = useState('');
  const [adminEditChairsCount, setAdminEditChairsCount] = useState(2);
  const [adminEditOpeningTime, setAdminEditOpeningTime] = useState('09:00');
  const [adminEditClosingTime, setAdminEditClosingTime] = useState('21:00');
  const [adminEditWorkingDays, setAdminEditWorkingDays] = useState<string[]>([]);
  const [adminEditServices, setAdminEditServices] = useState<any[]>([]);
  const [adminNewServiceName, setAdminNewServiceName] = useState('');
  const [adminNewServicePrice, setAdminNewServicePrice] = useState('');
  const [adminNewServiceDuration, setAdminNewServiceDuration] = useState('');
  const [adminNewServiceCategory, setAdminNewServiceCategory] = useState<'men' | 'women' | 'unisex'>('unisex');

  // Active Shops states
  const [adminBarbersList, setAdminBarbersList] = useState<Barber[]>([]);
  const [selectedAdminBarber, setSelectedAdminBarber] = useState<Barber | null>(null);
  const [loadingAdminShops, setLoadingAdminShops] = useState(false);
  const [isAdminEditingBarber, setIsAdminEditingBarber] = useState(false);

  // Barber edit form states
  const [adminEditBarberName, setAdminEditBarberName] = useState('');
  const [adminEditBarberTitle, setAdminEditBarberTitle] = useState('');
  const [adminEditBarberSpecialty, setAdminEditBarberSpecialty] = useState('');
  const [adminEditBarberOpeningTime, setAdminEditBarberOpeningTime] = useState('');
  const [adminEditBarberClosingTime, setAdminEditBarberClosingTime] = useState('');
  const [adminEditBarberWorkingDays, setAdminEditBarberWorkingDays] = useState<string[]>([]);
  const [adminEditBarberMapsUrl, setAdminEditBarberMapsUrl] = useState('');

  // Location Requests queue states
  const [adminLocRequests, setAdminLocRequests] = useState<LocationChangeRequest[]>([]);
  const [selectedAdminLocRequest, setSelectedAdminLocRequest] = useState<LocationChangeRequest | null>(null);
  const [loadingAdminLocRequests, setLoadingAdminLocRequests] = useState(false);

  // Rejection feedback states
  const [showRejectFeedbackModal, setShowRejectFeedbackModal] = useState(false);
  const [rejectFeedbackText, setRejectFeedbackText] = useState('');
  const [adminActionError, setAdminActionError] = useState('');
  const [adminActionFeedback, setAdminActionFeedback] = useState('');

  // Load all admin console data on login / refresh
  const loadAllAdminData = async () => {
    setLoadingAdminApps(true);
    setLoadingAdminShops(true);
    setLoadingAdminLocRequests(true);

    try {
      const resApps = await adminFetchApplications();
      if (resApps.success) {
        setAdminApplications(resApps.applications);
        if (resApps.applications.length > 0) {
          setSelectedAdminApp(resApps.applications[0]);
        }
      }
    } catch (e) {}
    setLoadingAdminApps(false);

    try {
      const resBarbers = await adminFetchBarbers();
      if (resBarbers.success) {
        setAdminBarbersList(resBarbers.barbers);
        if (resBarbers.barbers.length > 0) {
          setSelectedAdminBarber(resBarbers.barbers[0]);
        }
      }
    } catch (e) {}
    setLoadingAdminShops(false);

    try {
      const resReqs = await adminFetchLocationRequests();
      if (resReqs.success) {
        setAdminLocRequests(resReqs.data);
        if (resReqs.data.length > 0) {
          setSelectedAdminLocRequest(resReqs.data[0]);
        }
      }
    } catch (e) {}
    setLoadingAdminLocRequests(false);
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadAllAdminData();
    }
  }, [currentUser]);

  // ONBOARDING HANDLERS
  const handleAdminApprove = async (appId: number) => {
    setAdminActionError('');
    setAdminActionFeedback('');
    const res = await adminApproveApplication(appId);
    if (res.success) {
      setAdminActionFeedback('Application approved and account created successfully!');
      showToast('Barber approved successfully!');
      const loadRes = await adminFetchApplications();
      if (loadRes.success) {
        setAdminApplications(loadRes.applications);
        const updated = loadRes.applications.find((a: any) => a.id === appId);
        if (updated) setSelectedAdminApp(updated);
      }
      // Reload active shops list too since one was just created
      const shopsRes = await adminFetchBarbers();
      if (shopsRes.success) setAdminBarbersList(shopsRes.barbers);
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
    setAdminEditMapsUrl(app.mapsUrl || '');
    setAdminEditChairsCount(app.chairsCount);
    setAdminEditOpeningTime(app.openingTime);
    setAdminEditClosingTime(app.closingTime);
    setAdminEditWorkingDays(app.workingDays ? app.workingDays.split(',') : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setAdminEditServices(app.services || []);
    setIsAdminEditing(true);
  };

  const handleSaveAdminEdit = async () => {
    if (!selectedAdminApp) return;
    if (!adminEditShopName.trim() || !adminEditOwnerName.trim() || !adminEditContactNumber.trim() || !adminEditLocation.trim()) {
      alert('Please fill in all shop details.');
      return;
    }

    const cleanedContact = adminEditContactNumber.trim().replace(/\D/g, '');
    if (cleanedContact.length !== 10) {
      alert('Contact number must be exactly 10 digits.');
      return;
    }

    if (!adminEditMapsUrl.trim()) {
      alert('Please provide a Google Maps URL.');
      return;
    }

    const isGoogleMaps = (url: string) => {
      const trimmed = url.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
      return /google\..*\/maps/i.test(trimmed) || 
             /maps\.app\.goo\.gl/i.test(trimmed) || 
             /goo\.gl\/maps/i.test(trimmed);
    };
    if (!isGoogleMaps(adminEditMapsUrl)) {
      alert('Please enter a valid Google Maps link.');
      return;
    }

    if (adminEditServices.length === 0) {
      alert('At least one service is required.');
      return;
    }

    let parsedLat = 23.2500;
    let parsedLon = 77.4100;
    const placeMatch = adminEditMapsUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (placeMatch) {
      parsedLat = parseFloat(placeMatch[1]);
      parsedLon = parseFloat(placeMatch[2]);
    } else {
      const coordMatch = adminEditMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                         adminEditMapsUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                         adminEditMapsUrl.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                         adminEditMapsUrl.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        parsedLat = parseFloat(coordMatch[1]);
        parsedLon = parseFloat(coordMatch[2]);
      }
    }

    const appData = {
      shopName: adminEditShopName,
      ownerName: adminEditOwnerName,
      contactNumber: adminEditContactNumber,
      location: adminEditLocation,
      mapsUrl: adminEditMapsUrl.trim(),
      lat: parsedLat,
      lon: parsedLon,
      chairsCount: adminEditChairsCount,
      openingTime: adminEditOpeningTime,
      closingTime: adminEditClosingTime,
      workingDays: adminEditWorkingDays.join(',')
    };

    const res = await adminEditApplication(selectedAdminApp.id, appData, adminEditServices);
    if (res.success) {
      setIsAdminEditing(false);
      showToast('Application updated successfully.');
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

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Admin Header Info */}
      <div className="gsap-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', padding: '16px', background: 'var(--accent-gold-glow)', borderRadius: '50%', color: 'var(--accent-gold)' }}>
            <Settings size={28} />
          </div>
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '8px' }}>System Administrator Console</span>
            <h1 style={{ fontSize: '2.2rem' }}>Welcome, {currentUser?.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Review and manage barber onboarding applications, active shops, and location relocation requests</p>
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

      {/* Admin Sub-Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-light)', marginBottom: '30px', paddingBottom: '2px' }}>
        {[
          { id: 'onboarding', label: 'Onboarding Queue', badge: adminApplications.filter(a => a.status === 'pending').length },
          { id: 'shops', label: 'Manage Shops', badge: adminBarbersList.length },
          { id: 'location_requests', label: 'Location Requests', badge: adminLocRequests.filter(r => r.status === 'pending').length }
        ].map(tab => {
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setAdminTab(tab.id as any);
                setIsAdminEditing(false);
                setIsAdminEditingBarber(false);
              }}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
                color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.25s ease'
              }}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  background: isActive ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                  color: isActive ? '#000' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      {adminTab === 'onboarding' && (
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
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Google Maps URL</label>
                    <input 
                      type="text" 
                      value={adminEditMapsUrl}
                      onChange={(e) => setAdminEditMapsUrl(e.target.value)}
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

                  <div style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Weekly Operating Days</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { day: 'Mon', label: 'Mon' },
                        { day: 'Tue', label: 'Tue' },
                        { day: 'Wed', label: 'Wed' },
                        { day: 'Thu', label: 'Thu' },
                        { day: 'Fri', label: 'Fri' },
                        { day: 'Sat', label: 'Sat' },
                        { day: 'Sun', label: 'Sun' },
                      ].map((d) => {
                        const isChecked = adminEditWorkingDays.includes(d.day);
                        return (
                          <label 
                            key={d.day} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '6px 10px', 
                              background: isChecked ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-tertiary)', 
                              border: isChecked ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              color: isChecked ? 'var(--accent-gold)' : 'var(--text-secondary)',
                              userSelect: 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  if (adminEditWorkingDays.length > 1) {
                                    setAdminEditWorkingDays(adminEditWorkingDays.filter(day => day !== d.day));
                                  } else {
                                    showToast('At least one operating day must be selected.');
                                  }
                                } else {
                                  setAdminEditWorkingDays([...adminEditWorkingDays, d.day]);
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                            {d.label}
                          </label>
                        );
                      })}
                    </div>
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
                        <span>{service.name} ({(service.durationMinutes || service.duration_minutes)} min) - <strong>₹{service.price}</strong> <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>({service.category})</span></span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAdminEditServices(adminEditServices.filter((_, i) => i !== index));
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-red)', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new service to edit application */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="New Service Name"
                      value={adminNewServiceName}
                      onChange={(e) => setAdminNewServiceName(e.target.value)}
                      style={{ flex: 2, minWidth: '150px', padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                    <input 
                      type="number" 
                      placeholder="Price"
                      value={adminNewServicePrice}
                      onChange={(e) => setAdminNewServicePrice(e.target.value)}
                      style={{ width: '80px', padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                    <input 
                      type="number" 
                      placeholder="Duration (Min)"
                      value={adminNewServiceDuration}
                      onChange={(e) => setAdminNewServiceDuration(e.target.value)}
                      style={{ width: '100px', padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                    <select
                      value={adminNewServiceCategory}
                      onChange={(e) => setAdminNewServiceCategory(e.target.value as any)}
                      style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    >
                      <option value="unisex">Unisex</option>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                    </select>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => {
                        if (!adminNewServiceName || !adminNewServicePrice || !adminNewServiceDuration) {
                          showToast('Please fill all service fields');
                          return;
                        }
                        setAdminEditServices([...adminEditServices, {
                          name: adminNewServiceName,
                          price: Number(adminNewServicePrice),
                          durationMinutes: Number(adminNewServiceDuration),
                          category: adminNewServiceCategory
                        }]);
                        setAdminNewServiceName('');
                        setAdminNewServicePrice('');
                        setAdminNewServiceDuration('');
                        setAdminNewServiceCategory('unisex');
                      }}
                    >
                      Add Service
                    </button>
                  </div>
                </div>

                <button 
                  type="button"
                  className="gold-glow-btn" 
                  style={{ justifyContent: 'center', padding: '12px 0', marginTop: '10px' }}
                  onClick={handleSaveAdminEdit}
                >
                  Save Changes
                </button>
              </div>
            ) : (
              /* DETAIL VIEW & ACTIONS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedAdminApp.shopName}</h2>
                    <p style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', marginTop: '4px' }}>Owner: {selectedAdminApp.ownerName}</p>
                  </div>
                  <span 
                    className={`badge ${
                      selectedAdminApp.status === 'approved' ? 'badge-green' : 
                      selectedAdminApp.status === 'rejected' ? 'badge-red' : 'badge-gold'
                    }`}
                    style={{ fontSize: '0.85rem', padding: '4px 10px', textTransform: 'capitalize' }}
                  >
                    {selectedAdminApp.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminApp.email}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Phone</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminApp.contactNumber}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capacity (Chairs)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminApp.chairsCount} Chairs</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours of Operation</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedAdminApp.openingTime} - {selectedAdminApp.closingTime}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weekly Operating Days</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminApp.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Geographic Coordinates</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminApp.lat?.toFixed(5)}, {selectedAdminApp.lon?.toFixed(5)}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Shop Location Address</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminApp.location}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Maps Link</span>
                    <a href={selectedAdminApp.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                      {selectedAdminApp.mapsUrl}
                    </a>
                  </div>
                </div>

                {/* Services and Pricing Display */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Offered Service Menu ({selectedAdminApp.services?.length || 0})</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {selectedAdminApp.services?.map((srv: any, idx: number) => (
                      <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>{srv.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duration: {srv.durationMinutes || srv.duration_minutes} mins</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>₹{srv.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Feedback Alert */}
                {adminActionFeedback && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.08)', color: 'var(--status-green)', border: '1px solid rgba(34, 197, 94, 0.15)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <CheckCircle size={16} />
                    <span>{adminActionFeedback}</span>
                  </div>
                )}

                {adminActionError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--status-red)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <AlertCircle size={16} />
                    <span>{adminActionError}</span>
                  </div>
                )}

                {/* Feedback displays */}
                {selectedAdminApp.rejectionFeedback && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                    <span style={{ color: 'var(--status-red)', fontWeight: 700, fontSize: '0.8rem', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Reason for Previous Rejection</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedAdminApp.rejectionFeedback}</p>
                  </div>
                )}

                {/* Actions block */}
                {selectedAdminApp.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                    <button 
                      type="button"
                      className="btn-danger" 
                      style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                      onClick={() => {
                        setRejectFeedbackText('');
                        setShowRejectFeedbackModal(true);
                      }}
                    >
                      <XCircle size={16} style={{ marginRight: '6px' }} /> Reject Submission
                    </button>
                    <button 
                      type="button"
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                      onClick={() => handleStartAdminEdit(selectedAdminApp)}
                    >
                      <Edit size={16} style={{ marginRight: '6px' }} /> Edit Details
                    </button>
                    <button 
                      type="button"
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
      )}

      {adminTab === 'shops' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }} className="admin-dashboard-layout">
          {/* Left Column: Shops List (Col-span-5) */}
          <div className="glass-card gsap-card" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', height: 'fit-content' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Approved Active Shops</h2>
            </div>
            {loadingAdminShops ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>Loading shops...</div>
            ) : adminBarbersList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>No active shops found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                {adminBarbersList.map((barber) => {
                  const isSelected = selectedAdminBarber && selectedAdminBarber.id === barber.id;
                  return (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setSelectedAdminBarber(barber);
                        setIsAdminEditingBarber(false);
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
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{barber.name}</span>
                        <span className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                          ★ {barber.rating}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lead: {barber.leadStylist}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Location: {barber.location}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detail / Edit View (Col-span-7) */}
          <div className="glass-card gsap-card" style={{ gridColumn: 'span 7', padding: '28px', height: 'fit-content' }}>
            {!selectedAdminBarber ? (
              <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
                <Building size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                <p>Select a shop from the list to view/edit details</p>
              </div>
            ) : isAdminEditingBarber ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)' }}>Edit Shop Details</h2>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setIsAdminEditingBarber(false)}>Cancel</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Shop/Salon Name</label>
                    <input 
                      type="text" 
                      value={adminEditBarberName}
                      onChange={(e) => setAdminEditBarberName(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Owner/Lead Barber</label>
                    <input 
                      type="text" 
                      value={adminEditBarberTitle}
                      onChange={(e) => setAdminEditBarberTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Specialty / Subtitle</label>
                    <input 
                      type="text" 
                      value={adminEditBarberSpecialty}
                      onChange={(e) => setAdminEditBarberSpecialty(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Opening Time</label>
                    <input 
                      type="text" 
                      value={adminEditBarberOpeningTime}
                      onChange={(e) => setAdminEditBarberOpeningTime(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Closing Time</label>
                    <input 
                      type="text" 
                      value={adminEditBarberClosingTime}
                      onChange={(e) => setAdminEditBarberClosingTime(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Google Maps URL</label>
                    <input 
                      type="text" 
                      value={adminEditBarberMapsUrl}
                      onChange={(e) => setAdminEditBarberMapsUrl(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Weekly Operating Days</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const isChecked = adminEditBarberWorkingDays.includes(day);
                        return (
                          <label 
                            key={day} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '6px 10px', 
                              background: isChecked ? 'rgba(212, 175, 55, 0.08)' : 'var(--bg-tertiary)', 
                              border: isChecked ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              color: isChecked ? 'var(--accent-gold)' : 'var(--text-secondary)',
                              userSelect: 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  if (adminEditBarberWorkingDays.length > 1) {
                                    setAdminEditBarberWorkingDays(adminEditBarberWorkingDays.filter(d => d !== day));
                                  } else {
                                    showToast('At least one operating day must be selected.');
                                  }
                                } else {
                                  setAdminEditBarberWorkingDays([...adminEditBarberWorkingDays, day]);
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                            {day}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="gold-glow-btn"
                  style={{ justifyContent: 'center', padding: '12px 0', width: '100%', marginTop: '20px' }}
                  onClick={async () => {
                    if (!adminEditBarberName || !adminEditBarberTitle || !adminEditBarberSpecialty || !adminEditBarberOpeningTime || !adminEditBarberClosingTime || !adminEditBarberMapsUrl.trim()) {
                      showToast('Please fill in all shop details.');
                      return;
                    }

                    const res = await adminEditBarber(selectedAdminBarber.id, {
                      name: adminEditBarberName,
                      title: adminEditBarberTitle,
                      specialty: adminEditBarberSpecialty,
                      openingTime: adminEditBarberOpeningTime,
                      closingTime: adminEditBarberClosingTime,
                      workingDays: adminEditBarberWorkingDays.join(','),
                      mapsUrl: adminEditBarberMapsUrl.trim()
                    });

                    if (res.success) {
                      showToast('Shop details updated successfully!');
                      setIsAdminEditingBarber(false);
                      const barbersRes = await adminFetchBarbers();
                      if (barbersRes.success) {
                        setAdminBarbersList(barbersRes.barbers);
                        const updated = barbersRes.barbers.find(b => b.id === selectedAdminBarber.id);
                        if (updated) setSelectedAdminBarber(updated);
                      }
                    } else {
                      showToast(res.message || 'Failed to update shop.');
                    }
                  }}
                >
                  Save Changes
                </button>
              </div>
            ) : (
              /* SHOP DETAIL PREVIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedAdminBarber.name}</h2>
                    <p style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', marginTop: '4px' }}>{selectedAdminBarber.title}</p>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.85rem' }}>
                    ★ {selectedAdminBarber.rating} ({selectedAdminBarber.reviewsCount} reviews)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specialty</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminBarber.specialty}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours of Operation</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedAdminBarber.openingTime || '09:00'} - {selectedAdminBarber.closingTime || '21:00'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Days</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminBarber.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinates</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminBarber.lat?.toFixed(4)}, {selectedAdminBarber.lon?.toFixed(4)}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Maps Link</span>
                    <a href={selectedAdminBarber.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                      {selectedAdminBarber.mapsUrl}
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '12px', justifyContent: 'center' }}
                  onClick={() => {
                    setAdminEditBarberName(selectedAdminBarber.name);
                    setAdminEditBarberTitle(selectedAdminBarber.title || '');
                    setAdminEditBarberSpecialty(selectedAdminBarber.specialty || '');
                    setAdminEditBarberOpeningTime(selectedAdminBarber.openingTime || '09:00');
                    setAdminEditBarberClosingTime(selectedAdminBarber.closingTime || '21:00');
                    setAdminEditBarberWorkingDays((selectedAdminBarber.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun').split(','));
                    setAdminEditBarberMapsUrl(selectedAdminBarber.mapsUrl || '');
                    setIsAdminEditingBarber(true);
                  }}
                >
                  Edit Shop Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {adminTab === 'location_requests' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }} className="admin-dashboard-layout">
          {/* Left Column: Location Requests List (Col-span-5) */}
          <div className="glass-card gsap-card" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', height: 'fit-content' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Location Requests Queue</h2>
            </div>
            {loadingAdminLocRequests ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>Loading requests...</div>
            ) : adminLocRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>No location requests pending.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                {adminLocRequests.map((request) => {
                  const isSelected = selectedAdminLocRequest && selectedAdminLocRequest.id === request.id;
                  return (
                    <div
                      key={request.id}
                      onClick={() => setSelectedAdminLocRequest(request)}
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
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{request.barberName}</span>
                        <span 
                          className={`badge ${
                            request.status === 'approved' ? 'badge-green' : 
                            request.status === 'rejected' ? 'badge-red' : 'badge-gold'
                          }`}
                          style={{ fontSize: '0.7rem', padding: '2px 6px', textTransform: 'capitalize' }}
                        >
                          {request.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Reason: {request.reason}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Submitted: {new Date(request.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detail View (Col-span-7) */}
          <div className="glass-card gsap-card" style={{ gridColumn: 'span 7', padding: '28px', height: 'fit-content' }}>
            {!selectedAdminLocRequest ? (
              <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
                <MapPin size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                <p>Select a location change request from the queue to view details</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Location Relocation Request</h2>
                    <p style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', marginTop: '4px' }}>{selectedAdminLocRequest.barberName}</p>
                  </div>
                  <span 
                    className={`badge ${
                      selectedAdminLocRequest.status === 'approved' ? 'badge-green' : 
                      selectedAdminLocRequest.status === 'rejected' ? 'badge-red' : 'badge-gold'
                    }`}
                    style={{ fontSize: '0.85rem', padding: '4px 10px', textTransform: 'capitalize' }}
                  >
                    {selectedAdminLocRequest.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason for Relocation</span>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      "{selectedAdminLocRequest.reason}"
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed Latitude</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminLocRequest.proposedLat}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed Longitude</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAdminLocRequest.proposedLon}</span>
                    </div>
                  </div>

                  {selectedAdminLocRequest.currentMapsUrl && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Google Maps Link</span>
                      <a href={selectedAdminLocRequest.currentMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                        {selectedAdminLocRequest.currentMapsUrl}
                      </a>
                    </div>
                  )}

                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proposed Google Maps Link</span>
                    <a href={selectedAdminLocRequest.proposedMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)', textDecoration: 'underline', fontWeight: 600, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                      {selectedAdminLocRequest.proposedMapsUrl}
                    </a>
                  </div>
                </div>

                {selectedAdminLocRequest.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button 
                      type="button"
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                      onClick={async () => {
                        const res = await adminRejectLocationRequest(selectedAdminLocRequest.id);
                        if (res.success) {
                          showToast('Location request rejected.');
                          const reqsRes = await adminFetchLocationRequests();
                          if (reqsRes.success) {
                            setAdminLocRequests(reqsRes.data);
                            const updated = reqsRes.data.find(r => r.id === selectedAdminLocRequest.id);
                            if (updated) setSelectedAdminLocRequest(updated);
                          }
                        } else {
                          showToast(res.message || 'Failed to reject location request.');
                        }
                      }}
                    >
                      <XCircle size={16} style={{ marginRight: '6px' }} /> Reject Request
                    </button>
                    <button 
                      type="button"
                      className="gold-glow-btn" 
                      style={{ flex: 1.5, padding: '12px', justifyContent: 'center' }}
                      onClick={async () => {
                        const res = await adminApproveLocationRequest(selectedAdminLocRequest.id);
                        if (res.success) {
                          showToast('Location request approved and updated!');
                          const reqsRes = await adminFetchLocationRequests();
                          if (reqsRes.success) {
                            setAdminLocRequests(reqsRes.data);
                            const updated = reqsRes.data.find(r => r.id === selectedAdminLocRequest.id);
                            if (updated) setSelectedAdminLocRequest(updated);
                          }
                          // Also refresh barbers list to show updated coords
                          const barbersRes = await adminFetchBarbers();
                          if (barbersRes.success) setAdminBarbersList(barbersRes.barbers);
                        } else {
                          showToast(res.message || 'Failed to approve location request.');
                        }
                      }}
                    >
                      <CheckCircle size={16} style={{ marginRight: '6px' }} /> Approve & Update Location
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECTION FEEDBACK MODAL */}
      {showRejectFeedbackModal && selectedAdminApp && (
        <div className="modal-backdrop animate-fade-in" style={{ zIndex: 1000 }} onClick={() => setShowRejectFeedbackModal(false)}>
          <div className="glass-card gsap-modal modal-content-centered" style={{ width: '90%', maxWidth: '500px', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-red)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Onboarding Rejection Feedback
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Please provide descriptive feedback on what parts of the onboarding profile or services of <strong>{selectedAdminApp.shopName}</strong> require adjustments. This feedback will be sent directly to the applicant.
            </p>
            <textarea
              value={rejectFeedbackText}
              onChange={(e) => setRejectFeedbackText(e.target.value)}
              placeholder="e.g. Please upload actual salon photos instead of placeholders and adjust pricing of Luxe Haircut..."
              rows={4}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', marginBottom: '20px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowRejectFeedbackModal(false)}>Cancel</button>
              <button type="button" className="btn-danger" style={{ padding: '8px 20px', fontSize: '0.85rem' }} onClick={handleAdminRejectSubmit}>Send Rejection Feedback</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
