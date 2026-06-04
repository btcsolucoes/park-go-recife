import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
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
  X,
  CircleParking,
  Route as RouteIcon,
} from "lucide-react";
import { PARKING_OPTIONS, DESTINATIONS, USER_METRICS, type ParkingOption, type Modal } from "@/lib/parking-data";

type Screen = "splash" | "auth" | "map" | "search" | "results" | "compare" | "route" | "dashboard";

const modalIcon = (m: Modal, className = "h-4 w-4") => {
  switch (m) {
    case "walk": return <Footprints className={className} />;
    case "bike": return <Bike className={className} />;
    case "bus": return <Bus className={className} />;
    default: return <Car className={className} />;
  }
};

export default function ParkingZeroApp() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [destination, setDestination] = useState("");
  const [selected, setSelected] = useState<ParkingOption | null>(null);

  return (
    <div className="min-h-dvh bg-muted/40 flex items-stretch justify-center">
      <div className="phone-shell shadow-pop">
        <AnimatePresence mode="wait">
          {screen === "splash" && <Splash key="s" onDone={() => setScreen("auth")} />}
          {screen === "auth" && <Auth key="a" onLogin={() => setScreen("map")} />}
          {screen === "map" && (
            <MapHome
              key="m"
              onSearch={() => setScreen("search")}
              onDashboard={() => setScreen("dashboard")}
            />
          )}
          {screen === "search" && (
            <SearchScreen
              key="se"
              destination={destination}
              setDestination={setDestination}
              onBack={() => setScreen("map")}
              onSubmit={(d) => { setDestination(d); setScreen("results"); }}
            />
          )}
          {screen === "results" && (
            <Results
              key="r"
              destination={destination || "Marco Zero, Recife Antigo"}
              onBack={() => setScreen("search")}
              onCompare={() => setScreen("compare")}
              onSelect={(p) => { setSelected(p); setScreen("route"); }}
            />
          )}
          {screen === "compare" && (
            <Compare
              key="c"
              onBack={() => setScreen("results")}
              onSelect={(p) => { setSelected(p); setScreen("route"); }}
            />
          )}
          {screen === "route" && selected && (
            <RouteScreen
              key="rt"
              option={selected}
              destination={destination || "Marco Zero, Recife Antigo"}
              onBack={() => setScreen("results")}
              onFinish={() => setScreen("dashboard")}
            />
          )}
          {screen === "dashboard" && (
            <Dashboard key="d" onBack={() => setScreen("map")} />
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }}
          >
            <Zap className="h-5 w-5 text-brand" fill="currentColor" />
          </motion.div>
        </motion.div>
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Parking Zero</h1>
          <p className="text-white/60 mt-2 text-sm">Estacione antes. Mova-se melhor.</p>
        </motion.div>
      </div>
      <motion.button
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
        onClick={onDone}
        className="w-full bg-brand text-primary font-semibold py-4 rounded-2xl active:scale-[0.98] transition"
      >
        Começar
      </motion.button>
    </motion.div>
  );
}

/* ---------------- AUTH ---------------- */
function Auth({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col p-6 pt-12"
    >
      <div className="flex items-center gap-3 mb-10">
        <div className="h-10 w-10 rounded-xl gradient-navy flex items-center justify-center">
          <CircleParking className="h-6 w-6 text-brand" />
        </div>
        <span className="font-display text-xl font-bold">Parking Zero</span>
      </div>

      <h2 className="text-3xl font-bold">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h2>
      <p className="text-muted-foreground text-sm mt-2">
        Encontre vaga, economize tempo e reduza emissões no Recife Antigo.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {mode === "signup" && (
          <Field label="Nome" placeholder="João Silva" />
        )}
        <Field label="E-mail" placeholder="voce@email.com" type="email" />
        <Field label="Senha" placeholder="••••••••" type="password" />
      </div>

      <button
        onClick={onLogin}
        className="mt-8 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-[0.98] transition shadow-soft"
      >
        {mode === "login" ? "Entrar" : "Criar conta"}
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">ou continue com</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["Google", "Apple"].map((p) => (
          <button key={p} className="border border-border rounded-2xl py-3 font-medium text-sm hover:bg-muted">
            {p}
          </button>
        ))}
      </div>

      <p className="mt-auto text-center text-sm text-muted-foreground pt-8">
        {mode === "login" ? "Novo por aqui? " : "Já tem conta? "}
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-brand font-semibold">
          {mode === "login" ? "Cadastre-se" : "Entrar"}
        </button>
      </p>
    </motion.div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
function MapHome({ onSearch, onDashboard }: { onSearch: () => void; onDashboard: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-dvh relative"
    >
      <MapCanvas pins={PARKING_OPTIONS} highlightUser />
      {/* Top bar */}
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
        <button onClick={onDashboard} className="glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft">
          <User className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Side controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[Layers, Locate, Navigation2].map((Icon, i) => (
          <button key={i} className="h-11 w-11 rounded-full bg-white shadow-soft flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </button>
        ))}
      </div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 200 }} animate={{ y: 0 }} transition={{ type: "spring", damping: 22 }}
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] shadow-pop p-5 pb-8"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Olá, João</p>
            <h3 className="text-xl font-bold mt-0.5">Estacione para não dirigir</h3>
          </div>
          <span className="text-xs font-semibold gradient-brand text-primary px-2.5 py-1 rounded-full">
            Recife Antigo
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={<Clock className="h-4 w-4" />} value="184min" label="economizados" />
          <Stat icon={<DollarSign className="h-4 w-4" />} value="R$312" label="este mês" />
          <Stat icon={<Leaf className="h-4 w-4" />} value="14.8kg" label="CO₂ evitado" />
        </div>

        <button
          onClick={onSearch}
          className="mt-5 w-full gradient-brand text-primary font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Search className="h-5 w-5" />
          Buscar destino
        </button>

        <div className="mt-4 flex gap-2">
          {DESTINATIONS.slice(0, 3).map((d) => (
            <button key={d} onClick={onSearch} className="text-xs bg-muted px-3 py-2 rounded-full text-foreground/80 whitespace-nowrap overflow-hidden text-ellipsis">
              <MapPin className="inline h-3 w-3 mr-1 text-brand" />{d.split(",")[0]}
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
      <div className="h-7 w-7 rounded-lg bg-white text-brand flex items-center justify-center">{icon}</div>
      <p className="text-sm font-bold mt-2">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

/* ---------------- MAP CANVAS ---------------- */
function MapCanvas({
  pins, highlightUser, route,
}: {
  pins: ParkingOption[];
  highlightUser?: boolean;
  route?: { from: { x: number; y: number }; to: { x: number; y: number }; via: { x: number; y: number } };
}) {
  return (
    <div className="absolute inset-0 map-bg overflow-hidden">
      {/* Water river */}
      <div className="absolute inset-x-0 top-[55%] h-[18%] bg-[#bcd6e8] opacity-80" style={{ transform: "rotate(-4deg) scaleX(1.4)" }} />
      {/* Blocks */}
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="absolute bg-white/60 rounded-md"
          style={{
            left: `${(i * 37) % 90}%`,
            top: `${(i * 53) % 80}%`,
            width: `${40 + (i % 4) * 20}px`,
            height: `${30 + (i % 3) * 18}px`,
          }}
        />
      ))}

      {/* Route line */}
      {route && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d={`M ${route.from.x}% ${route.from.y}% Q ${route.via.x}% ${route.via.y - 10}%, ${route.to.x}% ${route.to.y}%`}
            stroke="var(--color-brand)"
            strokeWidth="4"
            strokeDasharray="2 6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M ${route.from.x}% ${route.from.y}% L ${route.via.x}% ${route.via.y}%`}
            stroke="var(--color-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}

      {/* Pins */}
      {pins.map((p) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${p.coords.x}%`, top: `${p.coords.y}%` }}
        >
          <div className="bg-primary text-white px-2.5 py-1.5 rounded-xl shadow-pop flex items-center gap-1.5 text-xs font-semibold">
            <CircleParking className="h-3.5 w-3.5 text-brand" />
            R${p.price}
          </div>
          <div className="h-2 w-2 rounded-full bg-primary mx-auto -mt-0.5" />
        </div>
      ))}

      {/* User location */}
      {highlightUser && (
        <div className="absolute" style={{ left: "50%", top: "70%" }}>
          <div className="relative h-4 w-4 -translate-x-1/2 -translate-y-1/2">
            <div className="pulse-ring absolute inset-0 rounded-full" />
            <div className="absolute inset-0 rounded-full bg-brand border-2 border-white shadow-pop" />
          </div>
        </div>
      )}

      {/* Destination */}
      {route && (
        <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${route.to.x}%`, top: `${route.to.y}%` }}>
          <div className="h-6 w-6 rounded-full bg-destructive border-2 border-white shadow-pop flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- SEARCH ---------------- */
function SearchScreen({
  destination, setDestination, onBack, onSubmit,
}: {
  destination: string;
  setDestination: (s: string) => void;
  onBack: () => void;
  onSubmit: (d: string) => void;
}) {
  const [q, setQ] = useState(destination);
  const filtered = DESTINATIONS.filter((d) => d.toLowerCase().includes(q.toLowerCase()));
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-dvh bg-background flex flex-col"
    >
      <div className="p-4 pt-6 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted">
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
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit(q || "Marco Zero, Recife Antigo")}
              placeholder="Para onde você vai?"
              className="flex-1 outline-none text-sm font-medium placeholder:text-muted-foreground bg-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <p className="px-5 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sugestões no Recife Antigo
        </p>
        {filtered.map((d) => (
          <button
            key={d}
            onClick={() => { setDestination(d); onSubmit(d); }}
            className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-muted text-left border-b border-border/60"
          >
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <MapPin className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{d.split(",")[0]}</p>
              <p className="text-xs text-muted-foreground">{d.split(",")[1]?.trim() || "Recife, PE"}</p>
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
  destination, onBack, onCompare, onSelect,
}: {
  destination: string;
  onBack: () => void;
  onCompare: () => void;
  onSelect: (p: ParkingOption) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col"
    >
      <div className="relative h-[38vh]">
        <MapCanvas pins={PARKING_OPTIONS} />
        <div className="absolute top-0 inset-x-0 p-4 pt-6 flex items-center gap-3">
          <button onClick={onBack} className="glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="flex-1 glass rounded-2xl px-4 py-2.5 shadow-soft">
            <p className="text-[10px] text-muted-foreground">Destino</p>
            <p className="text-sm font-semibold truncate">{destination}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[28px] -mt-6 relative shadow-pop p-5 pb-8 overflow-auto">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h3 className="text-lg font-bold">3 melhores opções</h3>
            <p className="text-xs text-muted-foreground">Ranqueadas por tempo total</p>
          </div>
          <button onClick={onCompare} className="text-xs font-semibold text-brand bg-accent px-3 py-2 rounded-full">
            Comparar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {PARKING_OPTIONS.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
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
                      <span className="text-[10px] font-semibold text-brand">
                        • {p.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm mt-1.5 truncate">{p.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">R${p.price}</p>
                  <p className="text-[10px] text-muted-foreground">/ 2h</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <Pill icon={<Clock className="h-3 w-3" />}>{p.totalTime} min</Pill>
                <Pill icon={modalIcon(p.modal, "h-3 w-3")}>{p.modalTime}min {p.modalLabel.split(" ")[0]}</Pill>
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
      {icon}{children}
    </span>
  );
}

/* ---------------- COMPARE ---------------- */
function Compare({ onBack, onSelect }: { onBack: () => void; onSelect: (p: ParkingOption) => void }) {
  const rows: { label: string; key: (p: ParkingOption) => string; best?: (p: ParkingOption) => boolean }[] = [
    { label: "Preço", key: (p) => `R$${p.price}`, best: (p) => p.price === Math.min(...PARKING_OPTIONS.map((x) => x.price)) },
    { label: "Tempo total", key: (p) => `${p.totalTime} min`, best: (p) => p.totalTime === Math.min(...PARKING_OPTIONS.map((x) => x.totalTime)) },
    { label: "Modal", key: (p) => p.modalLabel },
    { label: "Distância", key: (p) => `${p.distanceKm} km` },
    { label: "Vagas livres", key: (p) => `${p.spotsAvailable}` },
    { label: "Avaliação", key: (p) => `★ ${p.rating}` },
    { label: "CO₂ evitado", key: (p) => `${p.co2Saved} kg`, best: (p) => p.co2Saved === Math.max(...PARKING_OPTIONS.map((x) => x.co2Saved)) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="min-h-dvh bg-background flex flex-col"
    >
      <div className="p-4 pt-6 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-bold">Comparar opções</h2>
          <p className="text-xs text-muted-foreground">Veja qual combina com você</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-3 gap-2">
        {PARKING_OPTIONS.map((p, i) => (
          <div key={p.id} className="bg-white border border-border rounded-2xl p-3 text-center">
            <span className="text-[10px] font-bold text-primary bg-brand/20 px-2 py-0.5 rounded">
              {String.fromCharCode(65 + i)}
            </span>
            <p className="mt-2 text-xs font-bold leading-tight">{p.name.replace("Estacionamento ", "")}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 flex-1 overflow-auto">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {rows.map((r, idx) => (
            <div key={r.label} className={`grid grid-cols-4 ${idx > 0 ? "border-t border-border" : ""}`}>
              <div className="col-span-1 p-3 text-xs font-medium text-muted-foreground bg-muted/40">
                {r.label}
              </div>
              {PARKING_OPTIONS.map((p) => {
                const isBest = r.best?.(p);
                return (
                  <div key={p.id} className={`p-3 text-xs font-semibold text-center ${isBest ? "text-brand" : ""}`}>
                    {r.key(p)}{isBest && <Check className="inline h-3 w-3 ml-1" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 grid grid-cols-3 gap-2 border-t border-border bg-white">
        {PARKING_OPTIONS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`py-3 rounded-2xl text-xs font-semibold ${
              i === 1 ? "gradient-brand text-primary" : "bg-muted text-foreground"
            }`}
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
  option, destination, onBack, onFinish,
}: {
  option: ParkingOption;
  destination: string;
  onBack: () => void;
  onFinish: () => void;
}) {
  const steps = [
    { icon: <Car className="h-4 w-4" />, label: `Dirigir até ${option.name}`, time: option.driveTime, color: "bg-primary text-white" },
    { icon: <CircleParking className="h-4 w-4" />, label: `Estacionar (R$${option.price})`, time: 2, color: "bg-brand text-primary" },
    { icon: modalIcon(option.modal, "h-4 w-4"), label: `${option.modalLabel} até o destino`, time: option.modalTime, color: "bg-accent text-primary" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-dvh flex flex-col"
    >
      <div className="relative h-[42vh]">
        <MapCanvas
          pins={[option]}
          route={{ from: { x: 50, y: 70 }, via: option.coords, to: { x: 70, y: 80 } }}
        />
        <button onClick={onBack} className="absolute top-6 left-4 glass h-11 w-11 rounded-full flex items-center justify-center shadow-soft">
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
            <p className="text-xs text-brand font-semibold uppercase tracking-wider">Rota Multimodal</p>
            <h3 className="text-lg font-bold mt-1">{option.name}</h3>
            <p className="text-xs text-muted-foreground">para {destination}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">R${option.price}</p>
            <p className="text-[10px] text-muted-foreground">total</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.time} min</p>
              </div>
              {i < steps.length - 1 && <div className="text-muted-foreground"><ChevronRight className="h-4 w-4" /></div>}
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Savings icon={<Clock className="h-4 w-4" />} label="Tempo" value="-12min" />
          <Savings icon={<DollarSign className="h-4 w-4" />} label="Economia" value="-R$18" />
          <Savings icon={<Leaf className="h-4 w-4" />} label="CO₂" value={`-${option.co2Saved}kg`} />
        </div>

        <button
          onClick={onFinish}
          className="mt-5 w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl active:scale-[0.98] transition shadow-soft flex items-center justify-center gap-2"
        >
          <Navigation2 className="h-5 w-5" />
          Iniciar navegação
        </button>
      </div>
    </motion.div>
  );
}

function Savings({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-accent/60 rounded-2xl p-3 text-center">
      <div className="h-7 w-7 rounded-lg bg-white text-brand mx-auto flex items-center justify-center">{icon}</div>
      <p className="text-sm font-bold mt-2 text-brand">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ onBack }: { onBack: () => void }) {
  const m = USER_METRICS;
  const max = Math.max(...m.weeklyTrend);
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-dvh bg-muted/40"
    >
      <div className="gradient-navy text-white p-5 pt-6 pb-10 rounded-b-[28px]">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl gradient-brand flex items-center justify-center text-primary font-bold text-xl">
            JS
          </div>
          <div>
            <p className="text-white/60 text-xs">Mobility Score</p>
            <h2 className="text-2xl font-bold">João Silva</h2>
          </div>
          <div className="ml-auto text-right">
            <div className="flex items-center gap-1 justify-end">
              <Award className="h-4 w-4 text-brand" />
              <span className="text-lg font-bold">847</span>
            </div>
            <p className="text-[10px] text-white/60">Top 12%</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 grid grid-cols-2 gap-3">
        <DashCard icon={<Clock className="h-5 w-5" />} value={`${m.timeSavedMin}min`} label="Tempo economizado" trend="+18%" />
        <DashCard icon={<DollarSign className="h-5 w-5" />} value={`R$${m.moneySaved}`} label="Dinheiro economizado" trend="+12%" />
        <DashCard icon={<Leaf className="h-5 w-5" />} value={`${m.co2AvoidedKg}kg`} label="CO₂ evitado" trend="+24%" />
        <DashCard icon={<RouteIcon className="h-5 w-5" />} value={`${m.trips}`} label="Viagens realizadas" trend="+5" />
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
            {m.weeklyTrend.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ delay: i * 0.05 }}
                    className={`w-full rounded-t-lg ${i === 5 ? "gradient-brand" : "bg-primary/20"}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 bg-white rounded-2xl p-5 shadow-soft">
          <h3 className="font-bold">Modais usados</h3>
          <div className="mt-4 flex h-3 rounded-full overflow-hidden">
            {m.modalSplit.map((s) => (
              <div key={s.modal} style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-3">
            {m.modalSplit.map((s) => (
              <div key={s.modal} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs flex-1">{s.modal}</span>
                <span className="text-xs font-semibold">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 bg-white rounded-2xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Conquistas</h3>
            <button className="text-xs text-brand font-semibold">Ver todas</button>
          </div>
          <div className="mt-3 flex gap-3 overflow-auto">
            {[
              { icon: <Leaf />, label: "Eco Hero", sub: "10kg CO₂" },
              { icon: <Bike />, label: "Pedalista", sub: "20 trips" },
              { icon: <Award />, label: "Top 12%", sub: "Recife" },
              { icon: <Zap />, label: "Streak 7d", sub: "Em chamas" },
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

function DashCard({ icon, value, label, trend }: { icon: React.ReactNode; value: string; label: string; trend: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-xl gradient-brand text-primary flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-semibold text-brand bg-accent px-2 py-0.5 rounded-full">{trend}</span>
      </div>
      <p className="text-xl font-bold mt-3">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
