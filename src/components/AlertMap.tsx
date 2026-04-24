import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/hooks/useLanguage";

// Fix Leaflet's default icon paths in bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl: iconRetina,
  shadowUrl,
});

export interface MapAlert {
  id: string;
  message: string;
  alert_type: string;
  language: string;
  latitude: number;
  longitude: number;
  priority: "normal" | "emergency";
  created_at: string;
}

interface Props {
  alerts: MapAlert[];
  selected: { lat: number; lng: number } | null;
  onSelect: (latLng: { lat: number; lng: number }) => void;
  autoCenterUser?: boolean;
  defaultCenter?: [number, number];
}

const makeIcon = (priority: "normal" | "emergency") =>
  L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="
      width:22px;height:22px;border-radius:9999px;
      background:${priority === "emergency" ? "hsl(0 84% 55%)" : "hsl(222 75% 38%)"};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ${priority === "emergency" ? "animation: pulse-emergency 2s ease-in-out infinite;" : ""}
    "></div>`,
  });

const userIcon = L.divIcon({
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: `<div style="
    width:16px;height:16px;border-radius:9999px;
    background:hsl(152 65% 38%);border:3px solid white;
    box-shadow:0 0 0 4px hsl(152 65% 38% / 0.25);
  "></div>`,
});

// Re-center map when newest alert changes
const Recenter = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 11), { duration: 0.8 });
  }, [center, map]);
  return null;
};

const ClickHandler = ({ onSelect }: { onSelect: Props["onSelect"] }) => {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

export const AlertMap = ({
  alerts,
  selected,
  onSelect,
  autoCenterUser = false,
  defaultCenter = [20.5937, 78.9629],
}: Props) => {
  const { t, lang } = useLanguage();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [forceCenterUser, setForceCenterUser] = useState(false);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);

  // Keep the initial viewport stable unless the user explicitly selects a point.
  const center: [number, number] = selected
    ? [selected.lat, selected.lng]
    : autoCenterUser && userPos && !hasCenteredOnUser
    ? userPos
    : defaultCenter;

  const recenter: [number, number] | null = forceCenterUser && userPos
    ? userPos
    : autoCenterUser && userPos && !hasCenteredOnUser
    ? userPos
    : selected
    ? [selected.lat, selected.lng]
    : null;

  useEffect(() => {
    if (forceCenterUser && userPos) setForceCenterUser(false);
  }, [forceCenterUser, userPos]);

  useEffect(() => {
    if (autoCenterUser && userPos && !hasCenteredOnUser) {
      setHasCenteredOnUser(true);
    }
  }, [autoCenterUser, hasCenteredOnUser, userPos]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setUserPos([p.coords.latitude, p.coords.longitude]);
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border shadow-card">
      <button
        type="button"
        className="absolute right-3 top-3 z-[500] rounded-md border bg-background px-3 py-1 text-xs font-medium shadow"
        onClick={() => setForceCenterUser(true)}
      >
        {t("locateMe")}
      </button>
      <MapContainer
        center={center}
        zoom={5}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onSelect={onSelect} />
        <Recenter center={recenter} />

        {selected && (
          <Marker position={[selected.lat, selected.lng]}>
            <Popup>
              <strong>{t("location")}</strong><br />
              {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}

        {userPos && (
          <Marker position={userPos} icon={userIcon}>
            <Popup>{t("yourLocation")}</Popup>
          </Marker>
        )}

        {alerts.map((a) => (
          <Marker
            key={a.id}
            position={[a.latitude, a.longitude]}
            icon={makeIcon(a.priority)}
          >
            <Popup>
              <div className="space-y-1 min-w-[200px]">
                <div className="font-semibold">
                  {a.priority === "emergency" ? "🚨 " : "📢 "}
                  {a.alert_type}
                </div>
                <div className="text-sm">{a.message}</div>
                <div className="text-xs opacity-70">
                  {a.language.toUpperCase()} · {new Date(a.created_at).toLocaleString(lang)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
