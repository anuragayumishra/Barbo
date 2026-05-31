import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// 2. Services List Retriever
app.get('/api/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services');
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
          lon: Number(barber.lon)
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
      // Insert or update barbers row
      await pool.query(
        `INSERT INTO barbers (id, name, title, specialty, rating, reviews_count, image_url, location, maps_url, distance_meters, lead_stylist, lat, lon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           name=VALUES(name), title=VALUES(title), specialty=VALUES(specialty), 
           rating=VALUES(rating), reviews_count=VALUES(reviews_count), 
           image_url=VALUES(image_url), location=VALUES(location), 
           distance_meters=VALUES(distance_meters), lat=VALUES(lat), lon=VALUES(lon)`,
        [
          barber.id, barber.name, barber.title, barber.specialty, 
          barber.rating, barber.reviewsCount, barber.imageUrl, 
          barber.location, barber.mapsUrl, barber.distanceMeters, 
          barber.leadStylist, barber.lat, barber.lon
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

        // Clean time format (HH:MM)
        const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

        return {
          id: app.id,
          customerId: app.customer_id,
          customerName: app.customer_name,
          barberId: app.barber_id,
          barberName: app.barber_name,
          date: new Date(app.date).toISOString().split('T')[0],
          startTime: formatTime(app.start_time),
          endTime: formatTime(app.end_time),
          services: servicesRows,
          totalPrice: app.total_price,
          totalDuration: app.total_duration,
          status: app.status,
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
          notifications: notifsRows.map(n => n.message)
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
  const { customerId, customerName, barberId, date, startTime, serviceIds } = req.body;
  if (!customerId || !barberId || !date || !startTime || !Array.isArray(serviceIds)) {
    return res.status(400).json({ success: false, message: 'Invalid booking payload' });
  }

  try {
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

    // 3. Collision scheduling checking
    const startNum = startHour * 60 + startMin;
    const endNum = endHour * 60 + endMin;

    const [existingApps] = await pool.query(
      "SELECT start_time, end_time FROM appointments WHERE barber_id = ? AND date = ? AND status != 'cancelled'",
      [barberId, date]
    );

    const hasConflict = existingApps.some(app => {
      const [appSH, appSM] = app.start_time.split(':').map(Number);
      const [appEH, appEM] = app.end_time.split(':').map(Number);
      const appStart = appSH * 60 + appSM;
      const appEnd = appEH * 60 + appEM;

      return (startNum < appEnd && endNum > appStart);
    });

    if (hasConflict) {
      return res.status(409).json({ success: false, message: 'Time slot collision detected! The barber has another schedule.' });
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
        total_price, total_duration, status, travel_otp, user_lat, user_lon, 
        barber_lat, barber_lon, travel_lat, travel_lon, travel_eta, travel_distance, 
        travel_status, travel_sim_progress, travel_route_coordinates
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Preparing Departure...', 0, ?)`,
      [
        appointmentId, customerId, customerName, barberId, barber.name, date, startTime, endTime,
        totalPrice, totalDuration, randomOtp, defaultUserLat, defaultUserLon,
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
    notification 
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

// 8. Secure OTP Checkout Handshake Route
app.post('/api/appointments/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP is required' });
  }

  try {
    const [rows] = await pool.query('SELECT travel_otp FROM appointments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const appointment = rows[0];
    if (appointment.travel_otp !== otp) {
      return res.status(400).json({ success: false, message: 'OTP verification failed! Invalid security code.' });
    }

    // Complete appointment status
    await pool.query("UPDATE appointments SET status = 'completed' WHERE id = ?", [id]);
    
    // Add completion alert to notify stylists
    await pool.query("INSERT INTO appointment_notifications (appointment_id, message) VALUES (?, 'OTP Checked out successfully!')", [id]);

    res.json({ success: true, message: 'Handshake completed. Appointment successful!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Barbo Node.js REST Server running at http://localhost:${PORT}`);
});
