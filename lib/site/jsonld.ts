// ============================================================================
// Dati strutturati schema.org del sito gare (JSON-LD).
// Un @id stabile per l'evento (url della scheda + #event) e per il sito/editore,
// così tutte le pagine di una gara puntano allo stesso SportsEvent.
// ============================================================================
import type { Lang } from "@/lib/i18n/config";
import { racePath, raceTitle, type Race, type RacePlace, type RaceSegment } from "@/lib/site/races";

export const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
export const ORG_ID = `${SITE}/#org`;
export const WEBSITE_ID = `${SITE}/#website`;

export function orgLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "24/7 Coach",
    url: SITE,
    logo: { "@type": "ImageObject", url: `${SITE}/apple-icon` },
    sameAs: ["https://www.instagram.com/247coachai"],
  };
}

export function websiteLd(lang: Lang) {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": WEBSITE_ID, name: "24/7 Coach", url: SITE, inLanguage: lang, publisher: { "@id": ORG_ID } };
}

const ORGANIZER: Record<string, { name: string; url: string }> = {
  ironman: { name: "The IRONMAN Group", url: "https://www.ironman.com" },
  challenge: { name: "Challenge Family", url: "https://www.challenge-family.com" },
};

export function eventId(r: Race, lang: Lang) {
  return `${SITE}${racePath(r, lang)}#event`;
}

/** SportsEvent completo: tre frazioni come subEvent, luogo con indirizzo, organizzatore. */
export function raceEventLd(r: Race, lang: Lang, extra?: { offers?: unknown[]; geo?: { lat: number; lon: number } | null }) {
  const year = r.race_date?.slice(0, 4) ?? "";
  const title = `${raceTitle(r)} ${year}`.trim();
  const leg = (name: string, km: number | null, extra?: string) =>
    km == null ? null : { "@type": "SportsEvent", name: `${title} – ${name} ${km} km${extra ? ` (${extra})` : ""}`, sport: name, startDate: r.race_date ?? undefined, location: { "@id": `${eventId(r, lang)}-place` } };
  const org = ORGANIZER[r.series];
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": eventId(r, lang),
    name: title,
    alternateName: r.official_name ?? undefined,
    sport: "Triathlon",
    description: r.intro ?? r.tagline ?? undefined,
    url: `${SITE}${racePath(r, lang)}`,
    inLanguage: lang,
    startDate: r.race_date ?? undefined,
    endDate: r.race_date ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      "@id": `${eventId(r, lang)}-place`,
      name: [r.city, r.region, r.country].filter(Boolean).join(", "),
      address: { "@type": "PostalAddress", addressLocality: r.city ?? undefined, addressRegion: r.region ?? undefined, addressCountry: r.country ?? undefined },
      geo: extra?.geo ? { "@type": "GeoCoordinates", latitude: extra.geo.lat, longitude: extra.geo.lon } : undefined,
    },
    offers: extra?.offers?.length ? extra.offers : undefined,
    organizer: org ? { "@type": "Organization", name: org.name, url: org.url } : undefined,
    subEvent: [
      leg("Swim", r.swim_km, r.water_type ?? undefined),
      leg("Bike", r.bike_km, r.bike_dplus_m != null ? `${r.bike_dplus_m} m D+` : undefined),
      leg("Run", r.run_km),
    ].filter(Boolean),
    image: `${SITE}/opengraph-image`,
    keywords: [raceTitle(r), r.city, r.country, r.distance === "half" ? "70.3" : "full distance", "triathlon"].filter(Boolean).join(", "),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.url.startsWith("http") ? x.url : `${SITE}${x.url}` })),
  };
}

export function articleLd(o: { url: string; headline: string; description?: string | null; lang: Lang; modified?: string | null; about: string; section?: string; words?: number }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE}${o.url}#article`,
    mainEntityOfPage: `${SITE}${o.url}`,
    headline: o.headline.slice(0, 110),
    description: o.description ?? undefined,
    inLanguage: o.lang,
    dateModified: o.modified ?? undefined,
    datePublished: o.modified ?? undefined,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": o.about },
    articleSection: o.section,
    wordCount: o.words,
    image: `${SITE}/opengraph-image`,
  };
}

export function segmentsLd(url: string, name: string, segs: RaceSegment[]) {
  if (!segs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE}${url}#segments`,
    name,
    numberOfItems: segs.length,
    itemListElement: segs.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.km_from != null && s.km_to != null ? `km ${s.km_from}–${s.km_to}: ${s.title}` : s.title,
      description: [s.note, s.grade_pct != null ? `${s.grade_pct}%` : "", s.dplus_m != null ? `${s.dplus_m} m D+` : ""].filter(Boolean).join(" · ") || undefined,
    })),
  };
}

const PLACE_TYPE: Record<string, string> = { hotel: "LodgingBusiness", arrival: "Place", spectator: "Place", training: "Place", segment: "Place", food: "FoodEstablishment" };
export function placesLd(url: string, name: string, places: RacePlace[]) {
  if (!places.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE}${url}#places`,
    name,
    numberOfItems: places.length,
    itemListElement: places.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": PLACE_TYPE[p.kind] ?? "Place", name: p.title, description: p.body ?? undefined, url: p.url ?? undefined, address: p.area ? { "@type": "PostalAddress", addressLocality: p.area } : undefined },
    })),
  };
}

export function faqLd(faq: { q: string; a: string }[] | null | undefined) {
  if (!faq?.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}

// ---------------------------------------------------------------- pagine dati
const CUR: Record<string, string> = { "€": "EUR", "$": "USD", "us$": "USD", "a$": "AUD", "au$": "AUD", "nz$": "NZD", "c$": "CAD", "ca$": "CAD", "£": "GBP", r: "ZAR", rm: "MYR", "r$": "BRL", "¥": "JPY", "rmb": "CNY", "₩": "KRW", "kr": "SEK", "chf": "CHF", "₹": "INR", "฿": "THB", "s$": "SGD", "nt$": "TWD", "₱": "PHP", "rp": "IDR", "₺": "TRY" };
/** Valuta ISO 4217 da quella letta sul sito (simboli e sigle locali). */
export function isoCurrency(c: string | null | undefined): string | null {
  if (!c) return null;
  const k = c.trim().toLowerCase();
  if (CUR[k]) return CUR[k];
  return /^[a-z]{3}$/.test(k) ? k.toUpperCase() : null;
}
type Tier = { name: string; price: number | null; currency: string | null; notes: string | null };
/** Offer per SportsEvent.offers dai prezzi letti sulla pagina ufficiale. */
export function offersLd(o: { price_tiers?: Tier[]; register_url?: string | null; status?: string | null } | null | undefined, fallbackUrl: string, checkedAt?: string | null) {
  if (!o) return [];
  const st = (o.status ?? "").toLowerCase();
  const availability = /sold|esaur|full|closed|chius/.test(st) ? "https://schema.org/SoldOut" : /wait/.test(st) ? "https://schema.org/LimitedAvailability" : /open|apert/.test(st) ? "https://schema.org/InStock" : undefined;
  return (o.price_tiers ?? []).filter((t) => t.price != null && isoCurrency(t.currency)).map((t) => ({
    "@type": "Offer", name: t.name, price: t.price, priceCurrency: isoCurrency(t.currency)!,
    url: o.register_url ?? fallbackUrl, availability, validFrom: undefined, priceValidUntil: undefined,
    category: "Entry", description: t.notes ?? undefined, ...(checkedAt ? { dateModified: checkedAt } : {}),
  }));
}

type Shop = { name: string; address: string | null; website: string | null; phone: string | null; hours: string | null; repair: boolean; rental: boolean; lat: number; lon: number };
export function shopsLd(url: string, name: string, shops: Shop[]) {
  if (!shops.length) return null;
  return {
    "@context": "https://schema.org", "@type": "ItemList", "@id": `${SITE}${url}#shops`, name, numberOfItems: shops.length,
    itemListElement: shops.map((x, i) => ({
      "@type": "ListItem", position: i + 1,
      item: {
        "@type": "BikeStore", name: x.name, url: x.website ?? undefined, telephone: x.phone ?? undefined, openingHours: x.hours ?? undefined,
        address: x.address ? { "@type": "PostalAddress", streetAddress: x.address } : undefined,
        geo: { "@type": "GeoCoordinates", latitude: x.lat, longitude: x.lon },
        hasMap: `https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=17/${x.lat}/${x.lon}`,
      },
    })),
  };
}

type Fin = { name: string; country?: string; div: string; time: string; pos?: number };
export function resultsLd(url: string, name: string, rows: Fin[], event: string) {
  if (!rows.length) return null;
  return {
    "@context": "https://schema.org", "@type": "ItemList", "@id": `${SITE}${url}#results`, name, numberOfItems: rows.length, about: { "@id": event },
    itemListElement: rows.map((x, i) => ({
      "@type": "ListItem", position: i + 1, name: `${x.div}: ${x.name} ${x.time}`,
      item: { "@type": "Person", name: x.name, nationality: x.country ? { "@type": "Country", name: x.country } : undefined },
    })),
  };
}

export function climateDatasetLd(o: { url: string; name: string; description: string; lat: number; lon: number; place: string; firstYear: number; lastYear: number; lang: Lang }) {
  return {
    "@context": "https://schema.org", "@type": "Dataset", "@id": `${SITE}${o.url}#climate`, name: o.name, description: o.description, url: `${SITE}${o.url}`, inLanguage: o.lang,
    creator: { "@id": ORG_ID }, isBasedOn: "https://open-meteo.com/en/docs/historical-weather-api", license: "https://creativecommons.org/licenses/by/4.0/",
    temporalCoverage: `${o.firstYear}/${o.lastYear}`,
    spatialCoverage: { "@type": "Place", name: o.place, geo: { "@type": "GeoCoordinates", latitude: o.lat, longitude: o.lon } },
    variableMeasured: ["air temperature max", "air temperature min", "precipitation", "wind speed", "wind gusts", "relative humidity", "sea surface temperature"],
  };
}
