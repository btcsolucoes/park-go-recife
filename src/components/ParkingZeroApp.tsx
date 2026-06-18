import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MapPin,
  Search,
  Navigation2,
  Bike,
  Footprints,
  Bus,
  Car,
  Clock,
  Leaf,
  DollarSign,
  Star,
  ChevronRight,
  ArrowLeft,
  Locate,
  Layers,
  Menu,
  TrendingUp,
  Award,
  Zap,
  Settings,
  User,
  Bell,
  Check,
  CircleParking,
  Route as RouteIcon,
  LogOut,
  Loader2,
  Ticket as TicketIcon,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  DESTINATIONS,
  useParkingLots,
  useSessionUser,
  useUserMetrics,
  signIn,
  signUp,
  signOut,
  createTicket,
  type ParkingOption,
  type Modal,
  type Ticket,
} from "@/lib/parking-api";
import {
  quickDestinationFromLabel,
  searchDestinations,
  typedDestinationFromQuery,
  type SelectedDestination,
} from "@/lib/destinations";

type Screen =
  | "splash"
  | "auth"
  | "map"
  | "search"
  | "results"
  | "compare"
  | "route"
  | "ticket"
  | "dashboard";

const modalIcon = (m: Modal, className = "h-4 w-4") => {
  switch (m) {
    case "walk":
      return <Footprints className={className} />;
    case "bike":
      return <Bike className={className} />;
    case "bus":
      return <Bus className={className} />;
    default:
      return <Car className={className} />;
  }
};

const ESTIMATED_PARKING_HOURS = 2;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

const hasKnownPrice = (price: number | null | undefined): price is number =>
  typeof price === "number" && Number.isFinite(price);

const formatHourlyPrice = (price: number | null | undefined, estimated = false) =>
  hasKnownPrice(price)
    ? `${formatCurrency(price)}/h${estimated ? " médio" : ""}`
    : "Preço não informado";

const formatEstimatedParkingPrice = (price: number | null | undefined, estimated = false) =>
  hasKnownPrice(price)
    ? `${formatCurrency(price * ESTIMATED_PARKING_HOURS)}${estimated ? " média" : ""}`
    : "Sem estimativa";

export default function ParkingZeroApp() {
  const { user, ready } = useSessionUser();
  const [screen, setScreen] = useState<Screen>("splash");
  const [destination, setDestination] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<SelectedDestination | null>(null);
  const [selected, setSelected] = useState<ParkingOption | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const { data: lots, loading: lotsLoading, reload: reloadLots } = useParkingLots();
  const { metrics, reload: reloadMetrics } = useUserMetrics(user?.id ?? null);

  const rankedLots = useMemo(() => [...lots].sort((a, b) => a.totalTime - b.totalTime), [lots]);
  const destinationLabel =
    selectedDestination?.formatted_address || destination || "Marco Zero, Recife Antigo";

  // When user becomes available and we're on splash/auth, jump to map
  const handleAuthed = () => setScreen("map");

  return (
    <div className="min-h-dvh bg-muted/40 flex items-stretch justify-center">
      <div className="phone-shell shadow-pop">
        <AnimatePresence mode="wait">
          {screen === "splash" && (
            <Splash key="s" onDone={() => setScreen(user ? "map" : "auth")} />
          )}
          {screen === "auth" && <Auth key="a" onAuthed={handleAuthed} />}
          {screen === "map" && (
            <MapHome
              key="m"
              user={user}
              lots={lots}
              metrics={metrics}
              onSearch={() => setScreen("search")}
              onDashboard={() => setScreen("dashboard")}
              loading={!ready || lotsLoading}
            />
          )}
          {screen === "search" && (
            <SearchScreen
              key="se"
              destination={destination}
              setDestination={setDestination}
              selectedDestination={selectedDestination}
              setSelectedDestination={setSelectedDestination}
              onBack={() => setScreen("map")}
              onSubmit={(d) => {
                setSelectedDestination(d);
                setDestination(d.formatted_address);
                setScreen("results");
              }}
            />
          )}
          {screen === "results" && (
            <Results
              key="r"
              destination={destinationLabel}
              selectedDestination={selectedDestination}
              lots={rankedLots}
              onBack={() => setScreen("search")}
              onCompare={() => setScreen("compare")}
              onSelect={(p) => {
                setSelected(p);
                setScreen("route");
              }}
            />
          )}
          {screen === "compare" && (
            <Compare
              key="c"
              lots={rankedLots}
              onBack={() => setScreen("results")}
              onSelect={(p) => {
                setSelected(p);
                setScreen("route");
              }}
            />
          )}
          {screen === "route" && selected && (
            <RouteScreen
              key="rt"
              option={selected}
              destination={destinationLabel}
              selectedDestination={selectedDestination}
              user={user}
              onBack={() => setScreen("results")}
              onGenerateTicket={async ({ plate }) => {
                if (!user) {
                  setScreen("auth");
                  return;
                }
                try {
                  const t = await createTicket({
                    userId: user.id,
                    fullName: user.fullName,
                    plate,
                    option: selected,
                    destination: destinationLabel,
                  });
                  setTicket(t);
                  toast.success("Ticket de chegada gerado");
                  await Promise.all([reloadLots(), reloadMetrics()]);
                  setScreen("ticket");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            />
          )}
          {screen === "ticket" && ticket && (
            <TicketScreen
              key="tk"
              ticket={ticket}
              onBack={() => setScreen("route")}
              onDone={() => setScreen("dashboard")}
            />
          )}
          {screen === "dashboard" && (
            <Dashboard
              key="d"
              user={user}
              metrics={metrics}
              onBack={() => setScreen("map")}
              onLogout={async () => {
                await signOut();
                setScreen("auth");
                toast.success("Sessão encerrada");
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- SPLASH ---------------- */
function Splash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh gradient-navy text-white flex flex-col items-center justify-between p-8"
    >
      <div />
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="relative h-28 w-28 rounded-[28px] gradient-brand flex items-center justify-center shadow-pop"
        >
          <CircleParking className="h-14 w-14 text-primary" strokeWidth={2.5} />
          <motion.div
            className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-white flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Zap className="h-5 w-5 text-brand" fill="currentColor" />
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight">Parking Zero</h1>
          <p className="text-white/60 mt-2 text-sm">Estacione antes. Mova-se melhor.</p>
        </motion.div>
      </div>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={onDone}
        className="w-full bg-brand text-primary font-semibold py-4 rounded-2xl active:scale-[0.98] transition"
      >
        Começar
      </motion.button>
    </motion.div>
  );
}

/* ---------------- AUTH ---------------- */
function Auth({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) return toast.error("Preencha e-mail e senha");
    if (password.length < 6) return toast.error("Senha precisa de pelo menos 6 caracteres");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!fullName.trim()) {
          setBusy(false);
          return toast.error("Informe seu nome");
        }
        await signUp(email.trim(), password, fullName.trim());
        toast.success("Conta criada! Você já está logado.");
      } else {
        await signIn(email.trim(), password);
        toast.success("Bem-vindo de volta");
      }
      onAuthed();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col p-6 pt-12"
    >
      <div className="flex items-center gap-3 mb-10">
        <div className="h-10 w-10 rounded-xl gradient-navy flex items-center justify-center">
          <CircleParking className="h-6 w-6 text-brand" />
        </div>
        <span className="font-display text-xl font-bold">Parking Zero</span>
      </div>

      <h2 className="text-3xl font-bold">
        {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
      </h2>
      <p className="text-muted-foreground text-sm mt-2">
        Encontre vaga, economize tempo e reduza emissões no Recife Antigo.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {mode === "signup" && (
          <Field
            label="Nome"
            placeholder="João Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}
        <Field
          label="E-mail"
          placeholder="voce@email.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Senha"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="mt-8 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-[0.98] transition shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "login" ? "Entrar" : "Criar conta"}
      </button>

      <p className="mt-auto text-center text-sm text-muted-foreground pt-8">
        {mode === "login" ? "Novo por aqui? " : "Já tem conta? "}
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-brand font-semibold"
        >
          {mode === "login" ? "Cadastre-se" : "Entrar"}
        </button>
      </p>
    </motion.div>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full bg-muted/60 border border-transparent focus:border-brand focus:bg-white outline-none px-4 py-3.5 rounded-2xl text-sm transition"
      />
    </label>
  );
}

/* ---------------- MAP HOME ---------------- */
function MapHome({
  onSearch,
  onDashboard,
  user,
  lots,
  metrics,
  loading,
}: {
  onSearch: () => void;
  onDashboard: () => void;
  user: { fullName: string } | null;
  lots: ParkingOption[];
  metrics: { timeSavedMin: number; moneySaved: number; co2AvoidedKg: number };
  loading: boolean;
}) {
  const firstName = (user?.fullName ?? "Visitante").split(" ")[0];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh relative"
    >
      <MapCanvas pins={lots} highlightUser />
      <div className="absolute top-0 inset-x-0 p-4 pt-6 flex items-center gap-3">
        <button className="glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft">
          <Menu className="h-5 w-5 text-primary" />
        </button>
        <button
          onClick={onSearch}
          className="flex-1 glass h-11 rounded-full px-4 flex items-center gap-2 shadow-soft text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Para onde vamos?</span>
        </button>
        <button
          onClick={onDashboard}
          className="glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft"
        >
          <User className="h-5 w-5 text-primary" />
        </button>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[Layers, Locate, Navigation2].map((Icon, i) => (
          <button
            key={i}
            className="h-11 w-11 rounded-full bg-white shadow-soft flex items-center justify-center"
          >
            <Icon className="h-5 w-5 text-primary" />
          </button>
        ))}
      </div>

      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 22 }}
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] shadow-pop p-5 pb-8"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Olá, {firstName}</p>
            <h3 className="text-xl font-bold mt-0.5">Estacione para não dirigir</h3>
          </div>
          <span className="text-xs font-semibold gradient-brand text-primary px-2.5 py-1 rounded-full">
            Recife Antigo
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat
            icon={<Clock className="h-4 w-4" />}
            value={`${metrics.timeSavedMin}min`}
            label="economizados"
          />
          <Stat
            icon={<DollarSign className="h-4 w-4" />}
            value={`R$${metrics.moneySaved}`}
            label="este mês"
          />
          <Stat
            icon={<Leaf className="h-4 w-4" />}
            value={`${metrics.co2AvoidedKg}kg`}
            label="CO₂ evitado"
          />
        </div>

        <button
          onClick={onSearch}
          className="mt-5 w-full gradient-brand text-primary font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Search className="h-5 w-5" />
          {loading ? "Carregando estacionamentos..." : `Buscar destino · ${lots.length} vagas`}
        </button>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {DESTINATIONS.slice(0, 3).map((d) => (
            <button
              key={d}
              onClick={onSearch}
              className="text-xs bg-muted px-3 py-2 rounded-full text-foreground/80 whitespace-nowrap"
            >
              <MapPin className="inline h-3 w-3 mr-1 text-brand" />
              {d.split(",")[0]}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-muted rounded-2xl p-3">
      <div className="h-7 w-7 rounded-lg bg-white text-brand flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm font-bold mt-2">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

/* ---------------- MAP CANVAS ---------------- */
type LatLng = { lat: number; lng: number };

const RECIFE_MAP_CENTER: LatLng = { lat: -8.0631, lng: -34.8711 };
const TILE_SIZE = 256;

function lotLocation(lot: ParkingOption): LatLng | null {
  if (!lot.location) return null;

  return lot.location;
}

function projectPoint(point: LatLng, zoom: number) {
  const scale = 2 ** zoom;
  const latRad = (point.lat * Math.PI) / 180;

  return {
    x: ((point.lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

function pixelOffset(point: LatLng, center: LatLng, zoom: number) {
  const projected = projectPoint(point, zoom);
  const projectedCenter = projectPoint(center, zoom);

  return {
    x: (projected.x - projectedCenter.x) * TILE_SIZE,
    y: (projected.y - projectedCenter.y) * TILE_SIZE,
  };
}

function averageCenter(points: LatLng[]) {
  if (points.length === 0) return RECIFE_MAP_CENTER;

  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
  };
}

function tileGrid(center: LatLng, zoom: number) {
  const projectedCenter = projectPoint(center, zoom);
  const centerTile = {
    x: Math.floor(projectedCenter.x),
    y: Math.floor(projectedCenter.y),
  };
  const centerOffset = {
    x: (projectedCenter.x - centerTile.x) * TILE_SIZE,
    y: (projectedCenter.y - centerTile.y) * TILE_SIZE,
  };
  const maxTile = 2 ** zoom;
  const tiles: Array<{ key: string; x: number; y: number; left: number; top: number }> = [];

  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const rawX = centerTile.x + dx;
      const x = ((rawX % maxTile) + maxTile) % maxTile;
      const y = centerTile.y + dy;

      if (y >= 0 && y < maxTile) {
        tiles.push({
          key: `${zoom}-${x}-${y}`,
          x,
          y,
          left: dx * TILE_SIZE - centerOffset.x,
          top: dy * TILE_SIZE - centerOffset.y,
        });
      }
    }
  }

  return tiles;
}

function offsetStyle(offset: { x: number; y: number }) {
  return {
    left: `calc(50% + ${offset.x}px)`,
    top: `calc(50% + ${offset.y}px)`,
  };
}

function RouteSegment({
  from,
  to,
  tone = "brand",
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  tone?: "brand" | "primary";
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <div
      className={`absolute h-1 rounded-full shadow-soft origin-left ${tone === "brand" ? "bg-brand" : "bg-primary"}`}
      style={{
        left: `calc(50% + ${from.x}px)`,
        top: `calc(50% + ${from.y}px)`,
        width: `${length}px`,
        transform: `rotate(${angle}deg) translateY(-50%)`,
      }}
    />
  );
}

function MapCanvas({
  pins,
  highlightUser,
  route,
  destination,
}: {
  pins: ParkingOption[];
  highlightUser?: boolean;
  route?: boolean;
  destination?: SelectedDestination | null;
}) {
  const destinationLocation = destination ? { lat: destination.lat, lng: destination.lng } : null;
  const userLocation: LatLng = { lat: -8.0575, lng: -34.888 };
  const mappedPins = pins
    .map((lot) => ({ lot, location: lotLocation(lot) }))
    .filter((item): item is { lot: ParkingOption; location: LatLng } => item.location != null);
  const pinLocations = mappedPins.map((item) => item.location);
  const center = averageCenter([
    ...(route ? [userLocation] : []),
    ...pinLocations,
    ...(destinationLocation ? [destinationLocation] : []),
  ]);
  const zoom = destinationLocation ? 15 : 14;
  const tiles = tileGrid(center, zoom);
  const routeLotLocation = mappedPins[0]?.location ?? null;
  const routePoints =
    route && routeLotLocation && destinationLocation
      ? {
          from: pixelOffset(userLocation, center, zoom),
          via: pixelOffset(routeLotLocation, center, zoom),
          to: pixelOffset(destinationLocation, center, zoom),
        }
      : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#dce7df]">
      <div className="absolute inset-0">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
            alt=""
            className="absolute h-64 w-64 max-w-none select-none"
            draggable={false}
            referrerPolicy="no-referrer"
            style={{
              left: `calc(50% + ${tile.left}px)`,
              top: `calc(50% + ${tile.top}px)`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-white/10" />

      {routePoints && (
        <>
          <RouteSegment from={routePoints.from} to={routePoints.via} tone="primary" />
          <RouteSegment from={routePoints.via} to={routePoints.to} />
        </>
      )}

      {mappedPins.map(({ lot: p, location }) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={offsetStyle(pixelOffset(location, center, zoom))}
        >
          <div className="bg-primary text-white px-2.5 py-1.5 rounded-xl shadow-pop flex items-center gap-1.5 text-xs font-semibold">
            <CircleParking className="h-3.5 w-3.5 text-brand" />
            {hasKnownPrice(p.price) ? formatHourlyPrice(p.price, p.priceEstimated) : "Consultar"}
          </div>
          <div className="h-2 w-2 rounded-full bg-primary mx-auto -mt-0.5" />
        </div>
      ))}

      {highlightUser && (
        <div className="absolute" style={offsetStyle(pixelOffset(userLocation, center, zoom))}>
          <div className="relative h-4 w-4 -translate-x-1/2 -translate-y-1/2">
            <div className="pulse-ring absolute inset-0 rounded-full" />
            <div className="absolute inset-0 rounded-full bg-brand border-2 border-white shadow-pop" />
          </div>
        </div>
      )}

      {destinationLocation && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={offsetStyle(pixelOffset(destinationLocation, center, zoom))}
        >
          <div className="h-6 w-6 rounded-full bg-destructive border-2 border-white shadow-pop flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      )}

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1 left-1 rounded bg-white/85 px-1.5 py-0.5 text-[9px] text-primary/70"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}

/* ---------------- SEARCH ---------------- */
function SearchScreen({
  destination,
  setDestination,
  selectedDestination,
  setSelectedDestination,
  onBack,
  onSubmit,
}: {
  destination: string;
  setDestination: (s: string) => void;
  selectedDestination: SelectedDestination | null;
  setSelectedDestination: (destination: SelectedDestination | null) => void;
  onBack: () => void;
  onSubmit: (destination: SelectedDestination) => void;
}) {
  const [q, setQ] = useState(destination);
  const [suggestions, setSuggestions] = useState<SelectedDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const query = q.trim();
  const matchingQuickSuggestions = DESTINATIONS.filter((d) =>
    d.toLowerCase().includes(query.toLowerCase()),
  );
  const quickSuggestions =
    matchingQuickSuggestions.length > 0 ? matchingQuickSuggestions : DESTINATIONS;

  useEffect(() => {
    if (selectedDestination) return;
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      searchDestinations(query, controller.signal)
        .then((items) => setSuggestions(items))
        .catch((err) => {
          if ((err as Error).name === "AbortError") return;
          setSuggestions([]);
          setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedDestination]);

  const selectDestination = (nextDestination: SelectedDestination) => {
    setSelectedDestination(nextDestination);
    setDestination(nextDestination.formatted_address);
    setQ(nextDestination.formatted_address);
    setSuggestions([]);
    setError(false);
    setLoading(false);
  };

  const selectQuickSuggestion = (label: string) => {
    selectDestination(quickDestinationFromLabel(label));
  };

  const selectTypedDestination = () => {
    if (query.length < 3) return;
    selectDestination(typedDestinationFromQuery(query));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh bg-background flex flex-col"
    >
      <div className="p-4 pt-6 flex items-center gap-3 border-b border-border">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-sm text-muted-foreground">Sua localização atual</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-sm bg-destructive" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setDestination(e.target.value);
                if (selectedDestination) setSelectedDestination(null);
              }}
              placeholder="Para onde você quer ir?"
              className="flex-1 outline-none text-sm font-medium placeholder:text-muted-foreground bg-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedDestination && (
          <div className="p-5">
            <div className="bg-white border border-brand/30 rounded-2xl p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl gradient-brand text-primary flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand uppercase tracking-wider">
                    Destino selecionado
                  </p>
                  <h3 className="font-bold text-base mt-1">{selectedDestination.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedDestination.formatted_address}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onSubmit(selectedDestination)}
                  className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl active:scale-[0.98] transition"
                >
                  Confirmar e continuar
                </button>
                <button
                  onClick={() => {
                    setSelectedDestination(null);
                    setDestination("");
                    setQ("");
                  }}
                  className="px-4 bg-muted text-foreground font-semibold rounded-2xl active:scale-[0.98] transition"
                >
                  Alterar
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedDestination && (
          <>
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resultados da busca
              </p>
              {loading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando
                </span>
              )}
            </div>

            {query.length > 0 && query.length < 3 && (
              <p className="px-5 py-3 text-sm text-muted-foreground">
                Digite pelo menos 3 caracteres para buscar destinos reais.
              </p>
            )}

            {error && (
              <div className="mx-5 my-3 rounded-2xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs leading-relaxed text-amber-900">
                  Não conseguimos buscar destinos agora. Tente novamente ou use uma sugestão rápida.
                </p>
              </div>
            )}

            {suggestions.map((item) => (
              <button
                key={item.place_id}
                onClick={() => selectDestination(item)}
                className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-muted text-left border-b border-border/60"
              >
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.formatted_address}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}

            {query.length >= 3 && !loading && !error && suggestions.length === 0 && (
              <p className="px-5 py-3 text-sm text-muted-foreground">
                Nenhum destino encontrado. Tente outro termo ou use uma sugestão rápida.
              </p>
            )}

            {query.length >= 3 && !loading && (
              <div className="px-5 py-3">
                <button
                  onClick={selectTypedDestination}
                  className="w-full rounded-2xl border border-dashed border-brand/50 bg-brand/10 px-4 py-3 text-left active:scale-[0.99] transition"
                >
                  <p className="text-sm font-semibold text-primary">Usar endereço digitado</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {query}
                    {!query.toLowerCase().includes("recife") && " - Recife, PE"}
                  </p>
                </button>
              </div>
            )}
          </>
        )}

        <p className="px-5 pt-5 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sugestões rápidas
        </p>
        {quickSuggestions.map((d) => (
          <button
            key={d}
            onClick={() => selectQuickSuggestion(d)}
            className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-muted text-left border-b border-border/60"
          >
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <MapPin className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{d.split(",")[0]}</p>
              <p className="text-xs text-muted-foreground">
                {d.split(",")[1]?.trim() || "Recife, PE"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------- RESULTS ---------------- */
function Results({
  destination,
  selectedDestination,
  lots,
  onBack,
  onCompare,
  onSelect,
}: {
  destination: string;
  selectedDestination: SelectedDestination | null;
  lots: ParkingOption[];
  onBack: () => void;
  onCompare: () => void;
  onSelect: (p: ParkingOption) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col"
    >
      <div className="relative h-[38vh]">
        <MapCanvas pins={lots} destination={selectedDestination} />
        <div className="absolute top-0 inset-x-0 p-4 pt-6 flex items-center gap-3">
          <button
            onClick={onBack}
            className="glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="min-w-0 flex-1 overflow-hidden glass rounded-2xl px-4 py-2.5 shadow-soft">
            <p className="text-[10px] text-muted-foreground">Destino</p>
            <p
              className="text-sm font-semibold leading-tight break-words"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {destination}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[28px] -mt-6 relative shadow-pop p-5 pb-8 overflow-auto">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h3 className="text-lg font-bold">{lots.length} melhores opções</h3>
            <p className="text-xs text-muted-foreground">Ranqueadas por tempo total</p>
          </div>
          <button
            onClick={onCompare}
            className="text-xs font-semibold text-brand bg-accent px-3 py-2 rounded-full"
          >
            Comparar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lots.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelect(p)}
              className="w-full text-left bg-white border border-border rounded-2xl p-4 hover:border-brand transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary bg-brand/20 px-2 py-0.5 rounded">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {p.badge && (
                      <span className="text-[10px] font-semibold text-brand">• {p.badge}</span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm mt-1.5 truncate">{p.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                </div>
                <div className="text-right">
                  {hasKnownPrice(p.price) ? (
                    <>
                      <p className="text-xl font-bold">{formatCurrency(p.price)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        / hora{p.priceEstimated ? " média" : ""}
                      </p>
                      <p className="text-[10px] text-brand font-semibold">
                        {ESTIMATED_PARKING_HOURS}h:{" "}
                        {formatEstimatedParkingPrice(p.price, p.priceEstimated)}
                      </p>
                    </>
                  ) : (
                    <p className="max-w-[88px] text-xs font-semibold text-muted-foreground leading-tight">
                      Preço não informado
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <Pill icon={<Clock className="h-3 w-3" />}>{p.totalTime} min</Pill>
                <Pill icon={modalIcon(p.modal, "h-3 w-3")}>
                  {p.modalTime}min {p.modalLabel.split(" ")[0]}
                </Pill>
                <Pill icon={<Star className="h-3 w-3" fill="currentColor" />}>{p.rating}</Pill>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full gradient-brand"
                    style={{ width: `${(p.spotsAvailable / p.spotsTotal) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {p.spotsAvailable}/{p.spotsTotal} vagas
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-foreground/80">
      {icon}
      {children}
    </span>
  );
}

/* ---------------- COMPARE ---------------- */
function Compare({
  lots,
  onBack,
  onSelect,
}: {
  lots: ParkingOption[];
  onBack: () => void;
  onSelect: (p: ParkingOption) => void;
}) {
  const knownPrices = lots.map((x) => x.price).filter(hasKnownPrice);
  const lowestKnownPrice = knownPrices.length ? Math.min(...knownPrices) : null;
  const rows: {
    label: string;
    key: (p: ParkingOption) => string;
    best?: (p: ParkingOption) => boolean;
  }[] = [
    {
      label: "Preço",
      key: (p) => formatHourlyPrice(p.price, p.priceEstimated),
      best: (p) => hasKnownPrice(p.price) && p.price === lowestKnownPrice,
    },
    {
      label: "Estimativa 2h",
      key: (p) => formatEstimatedParkingPrice(p.price, p.priceEstimated),
      best: (p) => hasKnownPrice(p.price) && p.price === lowestKnownPrice,
    },
    {
      label: "Tempo total",
      key: (p) => `${p.totalTime} min`,
      best: (p) => p.totalTime === Math.min(...lots.map((x) => x.totalTime)),
    },
    { label: "Modal", key: (p) => p.modalLabel },
    { label: "Distância", key: (p) => `${p.distanceKm} km` },
    { label: "Vagas livres", key: (p) => `${p.spotsAvailable}` },
    { label: "Avaliação", key: (p) => `★ ${p.rating}` },
    {
      label: "CO₂ evitado",
      key: (p) => `${p.co2Saved} kg`,
      best: (p) => p.co2Saved === Math.max(...lots.map((x) => x.co2Saved)),
    },
  ];
  const gridTemplateColumns = `minmax(92px, 1fr) repeat(${lots.length}, minmax(104px, 1fr))`;
  const comparisonMinWidth = `${120 + lots.length * 112}px`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh bg-background flex flex-col"
    >
      <div className="p-4 pt-6 flex items-center gap-3 border-b border-border">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-bold">Comparar opções</h2>
          <p className="text-xs text-muted-foreground">Veja qual combina com você</p>
        </div>
      </div>

      <div className="p-4 flex gap-2 overflow-x-auto">
        {lots.map((p, i) => (
          <div
            key={p.id}
            className="min-w-[116px] bg-white border border-border rounded-2xl p-3 text-center"
          >
            <span className="text-[10px] font-bold text-primary bg-brand/20 px-2 py-0.5 rounded">
              {String.fromCharCode(65 + i)}
            </span>
            <p className="mt-2 text-xs font-bold leading-tight">
              {p.name.replace("Estacionamento ", "")}
            </p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 flex-1 overflow-auto">
        <div
          className="bg-white rounded-2xl border border-border overflow-hidden"
          style={{ minWidth: comparisonMinWidth }}
        >
          {rows.map((r, idx) => (
            <div
              key={r.label}
              className={`grid ${idx > 0 ? "border-t border-border" : ""}`}
              style={{ gridTemplateColumns }}
            >
              <div className="p-3 text-xs font-medium text-muted-foreground bg-muted/40">
                {r.label}
              </div>
              {lots.map((p) => {
                const isBest = r.best?.(p);
                return (
                  <div
                    key={p.id}
                    className={`p-3 text-xs font-semibold text-center ${isBest ? "text-brand" : ""}`}
                  >
                    {r.key(p)}
                    {isBest && <Check className="inline h-3 w-3 ml-1" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 flex gap-2 overflow-x-auto border-t border-border bg-white">
        {lots.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`min-w-[112px] py-3 rounded-2xl text-xs font-semibold ${i === 0 ? "gradient-brand text-primary" : "bg-muted text-foreground"}`}
          >
            Escolher {String.fromCharCode(65 + i)}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------- ROUTE ---------------- */
function RouteScreen({
  option,
  destination,
  selectedDestination,
  user,
  onBack,
  onGenerateTicket,
}: {
  option: ParkingOption;
  destination: string;
  selectedDestination: SelectedDestination | null;
  user: { id: string } | null;
  onBack: () => void;
  onGenerateTicket: (input: { plate: string }) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [plate, setPlate] = useState("");
  const steps = [
    {
      icon: <Car className="h-4 w-4" />,
      label: `Dirigir até ${option.name}`,
      time: option.driveTime,
      color: "bg-primary text-white",
    },
    {
      icon: <CircleParking className="h-4 w-4" />,
      label: `Estacionar no local`,
      time: 2,
      color: "bg-brand text-primary",
    },
    {
      icon: modalIcon(option.modal, "h-4 w-4"),
      label: `${option.modalLabel} até o destino`,
      time: option.modalTime,
      color: "bg-accent text-primary",
    },
  ];

  const plateValid = /^[A-Za-z]{3}[-\s]?\d[A-Za-z0-9]\d{2}$/.test(plate.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col"
    >
      <div className="relative h-[36vh]">
        <MapCanvas pins={[option]} route destination={selectedDestination} />
        <button
          onClick={onBack}
          className="absolute top-6 left-4 glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="absolute top-6 right-4 glass rounded-full px-3 py-2 shadow-soft flex items-center gap-1.5">
          <RouteIcon className="h-4 w-4 text-brand" />
          <span className="text-xs font-semibold">{option.totalTime} min</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[28px] -mt-6 relative shadow-pop p-5 pb-6 overflow-auto">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="mt-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-brand font-semibold uppercase tracking-wider">
              Rota Multimodal
            </p>
            <h3 className="text-lg font-bold mt-1">{option.name}</h3>
            <p className="text-xs text-muted-foreground">para {destination}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {option.totalTime}
              <span className="text-sm">min</span>
            </p>
            <p className="text-[10px] text-muted-foreground">tempo total</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Estacionamento
            </p>
            <p className="text-lg font-bold mt-0.5 leading-tight">
              {formatHourlyPrice(option.price, option.priceEstimated)}
            </p>
          </div>
          <div className="rounded-2xl bg-brand/15 p-3">
            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
              Estimativa {ESTIMATED_PARKING_HOURS}h
            </p>
            <p className="text-lg font-bold mt-0.5">
              {formatEstimatedParkingPrice(option.price, option.priceEstimated)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.time} min</p>
              </div>
              {i < steps.length - 1 && (
                <div className="text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider">
            Placa do veículo
          </label>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="ABC1D23"
            className="mt-1.5 w-full h-12 rounded-2xl border border-border bg-muted/40 px-4 font-mono tracking-widest text-center text-base uppercase focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="mt-3 flex gap-2 items-start rounded-xl bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-snug text-amber-900">
            Este ticket não garante vaga. A disponibilidade e o pagamento são confirmados
            diretamente no estacionamento.
          </p>
        </div>

        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onGenerateTicket({ plate: plate.trim() });
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || !user || !plateValid}
          className="mt-4 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-[0.98] transition shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <TicketIcon className="h-5 w-5" />}
          {user ? "Gerar ticket de chegada" : "Entrar para gerar ticket"}
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------- TICKET ---------------- */
function TicketScreen({
  ticket,
  onBack,
  onDone,
}: {
  ticket: Ticket;
  onBack: () => void;
  onDone: () => void;
}) {
  const arrival = new Date(ticket.arrivalAt);
  const arrivalLabel = arrival.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
    `PARKINGZERO|${ticket.code}|${ticket.plate}|${ticket.lotName}`,
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh bg-muted/40 flex flex-col"
    >
      <div className="gradient-navy text-white p-5 pt-6 pb-8 rounded-b-[28px]">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-xs uppercase tracking-widest opacity-80">Ticket de chegada</p>
          <div className="w-10" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-semibold">Aguardando chegada</span>
        </div>
        <h2 className="text-2xl font-bold mt-1">{ticket.lotName}</h2>
        <p className="text-xs opacity-80">{ticket.lotAddress}</p>
      </div>

      <div className="-mt-5 mx-4 bg-white rounded-3xl shadow-pop p-5">
        <div className="flex justify-center">
          <img
            src={qrUrl}
            alt="QR Code do ticket"
            className="h-44 w-44 rounded-xl border border-border"
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <p className="font-mono text-sm font-bold tracking-widest">{ticket.code}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(ticket.code);
              toast.success("Código copiado");
            }}
            className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:text-primary"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <TicketField label="Motorista" value={ticket.fullName} />
          <TicketField label="Placa" value={ticket.plate} mono />
          <TicketField
            label="Preço"
            value={formatHourlyPrice(ticket.hourlyPrice, ticket.priceEstimated)}
          />
          <TicketField
            label={`Estimativa ${ticket.estimatedHours}h`}
            value={
              ticket.estimatedTotal == null
                ? "Sem estimativa"
                : `${formatCurrency(ticket.estimatedTotal)}${ticket.priceEstimated ? " média" : ""}`
            }
          />
          <TicketField label="Destino" value={ticket.destination} />
          <TicketField label="Chegada prevista" value={arrivalLabel} />
        </div>

        <div className="mt-4 flex gap-2 items-start rounded-xl bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-snug text-amber-900">
            Este ticket não garante vaga. A disponibilidade e o pagamento são confirmados
            diretamente no estacionamento.
          </p>
        </div>
      </div>

      <div className="mt-auto p-5">
        <button
          onClick={onDone}
          className="w-full bg-brand text-primary font-semibold py-4 rounded-2xl active:scale-[0.98] transition shadow-soft flex items-center justify-center gap-2"
        >
          <Check className="h-5 w-5" />
          Ver meu impacto
        </button>
      </div>
    </motion.div>
  );
}

function TicketField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className={`text-sm font-semibold mt-0.5 ${mono ? "font-mono tracking-widest" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Savings({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-accent/60 rounded-2xl p-3 text-center">
      <div className="h-7 w-7 rounded-lg bg-white text-brand mx-auto flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm font-bold mt-2 text-brand">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({
  user,
  metrics,
  onBack,
  onLogout,
}: {
  user: { fullName: string; initials: string } | null;
  metrics: {
    timeSavedMin: number;
    moneySaved: number;
    co2AvoidedKg: number;
    trips: number;
    weeklyTrend: number[];
    modalSplit: { modal: string; pct: number; color: string }[];
  };
  onBack: () => void;
  onLogout: () => void;
}) {
  const max = Math.max(1, ...metrics.weeklyTrend);
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh bg-muted/40"
    >
      <div className="gradient-navy text-white p-5 pt-6 pb-10 rounded-b-[28px]">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={onLogout}
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl gradient-brand flex items-center justify-center text-primary font-bold text-xl">
            {user?.initials ?? "PZ"}
          </div>
          <div>
            <p className="text-white/60 text-xs">Mobility Score</p>
            <h2 className="text-2xl font-bold">{user?.fullName ?? "Visitante"}</h2>
          </div>
          <div className="ml-auto text-right">
            <div className="flex items-center gap-1 justify-end">
              <Award className="h-4 w-4 text-brand" />
              <span className="text-lg font-bold">{500 + metrics.trips * 12}</span>
            </div>
            <p className="text-[10px] text-white/60">Top 12%</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 grid grid-cols-2 gap-3">
        <DashCard
          icon={<Clock className="h-5 w-5" />}
          value={`${metrics.timeSavedMin}min`}
          label="Tempo economizado"
          trend="+18%"
        />
        <DashCard
          icon={<DollarSign className="h-5 w-5" />}
          value={`R$${metrics.moneySaved}`}
          label="Dinheiro economizado"
          trend="+12%"
        />
        <DashCard
          icon={<Leaf className="h-5 w-5" />}
          value={`${metrics.co2AvoidedKg}kg`}
          label="CO₂ evitado"
          trend="+24%"
        />
        <DashCard
          icon={<RouteIcon className="h-5 w-5" />}
          value={`${metrics.trips}`}
          label="Viagens realizadas"
          trend={metrics.trips > 0 ? "+5" : "—"}
        />
      </div>

      <div className="p-4 mt-2">
        <div className="bg-white rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Atividade semanal</h3>
              <p className="text-xs text-muted-foreground">Viagens multimodais</p>
            </div>
            <TrendingUp className="h-5 w-5 text-brand" />
          </div>
          <div className="mt-5 flex items-end gap-2 h-32">
            {metrics.weeklyTrend.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(v / max) * 100}%` }}
                    transition={{ delay: i * 0.05 }}
                    className={`w-full rounded-t-lg ${i === 6 ? "gradient-brand" : "bg-primary/20"}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {metrics.modalSplit.length > 0 && (
          <div className="mt-3 bg-white rounded-2xl p-5 shadow-soft">
            <h3 className="font-bold">Modais usados</h3>
            <div className="mt-4 flex h-3 rounded-full overflow-hidden">
              {metrics.modalSplit.map((s) => (
                <div key={s.modal} style={{ width: `${s.pct}%`, background: s.color }} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-3">
              {metrics.modalSplit.map((s) => (
                <div key={s.modal} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs flex-1">{s.modal}</span>
                  <span className="text-xs font-semibold">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 bg-white rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Conquistas</h3>
            <button className="text-xs text-brand font-semibold">Ver todas</button>
          </div>
          <div className="mt-3 flex gap-3 overflow-auto">
            {[
              { icon: <Leaf />, label: "Eco Hero", sub: `${metrics.co2AvoidedKg}kg CO₂` },
              { icon: <Bike />, label: "Pedalista", sub: `${metrics.trips} trips` },
              { icon: <Award />, label: "Top 12%", sub: "Recife" },
              { icon: <Zap />, label: "Streak", sub: "Em chamas" },
            ].map((a) => (
              <div key={a.label} className="min-w-[100px] bg-muted rounded-2xl p-3 text-center">
                <div className="mx-auto h-10 w-10 rounded-xl gradient-brand text-primary flex items-center justify-center">
                  {a.icon}
                </div>
                <p className="text-xs font-bold mt-2">{a.label}</p>
                <p className="text-[10px] text-muted-foreground">{a.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </motion.div>
  );
}

function DashCard({
  icon,
  value,
  label,
  trend,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  trend: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-xl gradient-brand text-primary flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-semibold text-brand bg-accent px-2 py-0.5 rounded-full">
          {trend}
        </span>
      </div>
      <p className="text-xl font-bold mt-3">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
