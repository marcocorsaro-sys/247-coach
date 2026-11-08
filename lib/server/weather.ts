// Meteo di domani per la buonanotte serale (Open-Meteo, senza chiave).
const WMO: Record<number, [string, string]> = {
  0: ["☀️", "sereno"], 1: ["🌤", "poco nuvoloso"], 2: ["⛅", "parzialmente nuvoloso"], 3: ["☁️", "coperto"],
  45: ["🌫", "nebbia"], 48: ["🌫", "nebbia gelata"], 51: ["🌦", "pioviggine"], 53: ["🌦", "pioviggine"], 55: ["🌧", "pioviggine intensa"],
  61: ["🌧", "pioggia debole"], 63: ["🌧", "pioggia"], 65: ["🌧", "pioggia forte"], 66: ["🌧", "pioggia gelata"], 67: ["🌧", "pioggia gelata"],
  71: ["🌨", "neve debole"], 73: ["🌨", "neve"], 75: ["❄️", "neve forte"], 80: ["🌦", "rovesci"], 81: ["🌧", "rovesci"], 82: ["⛈", "rovesci forti"],
  95: ["⛈", "temporale"], 96: ["⛈", "temporale con grandine"], 99: ["⛈", "temporale con grandine"],
};

/** Previsioni di un giorno (fino a ~16 giorni avanti) per una località. */
export async function weatherFor(place: string, dateISO: string): Promise<string | null> {
  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=it`, { signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } });
    const gj = (await g.json()) as { results?: { latitude: number; longitude: number; name: string }[] };
    const loc = gj.results?.[0];
    if (!loc) return null;
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m&timezone=Europe%2FRome&start_date=${dateISO}&end_date=${dateISO}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    const j = (await r.json()) as { daily?: Record<string, number[]>; hourly?: { time: string[]; temperature_2m: number[] } };
    const d = j.daily;
    if (!d?.weather_code?.length) return null;
    const [ico, desc] = WMO[d.weather_code[0]] ?? ["🌡", ""];
    const h7 = j.hourly?.time.findIndex((t) => t.endsWith("07:00")) ?? -1;
    const morning = h7 >= 0 ? Math.round(j.hourly!.temperature_2m[h7]) : null;
    return `${ico} ${loc.name}: ${desc}, ${Math.round(d.temperature_2m_min[0])}°/${Math.round(d.temperature_2m_max[0])}°${morning != null ? ` (alle 7: ${morning}°)` : ""}, pioggia ${Math.round(d.precipitation_probability_max[0] ?? 0)}%, vento fino a ${Math.round(d.wind_speed_10m_max[0])} km/h`;
  } catch {
    return null;
  }
}

/** Nome storico usato dalla buonanotte serale. */
export const tomorrowWeather = weatherFor;
