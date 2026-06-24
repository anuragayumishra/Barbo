import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/db.js';
import http from 'http';
import https from 'https';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const formatDateLocal = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ==========================================
// GEOLOCATION MATH UTILS
// ==========================================
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // returns meters
};

const expandUrl = (shortUrl) => {
  return new Promise((resolve) => {
    if (!shortUrl || (!shortUrl.includes('maps.app.goo.gl') && !shortUrl.includes('goo.gl/maps'))) {
      resolve(shortUrl);
      return;
    }

    const client = shortUrl.startsWith('https') ? https : http;
    const requestWithTimeout = (url, depth = 0) => {
      if (depth > 5) {
        resolve(url);
        return;
      }

      try {
        const req = client.request(url, { method: 'HEAD' }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let nextUrl = res.headers.location;
            if (!nextUrl.startsWith('http')) {
              nextUrl = new URL(nextUrl, url).href;
            }
            requestWithTimeout(nextUrl, depth + 1);
          } else {
            resolve(url);
          }
        });
        
        req.on('error', (err) => {
          console.error("Error expanding short URL via HEAD, trying GET:", err);
          client.get(url, (getRes) => {
            if (getRes.statusCode >= 300 && getRes.statusCode < 400 && getRes.headers.location) {
              let nextUrl = getRes.headers.location;
              if (!nextUrl.startsWith('http')) {
                nextUrl = new URL(nextUrl, url).href;
              }
              requestWithTimeout(nextUrl, depth + 1);
            } else {
              resolve(url);
            }
          }).on('error', (getErr) => {
            console.error("GET expansion error:", getErr);
            resolve(url);
          });
        });

        req.setTimeout(3000, () => {
          req.destroy();
          resolve(url);
        });

        req.end();
      } catch (e) {
        console.error("Exception in expandUrl:", e);
        resolve(url);
      }
    };

    requestWithTimeout(shortUrl);
  });
};

const extractCoords = (url) => {
  let lat = null;
  let lon = null;
  
  // Try matching various formats
  // 1. !3dLat!4dLon (exact place coordinate in Google Maps URL data parameter)
  const placeMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (placeMatch) {
    lat = parseFloat(placeMatch[1]);
    lon = parseFloat(placeMatch[2]);
    return { lat, lon };
  }

  // 2. @Lat,Lon (viewport or place coordinate)
  // 3. q=Lat,Lon or query=Lat,Lon or ll=Lat,Lon
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                     url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                     url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                     url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    lat = parseFloat(coordMatch[1]);
    lon = parseFloat(coordMatch[2]);
  }
  return { lat, lon };
};


const resolveMapsUrlAndCoords = async (mapsUrl, currentLat, currentLon) => {
  let resolvedUrl = mapsUrl ? mapsUrl.trim() : '';
  let resolvedLat = currentLat;
  let resolvedLon = currentLon;

  if (resolvedUrl && (resolvedUrl.includes('maps.app.goo.gl') || resolvedUrl.includes('goo.gl/maps'))) {
    const expanded = await expandUrl(resolvedUrl);
    if (expanded && expanded !== resolvedUrl) {
      resolvedUrl = expanded;
      const coords = extractCoords(expanded);
      if (coords.lat !== null && coords.lon !== null) {
        resolvedLat = coords.lat;
        resolvedLon = coords.lon;
      }
    }
  }

  if (resolvedLat === undefined || resolvedLat === null || isNaN(resolvedLat) || resolvedLat === 23.2500) {
    const coords = extractCoords(resolvedUrl);
    if (coords.lat !== null && coords.lon !== null) {
      resolvedLat = coords.lat;
      resolvedLon = coords.lon;
    }
  }

  return {
    mapsUrl: resolvedUrl,
    lat: resolvedLat || 23.2500,
    lon: resolvedLon || 77.4100
  };
};

// ==========================================
// API REST ENDPOINTS
// ==========================================

// 1. Auth Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Use faizan@barbo.in or rajesh@barbo.in' });
    }

    const user = rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Hint: 123456' });
    }

    // Expose clean credentials structure
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        barberId: user.barber_id
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1.5. Auth Signup Route
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const userId = `cust-${Date.now()}`;
    await pool.query(
      'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, trimmedEmail, password, name.trim(), 'customer']
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: userId,
        email: trimmedEmail,
        name: name.trim(),
        role: 'customer',
        barberId: null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// 2. Services List Retriever
app.get('/api/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, description, price, duration_minutes as durationMinutes, barber_id as barberId, category FROM services');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// 3. Barbers List & Proximity Finder
app.get('/api/barbers', async (req, res) => {
  const { lat, lng } = req.query;

  try {
    const [barbersRows] = await pool.query('SELECT * FROM barbers');
    
    const formattedBarbers = await Promise.all(
      barbersRows.map(async (barber) => {
        // Fetch portfolio
        const [portfolio] = await pool.query('SELECT image_url FROM barber_portfolio WHERE barber_id = ?', [barber.id]);
        
        // Calculate distance dynamically if client coordinates are passed
        let dist = barber.distance_meters;
        let route = [
          { lat: Number(barber.lat), lng: Number(barber.lon) }
        ];

        if (lat && lng) {
          dist = calculateDistance(Number(lat), Number(lng), Number(barber.lat), Number(barber.lon));
          route = [
            { lat: Number(lat), lng: Number(lng) },
            { lat: Number(lat) + (Number(barber.lat) - Number(lat)) * 0.5, lng: Number(lng) },
            { lat: Number(barber.lat), lng: Number(lng) + (Number(barber.lon) - Number(lng)) * 0.5 },
            { lat: Number(barber.lat), lng: Number(barber.lon) }
          ];
        }

        return {
          id: barber.id,
          name: barber.name,
          title: barber.title,
          specialty: barber.specialty,
          rating: Number(barber.rating),
          reviewsCount: barber.reviews_count,
          imageUrl: barber.image_url,
          delayStatus: barber.delay_status,
          portfolioImages: portfolio.map(p => p.image_url),
          location: barber.location,
          mapsUrl: barber.maps_url,
          distanceMeters: dist,
          routeCoordinates: route,
          leadStylist: barber.lead_stylist,
          lat: Number(barber.lat),
          lon: Number(barber.lon),
          chairsCount: barber.chairs_count,
          openingTime: barber.opening_time || '09:00',
          closingTime: barber.closing_time || '21:00',
          workingDays: barber.working_days || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
        };
      })
    );

    // Sort by calculated proximity
    formattedBarbers.sort((a, b) => a.distanceMeters - b.distanceMeters);
    res.json(formattedBarbers);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Overpass API Real-world Salons Upserter/Sync
app.post('/api/barbers/sync', async (req, res) => {
  const { barbers } = req.body;
  if (!Array.isArray(barbers) || barbers.length === 0) {
    return res.status(400).json({ success: false, message: 'Barbers list is required' });
  }

  try {
    for (const barber of barbers) {
      await pool.query(
        `INSERT INTO barbers (id, name, title, specialty, rating, reviews_count, image_url, location, maps_url, distance_meters, lead_stylist, lat, lon, chairs_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name=VALUES(name), title=VALUES(title), specialty=VALUES(specialty), 
           rating=VALUES(rating), reviews_count=VALUES(reviews_count), 
           image_url=VALUES(image_url), location=VALUES(location), 
           distance_meters=VALUES(distance_meters), lat=VALUES(lat), lon=VALUES(lon),
           chairs_count=VALUES(chairs_count)`,
        [
          barber.id, barber.name, barber.title, barber.specialty, 
          barber.rating, barber.reviewsCount, barber.imageUrl, 
          barber.location, barber.mapsUrl, barber.distanceMeters, 
          barber.leadStylist, barber.lat, barber.lon, barber.chairsCount || 2
        ]
      );

      // Refresh portfolio images
      await pool.query('DELETE FROM barber_portfolio WHERE barber_id = ?', [barber.id]);
      if (Array.isArray(barber.portfolioImages)) {
        for (const url of barber.portfolioImages) {
          await pool.query('INSERT INTO barber_portfolio (barber_id, image_url) VALUES (?, ?)', [barber.id, url]);
        }
      }
    }
    res.json({ success: true, message: 'Sync complete' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Appointments Retriever Route
app.get('/api/appointments', async (req, res) => {
  const { userId, role } = req.query;
  if (!userId || !role) {
    return res.status(400).json({ success: false, message: 'userId and role are required' });
  }

  try {
    let query = '';
    let queryParam = userId;

    if (role === 'customer') {
      query = 'SELECT * FROM appointments WHERE customer_id = ? ORDER BY date DESC, start_time DESC';
    } else {
      const [userRows] = await pool.query('SELECT barber_id FROM users WHERE id = ?', [userId]);
      if (userRows.length > 0 && userRows[0].barber_id) {
        queryParam = userRows[0].barber_id;
      }
      query = 'SELECT * FROM appointments WHERE barber_id = ? ORDER BY date DESC, start_time DESC';
    }

    const [appointments] = await pool.query(query, [queryParam]);
    
    const detailedAppointments = await Promise.all(
      appointments.map(async (app) => {
        // Fetch service objects
        const [servicesRows] = await pool.query(
          `SELECT s.* FROM services s 
           INNER JOIN appointment_services aserv ON s.id = aserv.service_id 
           WHERE aserv.appointment_id = ?`,
          [app.id]
        );

        // Fetch notifications list
        const [notifsRows] = await pool.query(
          'SELECT message FROM appointment_notifications WHERE appointment_id = ? ORDER BY created_at ASC',
          [app.id]
        );

        // Check if appointment is reviewed
        const [reviewRows] = await pool.query(
          'SELECT id FROM reviews WHERE appointment_id = ?',
          [app.id]
        );
        const reviewed = reviewRows.length > 0;

        // Clean time format (HH:MM)
        const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

        return {
          id: app.id,
          customerId: app.customer_id,
          customerName: app.customer_name,
          barberId: app.barber_id,
          barberName: app.barber_name,
          date: formatDateLocal(app.date),
          startTime: formatTime(app.start_time),
          endTime: formatTime(app.end_time),
          services: servicesRows,
          totalPrice: app.total_price,
          totalDuration: app.total_duration,
          status: app.status,
          paymentMethod: app.payment_method,
          paymentStatus: app.payment_status,
          travelOtp: app.travel_otp,
          userLat: Number(app.user_lat),
          userLon: Number(app.user_lon),
          barberLat: Number(app.barber_lat),
          barberLon: Number(app.barber_lon),
          travelLat: Number(app.travel_lat),
          travelLon: Number(app.travel_lon),
          travelEta: app.travel_eta,
          travelDistance: app.travel_distance,
          travelStatus: app.travel_status,
          travelSimProgress: app.travel_sim_progress,
          travelRouteCoordinates: app.travel_route_coordinates ? JSON.parse(app.travel_route_coordinates) : null,
          notifications: notifsRows.map(n => n.message),
          reviewed: reviewed
        };
      })
    );

    res.json(detailedAppointments);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Book Appointment Route
app.post('/api/appointments', async (req, res) => {
  const { customerId, customerName, barberId, date, startTime, serviceIds, paymentMethod, paymentStatus } = req.body;
  if (!customerId || !barberId || !date || !startTime || !Array.isArray(serviceIds)) {
    return res.status(400).json({ success: false, message: 'Invalid booking payload' });
  }

  try {
    // Validate that the slot is at least 30 minutes in the future
    const [yVal, mVal, dVal] = date.split('-').map(Number);
    const [hVal, minVal] = startTime.split(':').map(Number);
    const bookedTime = new Date(yVal, mVal - 1, dVal, hVal, minVal, 0);
    const now = new Date();
    if (bookedTime.getTime() - now.getTime() < 30 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'New bookings must be scheduled at least 30 minutes in advance.'
      });
    }

    // 1. Fetch services to sum prices/durations
    const [servicesRows] = await pool.query('SELECT * FROM services WHERE id IN (?)', [serviceIds]);
    if (servicesRows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid services selected' });
    }

    const totalPrice = servicesRows.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = servicesRows.reduce((sum, s) => sum + s.duration_minutes, 0);

    // Calculate end time
    const [startHour, startMin] = startTime.split(':').map(Number);
    let endHour = startHour;
    let endMin = startMin + totalDuration;
    if (endMin >= 60) {
      endHour += Math.floor(endMin / 60);
      endMin = endMin % 60;
    }
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    // 2. Fetch barber coordinates
    const [barberRows] = await pool.query('SELECT * FROM barbers WHERE id = ?', [barberId]);
        if (barberRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }
    const barber = barberRows[0];

    // 3. Capacity scheduling checking (multi-chair capacity)
    const startNum = startHour * 60 + startMin;
    const endNum = endHour * 60 + endMin;
    const capacity = barber.chairs_count || 2;

    const [existingApps] = await pool.query(
      "SELECT start_time, end_time FROM appointments WHERE barber_id = ? AND date = ? AND status IN ('upcoming', 'in_progress')",
      [barberId, date]
    );

    let hasConflict = false;
    for (let t = startNum; t < endNum; t++) {
      let activeCount = 0;
      for (const app of existingApps) {
        const [appSH, appSM] = app.start_time.split(':').map(Number);
        const [appEH, appEM] = app.end_time.split(':').map(Number);
        const appStart = appSH * 60 + appSM;
        const appEnd = appEH * 60 + appEM;

        if (t >= appStart && t < appEnd) {
          activeCount++;
        }
      }
      if (activeCount >= capacity) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      return res.status(409).json({ success: false, message: 'Time slot collision detected! The salon is at full capacity.' });
    }

    // 4. Generate travel OTP securely
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // 5. Setup default Bhopal coords if customer GPS is omitted
    const defaultUserLat = 23.2495;
    const defaultUserLon = 77.4172;
    const initialRoute = [
      { lat: defaultUserLat, lng: defaultUserLon },
      { lat: Number(barber.lat), lng: Number(barber.lon) }
    ];

    const appointmentId = `a-${Date.now()}`;

    // 6. Insert new appointment
    await pool.query(
      `INSERT INTO appointments (
        id, customer_id, customer_name, barber_id, barber_name, date, start_time, end_time, 
        total_price, total_duration, status, payment_method, payment_status, travel_otp, user_lat, user_lon, 
        barber_lat, barber_lon, travel_lat, travel_lon, travel_eta, travel_distance, 
        travel_status, travel_sim_progress, travel_route_coordinates
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Preparing Departure...', 0, ?)`,
      [
        appointmentId, customerId, customerName, barberId, barber.name, date, startTime, endTime,
        totalPrice, totalDuration, paymentMethod || 'Pay At Shop', paymentStatus || 'unpaid', randomOtp, defaultUserLat, defaultUserLon,
        barber.lat, barber.lon, defaultUserLat, defaultUserLon, 
        Math.max(2, Math.round(barber.distance_meters / 150)), barber.distance_meters,
        JSON.stringify(initialRoute)
      ]
    );

    // 7. Insert mapping rows into appointment_services
    for (const serviceId of serviceIds) {
      await pool.query('INSERT INTO appointment_services (appointment_id, service_id) VALUES (?, ?)', [appointmentId, serviceId]);
    }

    res.json({
      success: true,
      appointment: {
        id: appointmentId,
        customerId,
        customerName,
        barberId,
        barberName: barber.name,
        date,
        startTime,
        endTime,
        services: servicesRows,
        totalPrice,
        totalDuration,
        status: 'upcoming',
        paymentMethod: paymentMethod || 'Pay At Shop',
        paymentStatus: paymentStatus || 'unpaid',
        travelOtp: randomOtp,
        userLat: defaultUserLat,
        userLon: defaultUserLon,
        barberLat: Number(barber.lat),
        barberLon: Number(barber.lon),
        travelLat: defaultUserLat,
        travelLon: defaultUserLon,
        travelEta: Math.max(2, Math.round(barber.distance_meters / 150)),
        travelDistance: barber.distance_meters,
        travelStatus: 'Preparing Departure...',
        travelSimProgress: 0,
        travelRouteCoordinates: initialRoute,
        notifications: []
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6b. Reschedule Appointment Route (Allowed up to 1 hour before scheduled start time)
app.post('/api/appointments/:id/reschedule', async (req, res) => {
  const { id } = req.params;
  const { date, startTime, serviceIds } = req.body;

  if (!date || !startTime) {
    return res.status(400).json({ success: false, message: 'date and startTime are required' });
  }

  try {
    // 1. Fetch appointment
    const [appRows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [id]);
    if (appRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const appointment = appRows[0];

    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: `Cannot reschedule. Appointment is already ${appointment.status}.` });
    }

    // 2. Validate new scheduled time is not in the past
    const [newY, newM, newD] = date.split('-').map(Number);
    const [newH, newMin] = startTime.split(':').map(Number);
    const newScheduledTime = new Date(newY, newM - 1, newD, newH, newMin, 0);
    const now = new Date();
    if (newScheduledTime.getTime() <= now.getTime()) {
      return res.status(400).json({ success: false, message: 'Cannot reschedule to a past date or time.' });
    }

    // 3. Validate reschedule window (30 mins if date/time changed, 5 mins if only services changed)
    const isDateTimeChanged = formatDateLocal(appointment.date) !== date || appointment.start_time.substring(0, 5) !== startTime;
    const cutoffMinutes = isDateTimeChanged ? 30 : 5;

    const [yVal, mVal, dVal] = formatDateLocal(appointment.date).split('-').map(Number);
    const [hours, minutes] = appointment.start_time.split(':').map(Number);
    const scheduledTime = new Date(yVal, mVal - 1, dVal, hours, minutes, 0);
    const timeDiffMinutes = (scheduledTime - now) / (60 * 1000);

    if (timeDiffMinutes < cutoffMinutes) {
      return res.status(400).json({
        success: false,
        message: `Rescheduling is only allowed at least ${cutoffMinutes} minutes before the scheduled start time.`
      });
    }

    // 4. Determine final service IDs (from body or fall back to existing)
    let finalServiceIds = serviceIds;
    if (!Array.isArray(finalServiceIds) || finalServiceIds.length === 0) {
      const [existingAserv] = await pool.query(
        'SELECT service_id FROM appointment_services WHERE appointment_id = ?',
        [id]
      );
      finalServiceIds = existingAserv.map(r => r.service_id);
    }

    if (finalServiceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one service must be selected.' });
    }

    // Fetch services details
    const [servicesRows] = await pool.query('SELECT * FROM services WHERE id IN (?)', [finalServiceIds]);
    if (servicesRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid services selected.' });
    }

    const totalPrice = servicesRows.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = servicesRows.reduce((sum, s) => sum + s.duration_minutes, 0);

    // Calculate end time
    const [startHour, startMin] = startTime.split(':').map(Number);
    let endHour = startHour;
    let endMin = startMin + totalDuration;
    if (endMin >= 60) {
      endHour += Math.floor(endMin / 60);
      endMin = endMin % 60;
    }
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    // 5. Fetch barber coordinates & capacity
    const [barberRows] = await pool.query('SELECT * FROM barbers WHERE id = ?', [appointment.barber_id]);
    const barber = barberRows[0];

    // 6. Capacity checking (overlapping slot availability)
    const startNum = startHour * 60 + startMin;
    const endNum = endHour * 60 + endMin;
    const capacity = barber.chairs_count || 2;

    const [existingApps] = await pool.query(
      "SELECT start_time, end_time FROM appointments WHERE barber_id = ? AND date = ? AND status IN ('upcoming', 'in_progress') AND id != ?",
      [appointment.barber_id, date, id]
    );

    let hasConflict = false;
    for (let t = startNum; t < endNum; t++) {
      let activeCount = 0;
      for (const app of existingApps) {
        const [appSH, appSM] = app.start_time.split(':').map(Number);
        const [appEH, appEM] = app.end_time.split(':').map(Number);
        const appStart = appSH * 60 + appSM;
        const appEnd = appEH * 60 + appEM;

        if (t >= appStart && t < appEnd) {
          activeCount++;
        }
      }
      if (activeCount >= capacity) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      return res.status(409).json({ success: false, message: 'Time slot collision detected! The salon is at full capacity at the selected time.' });
    }

    // 7. Update appointment in DB
    await pool.query(
      `UPDATE appointments 
       SET date = ?, start_time = ?, end_time = ?, total_price = ?, total_duration = ?, travel_sim_progress = 0, travel_status = 'Preparing Departure...'
       WHERE id = ?`,
      [date, startTime, endTime, totalPrice, totalDuration, id]
    );

    // Update appointment services mapping
    await pool.query('DELETE FROM appointment_services WHERE appointment_id = ?', [id]);
    for (const serviceId of finalServiceIds) {
      await pool.query('INSERT INTO appointment_services (appointment_id, service_id) VALUES (?, ?)', [id, serviceId]);
    }

    // Refresh notifications list: add rescheduling notification
    await pool.query('DELETE FROM appointment_notifications WHERE appointment_id = ?', [id]);
    await pool.query(
      "INSERT INTO appointment_notifications (appointment_id, message) VALUES (?, ?)",
      [id, `Rescheduled to ${date} at ${startTime}`]
    );

    // Fetch updated appointment
    const [updatedRows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [id]);
    const app = updatedRows[0];

    const cleanTime = (t) => t.substring(0, 5);

    res.json({
      success: true,
      message: 'Appointment successfully rescheduled!',
      appointment: {
        id: app.id,
        customerId: app.customer_id,
        customerName: app.customer_name,
        barberId: app.barber_id,
        barberName: app.barber_name,
        date: formatDateLocal(app.date),
        startTime: cleanTime(app.start_time),
        endTime: cleanTime(app.end_time),
        services: servicesRows,
        totalPrice: app.total_price,
        totalDuration: app.total_duration,
        status: app.status,
        paymentMethod: app.payment_method,
        paymentStatus: app.payment_status,
        travelOtp: app.travel_otp,
        userLat: Number(app.user_lat),
        userLon: Number(app.user_lon),
        barberLat: Number(app.barber_lat),
        barberLon: Number(app.barber_lon),
        travelLat: Number(app.travel_lat),
        travelLon: Number(app.travel_lon),
        travelEta: app.travel_eta,
        travelDistance: app.travel_distance,
        travelStatus: app.travel_status,
        travelSimProgress: app.travel_sim_progress,
        travelRouteCoordinates: app.travel_route_coordinates ? JSON.parse(app.travel_route_coordinates) : null,
        notifications: [`Rescheduled to ${date} at ${startTime}`]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Patch Telemetry Simulator Route
app.patch('/api/appointments/:id/telemetry', async (req, res) => {
  const { id } = req.params;
  const { 
    travelLat, 
    travelLon, 
    travelEta, 
    travelDistance, 
    travelStatus, 
    travelSimProgress, 
    travelRouteCoordinates,
    notification,
    status
  } = req.body;

  try {
    const updates = [];
    const params = [];

    if (travelLat !== undefined) { updates.push('travel_lat = ?'); params.push(travelLat); }
    if (travelLon !== undefined) { updates.push('travel_lon = ?'); params.push(travelLon); }
    if (travelEta !== undefined) { updates.push('travel_eta = ?'); params.push(travelEta); }
    if (travelDistance !== undefined) { updates.push('travel_distance = ?'); params.push(travelDistance); }
    if (travelStatus !== undefined) { updates.push('travel_status = ?'); params.push(travelStatus); }
    if (travelSimProgress !== undefined) { updates.push('travel_sim_progress = ?'); params.push(travelSimProgress); }
    if (travelRouteCoordinates !== undefined) { updates.push('travel_route_coordinates = ?'); params.push(JSON.stringify(travelRouteCoordinates)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (status === 'cancelled') {
      const [appRows] = await pool.query('SELECT total_price, payment_status FROM appointments WHERE id = ?', [id]);
      if (appRows.length > 0 && appRows[0].payment_status === 'paid') {
        updates.push('payment_status = ?');
        params.push('refunded');
        await pool.query('INSERT INTO appointment_notifications (appointment_id, message) VALUES (?, ?)', [id, `Refund of ₹${appRows[0].total_price} initiated to your original payment method.`]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Insert alert into notifications stream if sent
    if (notification) {
      await pool.query('INSERT INTO appointment_notifications (appointment_id, message) VALUES (?, ?)', [id, notification]);
    }

    res.json({ success: true, message: 'Telemetry successfully updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Secure OTP Start Handshake Route (Verify OTP and start service)
app.post('/api/appointments/:id/start', async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP is required' });
  }

  try {
    const [rows] = await pool.query('SELECT date, start_time, travel_otp, status FROM appointments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const appointment = rows[0];
    if (appointment.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: `Cannot start service. Appointment is already ${appointment.status}.` });
    }
    
    if (appointment.travel_otp !== otp) {
      return res.status(400).json({ success: false, message: 'OTP verification failed! Invalid check-in code.' });
    }

    // Check if slot has fully passed
    const [yVal, mVal, dVal] = appointment.date.split('-').map(Number);
    const [endHours, endMinutes] = appointment.end_time.split(':').map(Number);
    const slotEndTime = new Date(yVal, mVal - 1, dVal, endHours, endMinutes, 0);
    const now = new Date();

    if (now.getTime() > slotEndTime.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'This booking slot has already passed and the OTP is expired.'
      });
    }

    // Validate that check-in is within +/- 30 minutes of scheduled start time
    const [hours, minutes] = appointment.start_time.split(':').map(Number);
    const scheduledTime = new Date(yVal, mVal - 1, dVal, hours, minutes, 0);
    const diffMinutes = Math.abs(now.getTime() - scheduledTime.getTime()) / (60 * 1000);

    if (diffMinutes > 30) {
      return res.status(400).json({
        success: false,
        message: `Check-in is only allowed within 30 minutes before or after your scheduled start time (${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}). Please try again closer to your appointment time.`
      });
    }

    // Start appointment status
    await pool.query("UPDATE appointments SET status = 'in_progress' WHERE id = ?", [id]);
    
    // Add start notification
    await pool.query("INSERT INTO appointment_notifications (appointment_id, message) VALUES (?, 'OTP Verified. Service started successfully!')", [id]);

    res.json({ success: true, message: 'OTP verified. Service started successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8b. Complete Service Route (No OTP required, initiated by barber)
app.post('/api/appointments/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT status FROM appointments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const appointment = rows[0];
    if (appointment.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: `Cannot complete service. Appointment status is ${appointment.status}.` });
    }

    // Complete appointment status
    await pool.query("UPDATE appointments SET status = 'completed' WHERE id = ?", [id]);
    
    // Add completion alert
    await pool.query("INSERT INTO appointment_notifications (appointment_id, message) VALUES (?, 'Service completed by barber.')", [id]);

    res.json({ success: true, message: 'Service marked completed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Submit Review & Update Barber Rating Route
app.post('/api/reviews', async (req, res) => {
  const { appointmentId, barberId, customerId, rating, comment } = req.body;

  if (!appointmentId || !barberId || !customerId || !rating) {
    return res.status(400).json({ success: false, message: 'appointmentId, barberId, customerId, and rating are required' });
  }

  const numericRating = Number(rating);
  if (numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify appointment is completed
    const [appRows] = await conn.query('SELECT status FROM appointments WHERE id = ?', [appointmentId]);
    if (appRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appRows[0].status !== 'completed') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cannot review an uncompleted appointment.' });
    }

    // 2. Check if already reviewed
    const [existingReviews] = await conn.query('SELECT id FROM reviews WHERE appointment_id = ?', [appointmentId]);
    if (existingReviews.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Appointment has already been reviewed.' });
    }

    // 3. Insert review
    await conn.query(
      'INSERT INTO reviews (appointment_id, barber_id, customer_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [appointmentId, barberId, customerId, numericRating, comment || null]
    );

    // 4. Update barber rating & reviews_count (running average)
    const [barberRows] = await conn.query('SELECT reviews_count, rating FROM barbers WHERE id = ?', [barberId]);
    if (barberRows.length > 0) {
      const b = barberRows[0];
      const originalCount = b.reviews_count;
      const originalRating = Number(b.rating);
      
      const newCount = originalCount + 1;
      const newRating = ((originalRating * originalCount) + numericRating) / newCount;
      const roundedRating = Math.round(newRating * 10) / 10;

      await conn.query(
        'UPDATE barbers SET rating = ?, reviews_count = ? WHERE id = ?',
        [roundedRating, newCount, barberId]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Review submitted successfully!' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// 9. Patch Barber Delay status
app.patch('/api/barbers/:id/delay', async (req, res) => {
  const { id } = req.params;
  const { delayStatus } = req.body;

  if (!delayStatus) {
    return res.status(400).json({ success: false, message: 'delayStatus is required' });
  }

  try {
    await pool.query('UPDATE barbers SET delay_status = ? WHERE id = ?', [delayStatus, id]);
    res.json({ success: true, message: 'Delay updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9.05 Update Barber Settings (operating hours, days off, and map URL)
app.put('/api/barbers/:id/settings', async (req, res) => {
  const { id } = req.params;
  const { openingTime, closingTime, workingDays, mapsUrl, lat, lon } = req.body;

  if (!openingTime || !closingTime || !workingDays || !mapsUrl) {
    return res.status(400).json({ success: false, message: 'openingTime, closingTime, workingDays, and mapsUrl are required' });
  }

  // Validate Google Maps URL format
  const isGoogleMaps = (url) => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return false;
    }
    return /google\..*\/maps/i.test(trimmed) || 
           /maps\.app\.goo\.gl/i.test(trimmed) || 
           /goo\.gl\/maps/i.test(trimmed);
  };
  if (!isGoogleMaps(mapsUrl)) {
    return res.status(400).json({ success: false, message: 'Invalid Google Maps URL link' });
  }

  try {
    const resolved = await resolveMapsUrlAndCoords(mapsUrl, lat, lon);

    const [result] = await pool.query(
      `UPDATE barbers 
       SET opening_time = ?, closing_time = ?, working_days = ?, maps_url = ?, lat = ?, lon = ? 
       WHERE id = ?`,
      [
        openingTime,
        closingTime,
        workingDays,
        resolved.mapsUrl,
        Number(resolved.lat),
        Number(resolved.lon),
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Barber profile not found' });
    }

    res.json({ success: true, message: 'Shop settings updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9.1 Barber service management: Add Service
app.post('/api/barbers/:barberId/services', async (req, res) => {
  const { barberId } = req.params;
  const { name, price, durationMinutes, category } = req.body;

  if (!name || price === undefined || durationMinutes === undefined) {
    return res.status(400).json({ success: false, message: 'Service name, price, and duration are required' });
  }

  const finalCategory = category || 'unisex';

  try {
    const serviceId = `s-${barberId}-${Date.now()}`;
    await pool.query(
      `INSERT INTO services (id, name, description, price, duration_minutes, barber_id, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        serviceId,
        name.trim(),
        `Premium ${name.trim()} service custom tailored for you.`,
        Number(price),
        Number(durationMinutes),
        barberId,
        finalCategory
      ]
    );
    res.status(201).json({
      success: true,
      message: 'Service added successfully!',
      service: {
        id: serviceId,
        name: name.trim(),
        description: `Premium ${name.trim()} service custom tailored for you.`,
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        barberId,
        category: finalCategory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9.2 Barber service management: Update Service
app.put('/api/barbers/:barberId/services/:serviceId', async (req, res) => {
  const { barberId, serviceId } = req.params;
  const { name, price, durationMinutes, category } = req.body;

  if (!name || price === undefined || durationMinutes === undefined) {
    return res.status(400).json({ success: false, message: 'Service name, price, and duration are required' });
  }

  try {
    await pool.query(
      `UPDATE services 
       SET name = ?, price = ?, duration_minutes = ?, category = ? 
       WHERE id = ? AND barber_id = ?`,
      [name.trim(), Number(price), Number(durationMinutes), category || 'unisex', serviceId, barberId]
    );
    res.json({ success: true, message: 'Service updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9.3 Barber service management: Delete Service
app.delete('/api/barbers/:barberId/services/:serviceId', async (req, res) => {
  const { barberId, serviceId } = req.params;

  try {
    await pool.query(
      'DELETE FROM services WHERE id = ? AND barber_id = ?',
      [serviceId, barberId]
    );
    res.json({ success: true, message: 'Service deleted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// BARBER ONBOARDING & ADMIN PORTAL ROUTES
// ==========================================

// Onboarding 1: Apply / Resubmit Application
app.post('/api/onboarding/apply', async (req, res) => {
  const {
    shopName,
    ownerName,
    email,
    contactNumber,
    location,
    mapsUrl,
    lat,
    lon,
    chairsCount,
    openingTime,
    closingTime,
    workingDays,
    services
  } = req.body;

  if (
    !shopName || !ownerName || !email || !contactNumber || !location ||
    !mapsUrl || chairsCount === undefined ||
    !openingTime || !closingTime || !Array.isArray(services) || services.length === 0
  ) {
    return res.status(400).json({ success: false, message: 'All shop details, Google Maps URL, and at least one service are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Invalid email address format' });
  }

  // Validate contact number (exactly 10 digits after stripping non-numeric characters)
  const cleanedContact = contactNumber.trim().replace(/\D/g, '');
  if (cleanedContact.length !== 10) {
    return res.status(400).json({ success: false, message: 'Contact number must be exactly 10 digits (e.g. 9876543210)' });
  }

  // Validate Google Maps URL format
  const isGoogleMaps = (url) => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return false;
    }
    return /google\..*\/maps/i.test(trimmed) || 
           /maps\.app\.goo\.gl/i.test(trimmed) || 
           /goo\.gl\/maps/i.test(trimmed);
  };
  if (!isGoogleMaps(mapsUrl)) {
    return res.status(400).json({ success: false, message: 'Invalid Google Maps URL link' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const conn = await pool.getConnection();

  try {
    const resolved = await resolveMapsUrlAndCoords(mapsUrl, lat, lon);

    await conn.beginTransaction();

    // Check if there is an existing application
    const [existing] = await conn.query('SELECT id, status FROM barber_applications WHERE email = ?', [trimmedEmail]);

    let applicationId;

    if (existing.length > 0) {
      const app = existing[0];
      if (app.status === 'approved') {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'An application with this email has already been approved' });
      }

      applicationId = app.id;
      // Update existing application
      await conn.query(
        `UPDATE barber_applications 
         SET shop_name = ?, owner_name = ?, contact_number = ?, location = ?, maps_url = ?, 
             lat = ?, lon = ?, chairs_count = ?, opening_time = ?, closing_time = ?, working_days = ?,
             status = 'pending', rejection_feedback = NULL 
         WHERE id = ?`,
        [
          shopName.trim(), ownerName.trim(), contactNumber.trim(), location.trim(), resolved.mapsUrl,
          Number(resolved.lat), Number(resolved.lon), Number(chairsCount), openingTime, closingTime,
          workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
          applicationId
        ]
      );

      // Clear existing services
      await conn.query('DELETE FROM application_services WHERE application_id = ?', [applicationId]);
    } else {
      // Create new application
      const [insertResult] = await conn.query(
        `INSERT INTO barber_applications 
         (shop_name, owner_name, email, contact_number, location, maps_url, lat, lon, chairs_count, opening_time, closing_time, working_days, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          shopName.trim(), ownerName.trim(), trimmedEmail, contactNumber.trim(), location.trim(), resolved.mapsUrl,
          Number(resolved.lat), Number(resolved.lon), Number(chairsCount), openingTime, closingTime,
          workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
        ]
      );
      applicationId = insertResult.insertId;
    }

    // Insert new services
    for (const service of services) {
      if (!service.name || service.price === undefined || service.durationMinutes === undefined) {
        throw new Error('Invalid service data: name, price, and durationMinutes are required');
      }
      await conn.query(
        `INSERT INTO application_services (application_id, name, price, duration_minutes, category) 
         VALUES (?, ?, ?, ?, ?)`,
        [applicationId, service.name.trim(), Number(service.price), Number(service.durationMinutes), service.category || 'unisex']
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Application submitted successfully!', applicationId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Onboarding 2: Check Status
app.get('/api/onboarding/status/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email parameter is required' });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const [apps] = await pool.query('SELECT * FROM barber_applications WHERE email = ?', [trimmedEmail]);

    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: 'No application found with this email' });
    }

    const app = apps[0];
    const [services] = await pool.query(
      'SELECT name, price, duration_minutes as durationMinutes, category FROM application_services WHERE application_id = ?',
      [app.id]
    );

    res.json({
      success: true,
      application: {
        id: app.id,
        shopName: app.shop_name,
        ownerName: app.owner_name,
        email: app.email,
        contactNumber: app.contact_number,
        location: app.location,
        mapsUrl: app.maps_url,
        lat: Number(app.lat),
        lon: Number(app.lon),
        chairsCount: app.chairs_count,
        openingTime: app.opening_time,
        closingTime: app.closing_time,
        workingDays: app.working_days,
        status: app.status,
        rejectionFeedback: app.rejection_feedback,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        services
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin 1: Fetch All Applications
app.get('/api/admin/applications', async (req, res) => {
  try {
    const [apps] = await pool.query('SELECT * FROM barber_applications ORDER BY created_at DESC');
    
    const formattedApps = await Promise.all(
      apps.map(async (app) => {
        const [services] = await pool.query(
          'SELECT name, price, duration_minutes as durationMinutes, category FROM application_services WHERE application_id = ?',
          [app.id]
        );
        return {
          id: app.id,
          shopName: app.shop_name,
          ownerName: app.owner_name,
          email: app.email,
          contactNumber: app.contact_number,
          location: app.location,
          mapsUrl: app.maps_url,
          lat: Number(app.lat),
          lon: Number(app.lon),
          chairsCount: app.chairs_count,
          openingTime: app.opening_time,
          closingTime: app.closing_time,
          workingDays: app.working_days,
          status: app.status,
          rejectionFeedback: app.rejection_feedback,
          createdAt: app.created_at,
          updatedAt: app.updated_at,
          services
        };
      })
    );

    res.json({ success: true, applications: formattedApps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin 2: Edit Application Details (Inline Edit)
app.put('/api/admin/applications/:id', async (req, res) => {
  const { id } = req.params;
  const {
    shopName,
    ownerName,
    contactNumber,
    location,
    mapsUrl,
    lat,
    lon,
    chairsCount,
    openingTime,
    closingTime,
    workingDays,
    services
  } = req.body;

  if (
    !shopName || !ownerName || !contactNumber || !location || !mapsUrl ||
    chairsCount === undefined ||
    !openingTime || !closingTime || !Array.isArray(services) || services.length === 0
  ) {
    return res.status(400).json({ success: false, message: 'All shop details, Google Maps URL, and services are required for update' });
  }

  const conn = await pool.getConnection();

  try {
    const resolved = await resolveMapsUrlAndCoords(mapsUrl, lat, lon);

    await conn.beginTransaction();

    // Verify application exists and is not approved
    const [appCheck] = await conn.query('SELECT status FROM barber_applications WHERE id = ?', [id]);
    if (appCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (appCheck[0].status === 'approved') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cannot edit an already approved application' });
    }

    // Update application
    await conn.query(
      `UPDATE barber_applications 
       SET shop_name = ?, owner_name = ?, contact_number = ?, location = ?, maps_url = ?, 
           lat = ?, lon = ?, chairs_count = ?, opening_time = ?, closing_time = ?, working_days = ? 
       WHERE id = ?`,
      [
        shopName.trim(), ownerName.trim(), contactNumber.trim(), location.trim(), resolved.mapsUrl,
        Number(resolved.lat), Number(resolved.lon), Number(chairsCount), openingTime, closingTime,
        workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        id
      ]
    );

    // Delete existing services
    await conn.query('DELETE FROM application_services WHERE application_id = ?', [id]);

    // Insert updated services
    for (const service of services) {
      if (!service.name || service.price === undefined || service.durationMinutes === undefined) {
        throw new Error('Invalid service data');
      }
      await conn.query(
        `INSERT INTO application_services (application_id, name, price, duration_minutes, category) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, service.name.trim(), Number(service.price), Number(service.durationMinutes), service.category || 'unisex']
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Application updated successfully!' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Admin 3: Approve Application
app.post('/api/admin/applications/:id/approve', async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Fetch application details
    const [apps] = await conn.query('SELECT * FROM barber_applications WHERE id = ?', [id]);
    if (apps.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = apps[0];
    if (app.status === 'approved') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'This application is already approved' });
    }

    // 2. Fetch application services
    const [appServices] = await conn.query('SELECT * FROM application_services WHERE application_id = ?', [id]);

    const barberId = `b-${Date.now()}`;
    const mapsUrl = app.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(app.shop_name + ' ' + app.location)}`;

    // 3. Create Barber profile
    await conn.query(
      `INSERT INTO barbers 
       (id, name, title, specialty, rating, reviews_count, image_url, delay_status, location, maps_url, distance_meters, lead_stylist, lat, lon, chairs_count, opening_time, closing_time, working_days) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barberId,
        app.shop_name,
        'Premium Professional Grooming',
        'Custom Styling & Grooming',
        4.8,
        0,
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=250&h=250',
        'On Time',
        app.location,
        mapsUrl,
        1500,
        app.owner_name,
        app.lat,
        app.lon,
        app.chairs_count,
        app.opening_time || '09:00',
        app.closing_time || '21:00',
        app.working_days || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
      ]
    );

    // 4. Create Barber Services
    for (let idx = 0; idx < appServices.length; idx++) {
      const s = appServices[idx];
      const serviceId = `s-${barberId}-${idx}`;
      await conn.query(
        `INSERT INTO services (id, name, description, price, duration_minutes, barber_id, category) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          serviceId,
          s.name,
          `Premium ${s.name} service custom tailored for you.`,
          s.price,
          s.duration_minutes,
          barberId,
          s.category || 'unisex'
        ]
      );
    }

    // 5. Create Barber User Account
    const userId = `barber-user-${Date.now()}`;
    // Insert user (using On Duplicate Key Update to handle edge cases where email already exists in users)
    await conn.query(
      `INSERT INTO users (id, email, password, name, role, barber_id) 
       VALUES (?, ?, ?, ?, 'barber', ?) 
       ON DUPLICATE KEY UPDATE 
         role='barber', 
         barber_id=VALUES(barber_id),
         name=VALUES(name)`,
      [
        userId,
        app.email.trim().toLowerCase(),
        '123456', // Default password
        app.owner_name,
        barberId
      ]
    );

    // 6. Update application status
    await conn.query(
      'UPDATE barber_applications SET status = ?, rejection_feedback = NULL WHERE id = ?',
      ['approved', id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Application approved, barber profile and user account created successfully!' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// Admin 4: Reject Application
app.post('/api/admin/applications/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { feedback } = req.body;

  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ success: false, message: 'Rejection feedback is required' });
  }

  try {
    const [appCheck] = await pool.query('SELECT status FROM barber_applications WHERE id = ?', [id]);
    if (appCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (appCheck[0].status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot reject an already approved application' });
    }

    await pool.query(
      'UPDATE barber_applications SET status = ?, rejection_feedback = ? WHERE id = ?',
      ['rejected', feedback.trim(), id]
    );

    res.json({ success: true, message: 'Application rejected with feedback.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Barbo Node.js REST Server running at http://localhost:${PORT}`);
});
