CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lot_id uuid NOT NULL REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  destination text NOT NULL,
  full_name text NOT NULL,
  plate text NOT NULL,
  arrival_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'awaiting_arrival',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own tickets" ON public.tickets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tickets_set_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();