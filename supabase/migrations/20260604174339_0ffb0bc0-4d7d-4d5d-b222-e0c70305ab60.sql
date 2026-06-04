
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger: auto create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Parking lots (public read)
CREATE TABLE public.parking_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  map_x NUMERIC NOT NULL DEFAULT 50,
  map_y NUMERIC NOT NULL DEFAULT 50,
  hourly_price NUMERIC(10,2) NOT NULL,
  total_spots INT NOT NULL,
  distance_km NUMERIC(5,2) NOT NULL,
  modal TEXT NOT NULL,
  modal_label TEXT NOT NULL,
  modal_time_min INT NOT NULL,
  drive_time_min INT NOT NULL,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  co2_saved_kg NUMERIC(5,2) NOT NULL DEFAULT 0,
  badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parking_lots TO anon, authenticated;
GRANT ALL ON public.parking_lots TO service_role;
ALTER TABLE public.parking_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lots are public" ON public.parking_lots FOR SELECT TO anon, authenticated USING (true);

-- Spots
CREATE TABLE public.parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  spot_type TEXT NOT NULL DEFAULT 'standard',
  UNIQUE (lot_id, code)
);
GRANT SELECT ON public.parking_spots TO anon, authenticated;
GRANT ALL ON public.parking_spots TO service_role;
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Spots are public" ON public.parking_spots FOR SELECT TO anon, authenticated USING (true);

-- Reservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.parking_lots(id),
  spot_id UUID REFERENCES public.parking_spots(id),
  destination TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  total_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reservations" ON public.reservations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Route history
CREATE TABLE public.route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  origin TEXT,
  destination TEXT NOT NULL,
  modal TEXT NOT NULL,
  total_time_min INT NOT NULL,
  distance_km NUMERIC(5,2),
  co2_saved_kg NUMERIC(5,2) NOT NULL DEFAULT 0,
  money_saved NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_history TO authenticated;
GRANT ALL ON public.route_history TO service_role;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own routes" ON public.route_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own payments" ON public.payments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed parking lots (Recife Antigo demo data)
INSERT INTO public.parking_lots (name, address, map_x, map_y, hourly_price, total_spots, distance_km, modal, modal_label, modal_time_min, drive_time_min, rating, co2_saved_kg, badge) VALUES
('Estacionamento Boa Vista', 'R. da Aurora, 295 — Boa Vista', 32, 38, 15.00, 80, 1.2, 'bike', 'Bicicleta', 5, 7, 4.7, 0.9, 'Mais rápido'),
('Estacionamento Recife Antigo', 'Av. Rio Branco, 14 — Recife', 62, 48, 20.00, 60, 0.4, 'walk', 'Caminhada', 3, 7, 4.9, 1.2, 'Recomendado'),
('Shopping Tacaruna', 'Av. Gov. Agamenon Magalhães', 22, 18, 10.00, 400, 3.5, 'bus', 'Ônibus integrado', 11, 7, 4.4, 2.1, 'Mais barato'),
('Cais José Estelita', 'Av. Eng. José Estelita', 48, 72, 12.00, 120, 2.1, 'scooter', 'Patinete', 8, 6, 4.5, 1.5, NULL),
('Pátio Santo Antônio', 'R. do Imperador — Santo Antônio', 72, 58, 18.00, 90, 0.7, 'walk', 'Caminhada', 5, 8, 4.6, 1.0, NULL);
