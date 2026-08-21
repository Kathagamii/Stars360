/** Reverse/forward geocoding via the free OpenStreetMap Nominatim API. */

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

const HEADERS = { Accept: "application/json" };

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=ru`;
    const res = await fetch(url, { headers: HEADERS, signal });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state;
    const country = a.country;
    if (city && country) return `${city}, ${country}`;
    if (country) return country;
    if (data.display_name) return data.display_name.split(",").slice(0, 2).join(", ");
    return null;
  } catch {
    return null;
  }
}

export async function searchPlace(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query
    )}&limit=5&accept-language=ru`;
    const res = await fetch(url, { headers: HEADERS, signal });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: { display_name: string; lat: string; lon: string }) => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }));
  } catch {
    return [];
  }
}
