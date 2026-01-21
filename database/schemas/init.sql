-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK(role IN ('admin','manager','user')) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOURS TABLE
CREATE TABLE IF NOT EXISTS tours (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  short_description TEXT,
  full_description TEXT,
  location VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  start_date DATE,
  end_date DATE,
  capacity INTEGER NOT NULL DEFAULT 10,
  status VARCHAR(20) CHECK(status IN ('upcoming','fully_booked','cancelled','completed')) DEFAULT 'upcoming',
  featured BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOUR IMAGES TABLE
CREATE TABLE IF NOT EXISTS tour_images (
  id SERIAL PRIMARY KEY,
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AMENITIES TABLE
CREATE TABLE IF NOT EXISTS amenities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(100)
);

-- TOUR_AMENITIES TABLE
CREATE TABLE IF NOT EXISTS tour_amenities (
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  amenity_id INTEGER REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, amenity_id)
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

-- TOUR_CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS tour_categories (
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, category_id)
);

-- BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  people_count INTEGER NOT NULL CHECK(people_count > 0),
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) CHECK(status IN ('pending','confirmed','cancelled','completed')) DEFAULT 'pending',
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAVORITES TABLE
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tour_id)
);

-- Insert initial amenities
INSERT INTO amenities (name, icon) VALUES 
('Tents', 'tent'),
('Bonfire', 'fire'),
('Showers', 'shower'),
('Meals Included', 'utensils'),
('Transport', 'bus'),
('Guide', 'person-hiking'),
('First Aid', 'medkit'),
('WiFi', 'wifi')
ON CONFLICT (name) DO NOTHING;

-- Insert initial categories
INSERT INTO categories (name, description) VALUES 
('Camping', 'Overnight outdoor camping experiences'),
('Hiking', 'Guided hiking and trekking tours'),
('Picnic', 'Day picnic and outdoor dining'),
('Wellness Retreat', 'Health and wellness focused retreats'),
('Adventure', 'Adventure and outdoor activities'),
('Cultural', 'Cultural and heritage tours')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_featured ON tours(featured);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_status ON bookings(status);