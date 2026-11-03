-- ==============================================================================
-- RESTÔLOG DATABASE SCHEMA (SUPABASE POSTGRESQL + POSTGIS)
-- Architecture: Clean, Lightweight MVP scalable to high-throughput
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'brasileira',
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    price_tier VARCHAR(10) NOT NULL CHECK (price_tier IN ('$', '$$', '$$$')),
    pricing_model VARCHAR(20) NOT NULL CHECK (pricing_model IN ('fixed', 'per_kilo', 'a_la_carte', 'mixed')),
    pricing_note VARCHAR(255),
    menu_type VARCHAR(20) NOT NULL CHECK (menu_type IN ('daily', 'weekly_fixed', 'dish_list')),
    opening_hours VARCHAR(255) NOT NULL,
    rating NUMERIC(2,1) NOT NULL DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Spatial and Trigram Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON public.restaurants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants (category);
CREATE INDEX IF NOT EXISTS idx_restaurants_price_tier ON public.restaurants (price_tier);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2),
    day_of_week VARCHAR(3) CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
    category VARCHAR(100),
    is_highlight BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items (restaurant_id);

-- 4. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_avatar TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    photo_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON public.reviews (restaurant_id);

-- 5. FAVORITES TABLE (Many-to-Many User -> Restaurant)
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id VARCHAR(100) NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, restaurant_id)
);

-- 6. COMMUNITY SUGGESTIONS TABLE (Anti-vandalism & Moderation queue)
CREATE TABLE IF NOT EXISTS public.restaurant_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('new', 'update')),
    target_restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    suggested_by_user_id VARCHAR(100) NOT NULL,
    suggested_by_user_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- STORED FUNCTIONS & RPCs
-- ==============================================================================

-- 1. Nearby Restaurants RPC (High performance spatial distance)
CREATE OR REPLACE FUNCTION public.get_nearby_restaurants(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    max_dist_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    category VARCHAR,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    price_tier VARCHAR,
    pricing_model VARCHAR,
    pricing_note VARCHAR,
    menu_type VARCHAR,
    opening_hours VARCHAR,
    rating NUMERIC,
    review_count INTEGER,
    image_url TEXT,
    is_verified BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    dist_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        r.id,
        r.name,
        r.description,
        r.category,
        r.address,
        r.latitude,
        r.longitude,
        r.price_tier,
        r.pricing_model,
        r.pricing_note,
        r.menu_type,
        r.opening_hours,
        r.rating,
        r.review_count,
        r.image_url,
        r.is_verified,
        r.created_at,
        r.updated_at,
        (ST_Distance(r.location, ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography) / 1000.0) AS dist_km
    FROM public.restaurants r
    WHERE r.is_verified = true
      AND ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography, max_dist_km * 1000)
    ORDER BY dist_km ASC;
$$;

-- 2. Duplicate Detection RPC
CREATE OR REPLACE FUNCTION public.find_duplicate_restaurants(
    search_name TEXT,
    search_lat DOUBLE PRECISION DEFAULT NULL,
    search_lon DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF public.restaurants
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM public.restaurants
    WHERE similarity(name, search_name) > 0.35
       OR (
           search_lat IS NOT NULL 
           AND search_lon IS NOT NULL 
           AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography, 250)
       )
    ORDER BY similarity(name, search_name) DESC
    LIMIT 5;
$$;

-- 3. Automatic Rating Aggregation Trigger
CREATE OR REPLACE FUNCTION public.update_restaurant_rating_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.restaurants
    SET 
        rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE restaurant_id = NEW.restaurant_id), 0.0),
        review_count = (SELECT COUNT(*) FROM public.reviews WHERE restaurant_id = NEW.restaurant_id),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.restaurant_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_rating ON public.reviews;
CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurant_rating_metrics();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_suggestions ENABLE ROW LEVEL SECURITY;

-- Public can read verified restaurants and menu items
CREATE POLICY "Public can read verified restaurants" ON public.restaurants FOR SELECT USING (is_verified = true);
CREATE POLICY "Public can read menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Public can read reviews" ON public.reviews FOR SELECT USING (true);

-- Anyone can submit reviews and suggestions (or authenticated users)
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit suggestions" ON public.restaurant_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can manage favorites" ON public.favorites FOR ALL USING (true);

