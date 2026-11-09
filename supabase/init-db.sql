-- ==============================================================================
-- RESTÔLOG DATABASE SETUP SCRIPT (SCHEMA + CONSTRAINTS + TRIGGERS + SEEDS)
-- Idempotent script for Development, Testing, and Production environments
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 2. LOOKUP / PRIMITIVE TABLES
-- ------------------------------------------------------------------------------

-- Categories Lookup
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50)
);

-- Pricing Models Lookup
CREATE TABLE IF NOT EXISTS public.pricing_models (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- ------------------------------------------------------------------------------
-- 3. CORE DOMAIN TABLES
-- ------------------------------------------------------------------------------

-- Restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL REFERENCES public.categories(id) ON UPDATE CASCADE,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    price_tier VARCHAR(10) NOT NULL CHECK (price_tier IN ('$', '$$', '$$$')),
    pricing_model VARCHAR(50) NOT NULL REFERENCES public.pricing_models(id) ON UPDATE CASCADE,
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

-- Spatial and Performance Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON public.restaurants USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON public.restaurants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants (category);
CREATE INDEX IF NOT EXISTS idx_restaurants_price_tier ON public.restaurants (price_tier);
CREATE INDEX IF NOT EXISTS idx_restaurants_pricing_model ON public.restaurants (pricing_model);

-- Menu Items
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
CREATE INDEX IF NOT EXISTS idx_menu_items_day ON public.menu_items (day_of_week);

-- Reviews
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

-- User Favorites (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id VARCHAR(100) NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, restaurant_id)
);

-- Community Suggestions (Anti-Vandalism & Moderation Queue)
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

-- ------------------------------------------------------------------------------
-- 4. RPCs & TRIGGERS
-- ------------------------------------------------------------------------------

-- Spatial Proximity Query RPC
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

-- Duplicate Detection RPC (Trigram Similarity + Proximity)
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

-- Trigger to Automatically Recalculate Rating and Review Counts
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

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read pricing models" ON public.pricing_models;
CREATE POLICY "Public read pricing models" ON public.pricing_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read verified restaurants" ON public.restaurants;
CREATE POLICY "Public read verified restaurants" ON public.restaurants FOR SELECT USING (is_verified = true);

DROP POLICY IF EXISTS "Public read menu items" ON public.menu_items;
CREATE POLICY "Public read menu items" ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit suggestions" ON public.restaurant_suggestions;
CREATE POLICY "Anyone can submit suggestions" ON public.restaurant_suggestions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage favorites" ON public.favorites;
CREATE POLICY "Users can manage favorites" ON public.favorites FOR ALL USING (true);

-- ------------------------------------------------------------------------------
-- 6. PRIMITIVE & ESSENTIAL SEED DATA
-- ------------------------------------------------------------------------------

-- Categories Seed
INSERT INTO public.categories (id, name, description, icon) VALUES
    ('brasileira', 'Brasileira / Caseira', 'Pratos típicos brasileiros, marmitex e pratos feitos', 'utensils'),
    ('buffet', 'Buffet & Saladas', 'Restaurantes com buffet por quilo ou livre', 'scale'),
    ('vegetariana', 'Vegetariana & Saudável', 'Opções vegetarianas, veganas e orgânicas', 'leaf'),
    ('pizza', 'Pizzarias Artesanais', 'Pizzas napolitanas, tradicionais e fornos a lenha', 'pizza'),
    ('hamburguer', 'Hamburguerias', 'Burgers artesanais, smash e defumados', 'sandwich'),
    ('italiana', 'Italiana & Massas', 'Massas frescas, risottos e molhos caseiros', 'pasta'),
    ('japonesa', 'Culinária Japonesa', 'Sushis, sashimis, temakis e pratos quentes', 'fish'),
    ('outro', 'Outros', 'Gastronomia variada e cafés', 'coffee')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Pricing Models Seed
INSERT INTO public.pricing_models (id, name, description) VALUES
    ('fixed', 'Buffet Livre / Preço Fixo', 'Preço único para consumo livre no buffet ou menu fixo'),
    ('per_kilo', 'Buffet por Quilo', 'Preço calculado com base no peso medido na balança'),
    ('a_la_carte', 'Pratos Feitos / À la Carte', 'Pratos executivos individuais com preço tabelado'),
    ('mixed', 'Misto (Livre ou Balança)', 'Opção de escolher entre pagar por quilo ou valor fixo livre')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Essential Initial Restaurants
INSERT INTO public.restaurants (
    id, name, description, category, address, latitude, longitude, price_tier,
    pricing_model, pricing_note, menu_type, opening_hours, rating, review_count,
    image_url, is_verified
) VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    'Sabor Caseiro & Cia',
    'Buffet tradicional caseiro com churrasco no almoço. Opção de buffet livre ou por quilo, comida mineira e saladas frescas.',
    'brasileira',
    'Rua Augusta, 1250 - Consolação, São Paulo - SP',
    -23.5539,
    -46.6558,
    '$$',
    'mixed',
    'Buffet Livre R$ 38,90 | Balança R$ 69,90/kg',
    'daily',
    'Seg - Sáb: 11:30 às 15:30',
    4.8,
    2,
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    true
),
(
    'a2222222-2222-2222-2222-222222222222',
    'Verde & Grão Bistrô',
    'Comida saudável, orgânica e acolhedora. Cardápio 100% vegetariano com opções veganas e sucos prensados a frio.',
    'vegetariana',
    'Alameda Santos, 840 - Jardim Paulista, São Paulo - SP',
    -23.5684,
    -46.6506,
    '$$',
    'fixed',
    'Menu Almoço Executivo Fixo R$ 44,00 (Entrada + Principal + Sobremesa)',
    'weekly_fixed',
    'Ter - Dom: 11:45 às 16:00',
    4.9,
    1,
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    true
),
(
    'a3333333-3333-3333-3333-333333333333',
    'Pizzaria Bella Napoli',
    'Fornadas artesanais no estilo napolitano com fermentação natural de 48h e farinha italiana.',
    'pizza',
    'Rua Bela Cintra, 1920 - Consolação, São Paulo - SP',
    -23.5612,
    -46.6621,
    '$$$',
    'a_la_carte',
    'Pizzas individuais napolitanas a partir de R$ 56,00',
    'dish_list',
    'Ter - Dom: 18:30 às 23:30',
    4.7,
    0,
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    true
),
(
    'a4444444-4444-4444-4444-444444444444',
    'Burger & Smokehouse',
    'Smash burgers e cortes defumados na lenha de macieira. Pães de fermentação própria tostados na manteiga.',
    'hamburguer',
    'Rua Frei Caneca, 980 - Consolação, São Paulo - SP',
    -23.5548,
    -46.6521,
    '$',
    'a_la_carte',
    'Combos artesanais a partir de R$ 32,90',
    'dish_list',
    'Seg - Dom: 12:00 às 23:00',
    4.6,
    0,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    true
),
(
    'a5555555-5555-5555-5555-555555555555',
    'Restaurante Kilo D’Ouro',
    'Variedade imensa no almoço: saladas, pratos quentes e grelhados feitos na hora na brasa.',
    'buffet',
    'Avenida Brigadeiro Luís Antônio, 2100 - Bela Vista, São Paulo - SP',
    -23.5651,
    -46.6479,
    '$',
    'per_kilo',
    'R$ 54,90/kg no almoço de Segunda a Sexta',
    'daily',
    'Seg - Sex: 11:15 às 15:00',
    4.3,
    0,
    'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80',
    true
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    pricing_note = EXCLUDED.pricing_note;

-- Menu Items Seed (Days of Week and Lists)
INSERT INTO public.menu_items (restaurant_id, name, description, price, day_of_week, category, is_highlight) VALUES
    -- Sabor Caseiro (Daily Menu)
    ('a1111111-1111-1111-1111-111111111111', 'Virado à Paulista', 'Tutu de feijão, couve refogada, bisteca suína e banana à milanesa', 38.90, 'mon', 'Prato do Dia', true),
    ('a1111111-1111-1111-1111-111111111111', 'Bife à Rolê com Purê de Batatas', 'Acompanha arroz branco, feijão carioca e salada verde', 38.90, 'tue', 'Prato do Dia', false),
    ('a1111111-1111-1111-1111-111111111111', 'Feijoada Completa Tradicional', 'Feijão preto com carnes nobres, arroz, farofa e laranja fatiada', 42.90, 'wed', 'Prato do Dia', true),
    ('a1111111-1111-1111-1111-111111111111', 'Penne ao Molho Rústico com Frango Assado', 'Frango dourado com ervas finas e molho pomodoro', 38.90, 'thu', 'Prato do Dia', false),
    ('a1111111-1111-1111-1111-111111111111', 'Filé de Peixe Empanado com Pirão', 'Acompanha arroz branco e legumes no vapor', 42.90, 'fri', 'Prato do Dia', true),
    ('a1111111-1111-1111-1111-111111111111', 'Costela Bovina Assada na Brasa', 'Costela macia desmanchando com mandioca cozida', 48.00, 'sat', 'Prato Especial', true),

    -- Verde & Grão (Weekly Fixed Menu)
    ('a2222222-2222-2222-2222-222222222222', 'Moqueca de Palmito com Banana da Terra', 'Acompanha arroz cateto integral e farofa de castanhas', 44.00, NULL, 'Prato Principal', true),
    ('a2222222-2222-2222-2222-222222222222', 'Bowl Proteico de Quinoa e Cogumelos', 'Cogumelos salteados, edamame, abacate e molho tahine', 42.00, NULL, 'Prato Principal', false),
    ('a2222222-2222-2222-2222-222222222222', 'Lasanha de Berinjela e Ricota de Castanhas', 'Molho artesanal de tomates assados', 45.00, NULL, 'Prato Principal', false),

    -- Bella Napoli (Pizzas)
    ('a3333333-3333-3333-3333-333333333333', 'Margherita Verace D.O.P.', 'Tomate pelado italiano, mozzarella di bufala e manjericão fresco', 56.00, NULL, 'Pizzas Clássicas', true),
    ('a3333333-3333-3333-3333-333333333333', 'Diavola Piccante', 'Salame picante artesanal italiano, scamorza defumada e gotas de mel', 64.00, NULL, 'Pizzas Clássicas', false),
    ('a3333333-3333-3333-3333-333333333333', 'Tartufata con Funghi', 'Creme de trufas brancas, cogumelos porcini e fior di latte', 78.00, NULL, 'Pizzas Especiais', true),

    -- Burger & Smokehouse (Dish List)
    ('a4444444-4444-4444-4444-444444444444', 'Double Bacon Smash', 'Dois discos de 90g ultra prensados, cheddar inglês e bacon artesanal', 34.90, NULL, 'Burgers', true),
    ('a4444444-4444-4444-4444-444444444444', 'Smoked Brisket Sandwich', 'Peito bovino defumado 14 horas na lenha com picles de cebola', 42.00, NULL, 'Sanduíches Defumados', true)
ON CONFLICT DO NOTHING;

-- Initial Reviews Seed
INSERT INTO public.reviews (restaurant_id, user_id, user_name, rating, comment, photo_urls) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'user-101', 'Carlos Mendes', 5, 'Comida maravilhosa caseira. A feijoada de quarta é sensacional, vale muito o buffet livre!', ARRAY['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80']),
    ('a1111111-1111-1111-1111-111111111111', 'user-102', 'Juliana Paes', 4, 'Muito limpo e rápido, perfeito para almoço executivo durante a semana.', ARRAY[]::TEXT[]),
    ('a2222222-2222-2222-2222-222222222222', 'user-103', 'Mariana Lima', 5, 'A moqueca de palmito foi uma das melhores que comi na vida. Ambiente calmo e acolhedor.', ARRAY['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80'])
ON CONFLICT DO NOTHING;

