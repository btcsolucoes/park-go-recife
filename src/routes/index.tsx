import { createFileRoute } from "@tanstack/react-router";
import ParkingZeroApp from "@/components/ParkingZeroApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Parking Zero — Estacione para não dirigir" },
      { name: "description", content: "Mobilidade inteligente no Recife Antigo: estacione fora do centro e complete o trajeto a pé, de bike, ônibus ou shuttle." },
      { property: "og:title", content: "Parking Zero" },
      { property: "og:description", content: "Estacione antes. Mova-se melhor." },
    ],
  }),
  component: ParkingZeroApp,
});
