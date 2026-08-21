import { Marker } from "react-leaflet";
import L from "leaflet";

const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:28px;height:28px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(110,161,255,0.35);animation:pulse-ring 1.8s ease-out infinite;"></div>
      <div style="position:absolute;left:50%;top:50%;width:14px;height:14px;transform:translate(-50%,-50%);border-radius:9999px;background:#8fb8ff;box-shadow:0 0 12px 3px rgba(143,184,255,0.9), 0 0 0 3px rgba(5,7,15,0.9);"></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.4); opacity: 0.9; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    </style>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function SelectionMarker({ lat, lon }: { lat: number; lon: number }) {
  return <Marker position={[lat, lon]} icon={pinIcon} />;
}
