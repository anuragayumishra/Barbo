-- Create Barbo Database Schema for MySQL
DROP DATABASE IF EXISTS barbo;
CREATE DATABASE IF NOT EXISTS barbo;
USE barbo;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('customer', 'barber', 'admin') NOT NULL,
  barber_id VARCHAR(50) NULL
);

-- 2. Services Table
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price INT NOT NULL,
  duration_minutes INT NOT NULL,
  barber_id VARCHAR(50) NULL
);

-- 3. Barbers Table
CREATE TABLE IF NOT EXISTS barbers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  reviews_count INT NOT NULL,
  image_url TEXT NOT NULL,
  delay_status VARCHAR(50) DEFAULT 'On Time',
  location VARCHAR(255) NOT NULL,
  maps_url TEXT NOT NULL,
  distance_meters INT NOT NULL,
  lead_stylist VARCHAR(100) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lon DECIMAL(9,6) NOT NULL,
  chairs_count INT DEFAULT 2,
  opening_time VARCHAR(10) DEFAULT '09:00',
  closing_time VARCHAR(10) DEFAULT '21:00',
  working_days VARCHAR(255) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
);

-- 4. Barber Portfolio Gallery Table
CREATE TABLE IF NOT EXISTS barber_portfolio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barber_id VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
);

-- 5. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  barber_id VARCHAR(50) NOT NULL,
  barber_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price INT NOT NULL,
  total_duration INT NOT NULL,
  status ENUM('upcoming', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  payment_method VARCHAR(50) DEFAULT 'Pay At Shop',
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  travel_otp VARCHAR(4) NOT NULL,
  user_lat DECIMAL(9,6) NULL,
  user_lon DECIMAL(9,6) NULL,
  barber_lat DECIMAL(9,6) NULL,
  barber_lon DECIMAL(9,6) NULL,
  travel_lat DECIMAL(9,6) NULL,
  travel_lon DECIMAL(9,6) NULL,
  travel_eta INT NULL,
  travel_distance INT NULL,
  travel_status VARCHAR(255) NULL,
  travel_sim_progress INT DEFAULT 0,
  travel_route_coordinates LONGTEXT NULL, -- JSON string array of {lat, lng} objects
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
);

-- 6. Appointment Services Mapping Table
CREATE TABLE IF NOT EXISTS appointment_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id VARCHAR(50) NOT NULL,
  service_id VARCHAR(50) NOT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- 7. Appointment Notifications/Alerts Table
CREATE TABLE IF NOT EXISTS appointment_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id VARCHAR(50) NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id VARCHAR(50) UNIQUE NOT NULL,
  barber_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  rating INT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

-- Seed Services
INSERT INTO services (id, name, description, price, duration_minutes) VALUES
('s1', 'Luxe Haircut & Styling', 'Precision scissor and clipper cut with hair wash, conditioning head massage, and blowout styling.', 250, 30),
('s2', 'Beard Sculpting & Straight Razor Alignment', 'Professional beard trimming and alignment with warm lather, hot towels, and rich sandalwood beard oil.', 120, 20),
('s3', 'Traditional Champi (Herbal Head Oil Massage)', 'Classic deep-cleansing head massage using premium warm coconut or mahabhringraj herbal oils to relieve stress.', 150, 20),
('s4', 'Active Charcoal Face Detan & Clean-up', 'Deep exfoliating detanning scrub, warm steam, active charcoal clay pack, and face massage.', 300, 30),
('s5', 'Natural Hair Color & Blend (L\'Oreal)', 'Smooth gray blending or full natural black/dark brown hair color application.', 450, 45)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price), duration_minutes=VALUES(duration_minutes);

-- Seed Barbers
INSERT INTO barbers (id, name, title, specialty, rating, reviews_count, image_url, delay_status, location, maps_url, distance_meters, lead_stylist, lat, lon, chairs_count) VALUES
('b1', 'Looks Salon', 'Premium Professional Grooming', 'High-End Scissor Cuts & Premium Treatments', 4.9, 310, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'DB City Mall, MP Nagar, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Looks+Salon+DB+City+Mall+Bhopal', 2000, 'Senior Stylist', 23.232696, 77.429901, 3),
('b2', 'Dreamland Salon & Skin Care', 'Popular MP Nagar Salon', 'Textured Fades & Skin Care', 4.8, 142, 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Shop No. 52, Zone-II, MP Nagar, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Dreamland+Salon+MP+Nagar+Bhopal', 1800, 'Master Stylist', 23.231500, 77.432000, 2),
('b3', 'Ideal Family Salon', 'Family Oriented Care', 'Classic Family Styling & Treatments', 4.7, 185, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Arera Colony, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Ideal+Family+Salon+Arera+Colony+Bhopal', 3000, 'Deepali Sen', 23.220872, 77.429364, 3),
('b4', 'Magic Hands Salon', 'Mens & Womens Grooming', 'Precision Clipper Cuts & Detan', 4.5, 95, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Karond, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Magic+Hands+Salon+Karond+Bhopal', 6000, 'Vicky Kumar', 23.297422, 77.402544, 2),
('b5', 'Mirrors Unisex Salon', 'Beauty & Hair Care', 'Hair Botox & Professional Coloring', 4.6, 120, 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Airport Road, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Mirrors+Unisex+Salon+Airport+Road+Bhopal', 7000, 'Sameer Khan', 23.291797, 77.353161, 4),
('b6', '7 Styles Salon', 'Men\'s Grooming Specialist', 'Beard Styling & Modern Fades', 4.8, 205, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Arera Colony, Bhopal', 'https://www.google.com/maps/search/?api=1&query=7+Styles+Salon+Arera+Colony+Bhopal', 3100, 'Vikram Malhotra', 23.218800, 77.425300, 2),
('b7', 'Hemant\'s Salon', 'Strong Grooming Reputation', 'Traditional Hot Towel Shave & Champi', 4.7, 150, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Surendra Palace, Narayan Nagar, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Hemant+Salon+Surendra+Palace+Bhopal', 6500, 'Hemant Sen', 23.197000, 77.447000, 2),
('b8', 'Vishal The Barber Shop', 'Local Mens Grooming', 'Buzzcuts, Trimming & Oil Massages', 4.4, 88, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250&h=250', 'On Time', 'Bagh Swaniya, Bhopal', 'https://www.google.com/maps/search/?api=1&query=Vishal+The+Barber+Shop+Bagh+Swaniya+Bhopal', 5500, 'Vishal Kumar', 23.208500, 77.452000, 2)
ON DUPLICATE KEY UPDATE name=VALUES(name), title=VALUES(title), specialty=VALUES(specialty), rating=VALUES(rating), reviews_count=VALUES(reviews_count), image_url=VALUES(image_url), location=VALUES(location), maps_url=VALUES(maps_url), distance_meters=VALUES(distance_meters), lead_stylist=VALUES(lead_stylist), lat=VALUES(lat), lon=VALUES(lon), chairs_count=VALUES(chairs_count);

-- Seed Barber Portfolio Galleries
INSERT INTO barber_portfolio (barber_id, image_url) VALUES
('b1', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400&h=400'),
('b1', 'https://images.unsplash.com/photo-1605497746444-ac9dbd39f4a5?auto=format&fit=crop&q=80&w=400&h=400'),
('b2', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400&h=400'),
('b2', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400&h=400'),
('b3', 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=400&h=400'),
('b3', 'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&q=80&w=400&h=400'),
('b4', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400&h=400'),
('b4', 'https://images.unsplash.com/photo-1605497746444-ac9dbd39f4a5?auto=format&fit=crop&q=80&w=400&h=400'),
('b5', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400&h=400'),
('b5', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400&h=400'),
('b6', 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=400&h=400'),
('b6', 'https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&q=80&w=400&h=400'),
('b7', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400&h=400'),
('b7', 'https://images.unsplash.com/photo-1605497746444-ac9dbd39f4a5?auto=format&fit=crop&q=80&w=400&h=400'),
('b8', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400&h=400'),
('b8', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400&h=400');


-- Seed Users
INSERT INTO users (id, email, password, name, role, barber_id) VALUES
('cust-faizan', 'faizan@barbo.in', '123456', 'Faizan', 'customer', NULL),
('barber-rajesh', 'rajesh@barbo.in', '123456', 'ScissorsRock Hair Studio', 'barber', 'b1'),
('admin-user', 'admin@barbo.in', '123456', 'System Admin', 'admin', NULL)
ON DUPLICATE KEY UPDATE email=VALUES(email), password=VALUES(password), name=VALUES(name), role=VALUES(role), barber_id=VALUES(barber_id);

-- Foreign Key constraint on services (barber_id)
ALTER TABLE services ADD CONSTRAINT fk_services_barber FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE;

-- Barber Onboarding Applications Tables
CREATE TABLE IF NOT EXISTS barber_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_name VARCHAR(100) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  location VARCHAR(255) NOT NULL,
  maps_url VARCHAR(500) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lon DECIMAL(9,6) NOT NULL,
  chairs_count INT NOT NULL,
  opening_time VARCHAR(10) NOT NULL,
  closing_time VARCHAR(10) NOT NULL,
  working_days VARCHAR(255) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_feedback TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price INT NOT NULL,
  duration_minutes INT NOT NULL,
  FOREIGN KEY (application_id) REFERENCES barber_applications(id) ON DELETE CASCADE
);

-- 9. Email OTP Verifications Table
CREATE TABLE IF NOT EXISTS email_verifications (
  email VARCHAR(100) PRIMARY KEY,
  otp VARCHAR(10) NOT NULL,
  verified TINYINT(1) DEFAULT 0,
  expires_at TIMESTAMP NOT NULL
);

-- 10. Location Change Requests Table
CREATE TABLE IF NOT EXISTS location_change_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barber_id VARCHAR(50) NOT NULL,
  proposed_maps_url VARCHAR(500) NOT NULL,
  proposed_lat DECIMAL(9,6) NOT NULL,
  proposed_lon DECIMAL(9,6) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
);

