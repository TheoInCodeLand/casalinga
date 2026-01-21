-- Users Table (Admin, Manager, Customer)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'user')) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tours Table
CREATE TABLE tours (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  short_description TEXT,
  full_description TEXT,
  location VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  start_date DATE,
  end_date DATE,
  capacity INTEGER NOT NULL,
  status VARCHAR(20) CHECK (status IN ('upcoming', 'fully_booked', 'cancelled')) DEFAULT 'upcoming',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tour Images
CREATE TABLE tour_images (
  id SERIAL PRIMARY KEY,
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);

-- Bookings Table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tour_id INTEGER REFERENCES tours(id),
  people_count INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenities & Categories (Normalization)
CREATE TABLE amenities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE tour_amenities (
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  amenity_id INTEGER REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, amenity_id)
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE tour_categories (
  tour_id INTEGER REFERENCES tours(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tour_id, category_id)
);