// ============================================================================
// Pagine "facet" di ogni gara: una pagina per ogni ricerca tipica
// ("Ironman Lanzarote bike course", "percorso nuoto Ironman Cervia"...),
// con slug tradotti per lingua. Ogni facet unisce i dati strutturati della
// gara (distanze, dislivello, tratti, profilo, luoghi) con l'articolo-guida
// dello stesso tema, che prima viveva a un URL con slug italiano: quei vecchi
// URL fanno redirect permanente al facet.
// ============================================================================
import type { Lang } from "@/lib/i18n/config";

export const FACETS = ["swim", "bike", "run", "raceday", "travel"] as const;
export type Facet = (typeof FACETS)[number];

/** Tema dell'articolo-guida → facet che lo ospita. */
export const TOPIC_FACET: Record<string, Facet> = { swim: "swim", bike: "bike", run: "run", raceday: "raceday", logistics: "travel" };

type FacetText = { slug: string; label: string; title: string; desc: string };
// title/desc: {race} = "Ironman Lanzarote", {km} = distanza, {dplus} = dislivello bici
export const FACET_I18N: Record<Lang, Record<Facet, FacetText>> = {
  en: {
    swim: { slug: "swim-course", label: "Swim course", title: "{race} swim course: {km} km, water, wetsuit and start", desc: "{race} swim course explained: {km} km, water type and temperature, wetsuit rule, start format, sighting and what athletes say." },
    bike: { slug: "bike-course", label: "Bike course", title: "{race} bike course: {km} km, {dplus} m elevation, climbs and wind", desc: "{race} bike course: {km} km and {dplus} m of climbing, segment by segment, elevation profile, wind, pacing and nutrition advice." },
    run: { slug: "run-course", label: "Run course", title: "{race} run course: {km} km, laps, heat and pacing", desc: "{race} run course: {km} km, laps, terrain, heat, aid stations and pacing strategy, segment by segment." },
    raceday: { slug: "race-day", label: "Race day", title: "{race} race day: schedule, split times and plan B", desc: "{race} race day guide: timeline, target splits by finish time, mistakes to avoid and plan B." },
    travel: { slug: "travel-and-hotels", label: "Travel & hotels", title: "{race}: how to get there, where to stay, where to watch", desc: "{race} travel guide: getting there, hotels near the race, where to watch and where to train." },
  },
  it: {
    swim: { slug: "percorso-nuoto", label: "Percorso nuoto", title: "{race} percorso nuoto: {km} km, acqua, muta e partenza", desc: "Il percorso nuoto di {race}: {km} km, tipo e temperatura dell'acqua, regola muta, partenza, orientamento e cosa raccontano gli atleti." },
    bike: { slug: "percorso-bici", label: "Percorso bici", title: "{race} percorso bici: {km} km, {dplus} m di dislivello, salite e vento", desc: "Il percorso bici di {race}: {km} km e {dplus} m di dislivello tratto per tratto, altimetria, vento, gestione dello sforzo e alimentazione." },
    run: { slug: "percorso-corsa", label: "Percorso corsa", title: "{race} percorso corsa: {km} km, giri, caldo e ritmo", desc: "Il percorso corsa di {race}: {km} km, giri, fondo, caldo, ristori e strategia di ritmo, tratto per tratto." },
    raceday: { slug: "giorno-gara", label: "Giorno gara", title: "{race} giorno gara: programma, tempi parziali e piano B", desc: "Guida al giorno gara di {race}: cronologia, parziali per tempo finale, errori da evitare e piano B." },
    travel: { slug: "come-arrivare-dove-dormire", label: "Viaggio e hotel", title: "{race}: come arrivare, dove dormire, dove vedere la gara", desc: "Guida di viaggio a {race}: come arrivare, hotel vicino alla gara, dove vedere la gara e dove allenarsi." },
  },
  de: {
    swim: { slug: "schwimmstrecke", label: "Schwimmstrecke", title: "{race} Schwimmstrecke: {km} km, Wasser, Neopren und Start", desc: "Die Schwimmstrecke beim {race}: {km} km, Gewässer und Wassertemperatur, Neoprenregel, Startmodus, Orientierung und Erfahrungen der Athleten." },
    bike: { slug: "radstrecke", label: "Radstrecke", title: "{race} Radstrecke: {km} km, {dplus} Höhenmeter, Anstiege und Wind", desc: "Die Radstrecke beim {race}: {km} km und {dplus} Höhenmeter Abschnitt für Abschnitt, Höhenprofil, Wind, Pacing und Verpflegung." },
    run: { slug: "laufstrecke", label: "Laufstrecke", title: "{race} Laufstrecke: {km} km, Runden, Hitze und Pacing", desc: "Die Laufstrecke beim {race}: {km} km, Runden, Untergrund, Hitze, Verpflegungsstellen und Pacing-Strategie." },
    raceday: { slug: "renntag", label: "Renntag", title: "{race} Renntag: Zeitplan, Splitzeiten und Plan B", desc: "Renntag-Guide zum {race}: Ablauf, Splitzeiten nach Zielzeit, typische Fehler und Plan B." },
    travel: { slug: "anreise-und-unterkunft", label: "Anreise & Hotels", title: "{race}: Anreise, Unterkunft, Zuschauen", desc: "Reiseführer zum {race}: Anreise, Hotels nahe der Strecke, beste Zuschauerplätze und Trainingsstrecken." },
  },
  fr: {
    swim: { slug: "parcours-natation", label: "Parcours natation", title: "{race} parcours natation : {km} km, eau, combinaison et départ", desc: "Le parcours natation de l'{race} : {km} km, type et température de l'eau, règle combinaison, départ, orientation et retours d'athlètes." },
    bike: { slug: "parcours-velo", label: "Parcours vélo", title: "{race} parcours vélo : {km} km, {dplus} m de D+, montées et vent", desc: "Le parcours vélo de l'{race} : {km} km et {dplus} m de dénivelé tronçon par tronçon, profil, vent, gestion de l'effort et nutrition." },
    run: { slug: "parcours-course-a-pied", label: "Parcours course à pied", title: "{race} parcours course à pied : {km} km, boucles, chaleur et allure", desc: "Le parcours course à pied de l'{race} : {km} km, boucles, terrain, chaleur, ravitaillements et stratégie d'allure." },
    raceday: { slug: "jour-de-course", label: "Jour de course", title: "{race} jour de course : programme, temps intermédiaires et plan B", desc: "Guide du jour de course de l'{race} : déroulé, temps de passage selon l'objectif, erreurs à éviter et plan B." },
    travel: { slug: "acces-et-hebergement", label: "Accès & hôtels", title: "{race} : comment y aller, où dormir, où regarder", desc: "Guide pratique de l'{race} : accès, hôtels proches, meilleurs endroits pour regarder et pour s'entraîner." },
  },
  es: {
    swim: { slug: "recorrido-natacion", label: "Recorrido natación", title: "{race} recorrido de natación: {km} km, agua, neopreno y salida", desc: "El recorrido de natación del {race}: {km} km, tipo y temperatura del agua, regla de neopreno, salida, orientación y lo que cuentan los atletas." },
    bike: { slug: "recorrido-bici", label: "Recorrido bici", title: "{race} recorrido de bici: {km} km, {dplus} m de desnivel, subidas y viento", desc: "El recorrido de bici del {race}: {km} km y {dplus} m de desnivel tramo a tramo, perfil, viento, ritmo y nutrición." },
    run: { slug: "recorrido-carrera", label: "Recorrido carrera", title: "{race} recorrido a pie: {km} km, vueltas, calor y ritmo", desc: "El recorrido a pie del {race}: {km} km, vueltas, terreno, calor, avituallamientos y estrategia de ritmo." },
    raceday: { slug: "dia-de-carrera", label: "Día de carrera", title: "{race} día de carrera: horarios, parciales y plan B", desc: "Guía del día de carrera del {race}: cronología, parciales según tiempo final, errores a evitar y plan B." },
    travel: { slug: "como-llegar-y-alojamiento", label: "Viaje y hoteles", title: "{race}: cómo llegar, dónde dormir, dónde verla", desc: "Guía de viaje del {race}: cómo llegar, hoteles cerca de la carrera, dónde verla y dónde entrenar." },
  },
  pt: {
    swim: { slug: "percurso-natacao", label: "Percurso natação", title: "{race} percurso de natação: {km} km, água, fato e partida", desc: "O percurso de natação do {race}: {km} km, tipo e temperatura da água, regra do fato, partida, orientação e relatos dos atletas." },
    bike: { slug: "percurso-ciclismo", label: "Percurso ciclismo", title: "{race} percurso de ciclismo: {km} km, {dplus} m de desnível, subidas e vento", desc: "O percurso de ciclismo do {race}: {km} km e {dplus} m de desnível troço a troço, perfil, vento, ritmo e nutrição." },
    run: { slug: "percurso-corrida", label: "Percurso corrida", title: "{race} percurso de corrida: {km} km, voltas, calor e ritmo", desc: "O percurso de corrida do {race}: {km} km, voltas, piso, calor, abastecimentos e estratégia de ritmo." },
    raceday: { slug: "dia-da-prova", label: "Dia da prova", title: "{race} dia da prova: horários, parciais e plano B", desc: "Guia do dia da prova do {race}: cronologia, parciais por tempo final, erros a evitar e plano B." },
    travel: { slug: "como-chegar-e-alojamento", label: "Viagem e hotéis", title: "{race}: como chegar, onde ficar, onde assistir", desc: "Guia de viagem do {race}: como chegar, hotéis perto da prova, onde assistir e onde treinar." },
  },
  nl: {
    swim: { slug: "zwemparcours", label: "Zwemparcours", title: "{race} zwemparcours: {km} km, water, wetsuit en start", desc: "Het zwemparcours van {race}: {km} km, type en temperatuur van het water, wetsuitregel, start, oriëntatie en ervaringen van atleten." },
    bike: { slug: "fietsparcours", label: "Fietsparcours", title: "{race} fietsparcours: {km} km, {dplus} hoogtemeters, klimmen en wind", desc: "Het fietsparcours van {race}: {km} km en {dplus} hoogtemeters per segment, hoogteprofiel, wind, pacing en voeding." },
    run: { slug: "loopparcours", label: "Loopparcours", title: "{race} loopparcours: {km} km, rondes, hitte en pacing", desc: "Het loopparcours van {race}: {km} km, rondes, ondergrond, hitte, verzorgingsposten en pacingstrategie." },
    raceday: { slug: "wedstrijddag", label: "Wedstrijddag", title: "{race} wedstrijddag: schema, splittijden en plan B", desc: "Gids voor de wedstrijddag van {race}: tijdlijn, splittijden per eindtijd, fouten om te vermijden en plan B." },
    travel: { slug: "reizen-en-overnachten", label: "Reis & hotels", title: "{race}: hoe kom je er, waar overnachten, waar kijken", desc: "Reisgids voor {race}: hoe je er komt, hotels bij de wedstrijd, waar je kunt kijken en trainen." },
  },
  da: {
    swim: { slug: "svommerute", label: "Svømmerute", title: "{race} svømmerute: {km} km, vand, våddragt og start", desc: "Svømmeruten ved {race}: {km} km, vandtype og temperatur, våddragtsregel, start, orientering og atleternes erfaringer." },
    bike: { slug: "cykelrute", label: "Cykelrute", title: "{race} cykelrute: {km} km, {dplus} højdemeter, stigninger og vind", desc: "Cykelruten ved {race}: {km} km og {dplus} højdemeter afsnit for afsnit, højdeprofil, vind, pacing og ernæring." },
    run: { slug: "loberute", label: "Løberute", title: "{race} løberute: {km} km, omgange, varme og pacing", desc: "Løberuten ved {race}: {km} km, omgange, underlag, varme, depoter og pacingstrategi." },
    raceday: { slug: "lobsdag", label: "Løbsdag", title: "{race} løbsdag: tidsplan, mellemtider og plan B", desc: "Guide til løbsdagen ved {race}: tidslinje, mellemtider efter sluttid, fejl du skal undgå og plan B." },
    travel: { slug: "rejse-og-overnatning", label: "Rejse & hoteller", title: "{race}: transport, overnatning, hvor du kan se løbet", desc: "Rejseguide til {race}: transport, hoteller tæt på løbet, hvor du kan se løbet og træne." },
  },
  sv: {
    swim: { slug: "simbana", label: "Simbana", title: "{race} simbana: {km} km, vatten, våtdräkt och start", desc: "Simbanan på {race}: {km} km, vattentyp och temperatur, våtdräktsregel, start, orientering och atleternas erfarenheter." },
    bike: { slug: "cykelbana", label: "Cykelbana", title: "{race} cykelbana: {km} km, {dplus} höjdmeter, backar och vind", desc: "Cykelbanan på {race}: {km} km och {dplus} höjdmeter avsnitt för avsnitt, höjdprofil, vind, pacing och nutrition." },
    run: { slug: "lopbana", label: "Löpbana", title: "{race} löpbana: {km} km, varv, värme och tempo", desc: "Löpbanan på {race}: {km} km, varv, underlag, värme, vätskestationer och tempostrategi." },
    raceday: { slug: "tavlingsdag", label: "Tävlingsdag", title: "{race} tävlingsdag: schema, mellantider och plan B", desc: "Guide till tävlingsdagen på {race}: tidslinje, mellantider efter sluttid, misstag att undvika och plan B." },
    travel: { slug: "resa-och-boende", label: "Resa & hotell", title: "{race}: hur du tar dig dit, var du bor, var du tittar", desc: "Reseguide till {race}: hur du tar dig dit, hotell nära tävlingen, var du kan titta och träna." },
  },
  no: {
    swim: { slug: "svommetrase", label: "Svømmetrasé", title: "{race} svømmetrasé: {km} km, vann, våtdrakt og start", desc: "Svømmetraseen i {race}: {km} km, vanntype og temperatur, våtdraktregel, start, orientering og utøvernes erfaringer." },
    bike: { slug: "sykkeltrase", label: "Sykkeltrasé", title: "{race} sykkeltrasé: {km} km, {dplus} høydemeter, bakker og vind", desc: "Sykkeltraseen i {race}: {km} km og {dplus} høydemeter del for del, høydeprofil, vind, pacing og ernæring." },
    run: { slug: "lopetrase", label: "Løpetrasé", title: "{race} løpetrasé: {km} km, runder, varme og tempo", desc: "Løpetraseen i {race}: {km} km, runder, underlag, varme, matstasjoner og tempostrategi." },
    raceday: { slug: "konkurransedag", label: "Konkurransedag", title: "{race} konkurransedag: tidsplan, mellomtider og plan B", desc: "Guide til konkurransedagen i {race}: tidslinje, mellomtider etter sluttid, feil å unngå og plan B." },
    travel: { slug: "reise-og-overnatting", label: "Reise og hotell", title: "{race}: hvordan komme dit, hvor bo, hvor se løpet", desc: "Reiseguide til {race}: hvordan komme dit, hotell nær løpet, hvor du kan se løpet og trene." },
  },
  fi: {
    swim: { slug: "uintireitti", label: "Uintireitti", title: "{race} uintireitti: {km} km, vesi, märkäpuku ja lähtö", desc: "{race} uintireitti: {km} km, vesi ja lämpötila, märkäpukusääntö, lähtö, suunnistus ja urheilijoiden kokemukset." },
    bike: { slug: "pyorareitti", label: "Pyöräreitti", title: "{race} pyöräreitti: {km} km, {dplus} m nousua, mäet ja tuuli", desc: "{race} pyöräreitti: {km} km ja {dplus} m nousua osuus kerrallaan, korkeusprofiili, tuuli, vauhdinjako ja ravinto." },
    run: { slug: "juoksureitti", label: "Juoksureitti", title: "{race} juoksureitti: {km} km, kierrokset, kuumuus ja vauhti", desc: "{race} juoksureitti: {km} km, kierrokset, alusta, kuumuus, huoltopisteet ja vauhtistrategia." },
    raceday: { slug: "kilpailupaiva", label: "Kilpailupäivä", title: "{race} kilpailupäivä: aikataulu, väliajat ja varasuunnitelma", desc: "{race} kilpailupäivän opas: aikajana, väliajat tavoiteajan mukaan, vältettävät virheet ja varasuunnitelma." },
    travel: { slug: "matka-ja-majoitus", label: "Matka ja hotellit", title: "{race}: miten pääsee, missä yöpyä, missä katsoa", desc: "{race} matkaopas: saapuminen, hotellit kilpailun lähellä, katselupaikat ja harjoittelureitit." },
  },
  pl: {
    swim: { slug: "trasa-plywacka", label: "Trasa pływacka", title: "{race} trasa pływacka: {km} km, woda, pianka i start", desc: "Trasa pływacka {race}: {km} km, rodzaj i temperatura wody, zasady pianki, start, nawigacja i relacje zawodników." },
    bike: { slug: "trasa-rowerowa", label: "Trasa rowerowa", title: "{race} trasa rowerowa: {km} km, {dplus} m przewyższenia, podjazdy i wiatr", desc: "Trasa rowerowa {race}: {km} km i {dplus} m przewyższenia odcinek po odcinku, profil, wiatr, tempo i odżywianie." },
    run: { slug: "trasa-biegowa", label: "Trasa biegowa", title: "{race} trasa biegowa: {km} km, pętle, upał i tempo", desc: "Trasa biegowa {race}: {km} km, pętle, nawierzchnia, upał, punkty odżywcze i strategia tempa." },
    raceday: { slug: "dzien-zawodow", label: "Dzień zawodów", title: "{race} dzień zawodów: harmonogram, międzyczasy i plan B", desc: "Przewodnik po dniu zawodów {race}: harmonogram, międzyczasy według czasu końcowego, błędy i plan B." },
    travel: { slug: "dojazd-i-noclegi", label: "Podróż i hotele", title: "{race}: dojazd, noclegi, gdzie oglądać", desc: "Przewodnik po {race}: dojazd, hotele blisko zawodów, gdzie oglądać i gdzie trenować." },
  },
};

export function facetBySlug(lang: Lang, slug: string): Facet | null {
  const m = FACET_I18N[lang];
  return (Object.keys(m) as Facet[]).find((f) => m[f].slug === slug) ?? null;
}

/** Facet anche se lo slug è di un'altra lingua (link condivisi): per il redirect. */
export function facetBySlugAnyLang(slug: string): Facet | null {
  for (const l of Object.keys(FACET_I18N) as Lang[]) {
    const f = facetBySlug(l, slug);
    if (f) return f;
  }
  return null;
}

export function fillFacet(tpl: string, v: { race: string; km?: string; dplus?: string }): string {
  return tpl
    .replace(/\{race\}/g, v.race)
    .replace(/\{km\}/g, v.km ?? "")
    .replace(/\{dplus\}/g, v.dplus ?? "")
    .replace(/\s+/g, " ")
    .replace(/:\s*,/g, ":")
    .trim();
}

type Ui = { segments: string; splits: string; goal: string; total: string; guide: string; other: string; back: string; facts: string; wetsuit: string; faq: string; places: string };
export const FACET_UI: Record<Lang, Ui> = {
  en: { segments: "Segment by segment", splits: "Target splits", goal: "Goal", total: "Total", guide: "The full guide", other: "More guides for this race", back: "Race overview", facts: "Key facts", wetsuit: "Wetsuit", faq: "Questions", places: "Places" },
  it: { segments: "Tratto per tratto", splits: "Tempi parziali per obiettivo", goal: "Obiettivo", total: "Totale", guide: "La guida completa", other: "Altre guide di questa gara", back: "Scheda della gara", facts: "In sintesi", wetsuit: "Muta", faq: "Domande", places: "Luoghi" },
  de: { segments: "Abschnitt für Abschnitt", splits: "Splitzeiten nach Ziel", goal: "Ziel", total: "Gesamt", guide: "Der ganze Guide", other: "Weitere Guides zu diesem Rennen", back: "Rennübersicht", facts: "Das Wichtigste", wetsuit: "Neopren", faq: "Fragen", places: "Orte" },
  fr: { segments: "Tronçon par tronçon", splits: "Temps de passage par objectif", goal: "Objectif", total: "Total", guide: "Le guide complet", other: "Autres guides de cette course", back: "Fiche de la course", facts: "L'essentiel", wetsuit: "Combinaison", faq: "Questions", places: "Lieux" },
  es: { segments: "Tramo a tramo", splits: "Parciales por objetivo", goal: "Objetivo", total: "Total", guide: "La guía completa", other: "Más guías de esta carrera", back: "Ficha de la carrera", facts: "Lo esencial", wetsuit: "Neopreno", faq: "Preguntas", places: "Lugares" },
  pt: { segments: "Troço a troço", splits: "Parciais por objetivo", goal: "Objetivo", total: "Total", guide: "O guia completo", other: "Mais guias desta prova", back: "Ficha da prova", facts: "O essencial", wetsuit: "Fato", faq: "Perguntas", places: "Locais" },
  nl: { segments: "Segment per segment", splits: "Splittijden per doel", goal: "Doel", total: "Totaal", guide: "De volledige gids", other: "Meer gidsen voor deze wedstrijd", back: "Wedstrijdoverzicht", facts: "Kernpunten", wetsuit: "Wetsuit", faq: "Vragen", places: "Plaatsen" },
  da: { segments: "Afsnit for afsnit", splits: "Mellemtider efter mål", goal: "Mål", total: "I alt", guide: "Hele guiden", other: "Flere guides til løbet", back: "Løbsoversigt", facts: "Det vigtigste", wetsuit: "Våddragt", faq: "Spørgsmål", places: "Steder" },
  sv: { segments: "Avsnitt för avsnitt", splits: "Mellantider efter mål", goal: "Mål", total: "Totalt", guide: "Hela guiden", other: "Fler guider för tävlingen", back: "Tävlingsöversikt", facts: "Det viktigaste", wetsuit: "Våtdräkt", faq: "Frågor", places: "Platser" },
  no: { segments: "Del for del", splits: "Mellomtider etter mål", goal: "Mål", total: "Totalt", guide: "Hele guiden", other: "Flere guider for løpet", back: "Løpsoversikt", facts: "Det viktigste", wetsuit: "Våtdrakt", faq: "Spørsmål", places: "Steder" },
  fi: { segments: "Osuus kerrallaan", splits: "Väliajat tavoitteen mukaan", goal: "Tavoite", total: "Yhteensä", guide: "Koko opas", other: "Lisää oppaita tähän kisaan", back: "Kisan yleiskatsaus", facts: "Tärkeimmät", wetsuit: "Märkäpuku", faq: "Kysymykset", places: "Paikat" },
  pl: { segments: "Odcinek po odcinku", splits: "Międzyczasy według celu", goal: "Cel", total: "Razem", guide: "Pełny przewodnik", other: "Więcej przewodników o tych zawodach", back: "Karta zawodów", facts: "Najważniejsze", wetsuit: "Pianka", faq: "Pytania", places: "Miejsca" },
};

/** Quali facet ha una gara (solo quelli con contenuto vero). */
export function facetsFor(b: { race: { legs: unknown; splits: unknown; logistics: unknown }; articles: { topic: string }[]; places: unknown[] }): Facet[] {
  const legs = (b.race.legs ?? {}) as Record<string, { bullets?: string[] } | undefined>;
  const hasArt = (topic: string) => b.articles.some((a) => a.topic === topic);
  return FACETS.filter((f) => {
    if (f === "swim" || f === "bike" || f === "run") return (legs[f]?.bullets?.length ?? 0) > 0 || hasArt(f);
    if (f === "raceday") return hasArt("raceday") || Array.isArray(b.race.splits);
    return hasArt("logistics") || b.places.length > 0 || (Array.isArray(b.race.logistics) && b.race.logistics.length > 0);
  });
}

export function facetPath(racePathStr: string, lang: Lang, f: Facet): string {
  return `${racePathStr}/${FACET_I18N[lang][f].slug}`;
}

// ---------------------------------------------------------------------------
// Facet "dati" (alimentati da event_race_facts e dalle recensioni): risultati,
// iscrizione, meteo/acqua, negozi bici, recensioni, slot mondiali, cut-off.
// ---------------------------------------------------------------------------
export const DATA_FACETS = ["results", "registration", "weather", "bikeshops", "reviews", "qualification", "cutoffs"] as const;
export type DataFacet = (typeof DATA_FACETS)[number];
type DT = { slug: string; label: string; title: string; desc: string };
const D = (slug: string, label: string, title: string, desc: string): DT => ({ slug, label, title, desc });
// {race} nome gara, {year} anno risultati, {wc} campionato del mondo (Kona / 70.3 WC)
export const DATA_FACET_I18N: Record<Lang, Record<DataFacet, DT>> = {
  en: {
    results: D("results", "Results", "{race} results {year}: winners by age group and finish times", "{race} {year} results: overall podium, winner of every age group with finish time, finishers, DNF and median times."),
    registration: D("registration", "Registration & price", "{race} registration: price, entry options and how to sign up", "How to enter {race}: registration status, entry price, IRONMAN Access and VIP packages, official links and transfer rules."),
    weather: D("weather-and-water-temperature", "Weather & water", "{race} weather and water temperature on race day: 10 years of data", "What weather to expect at {race}: race-day temperatures, rain, wind and water temperature from 10 years of historical data."),
    bikeshops: D("bike-shops-and-mechanics", "Bike shops", "{race} bike shops and mechanics near the course", "Bike shops, mechanics and rentals near {race}: addresses, opening hours, distance from the race and what to do if something breaks."),
    reviews: D("reviews", "Reviews", "{race} reviews: what athletes say about swim, bike, run and organisation", "{race} reviews from athletes who raced it: ratings by leg, organisation, logistics and whether they would do it again."),
    qualification: D("world-championship-slots", "WC slots", "{race} {wc} slots: qualification and allocation", "How many {wc} slots {race} offers, how they are allocated by age group and how roll-down works."),
    cutoffs: D("cut-off-times", "Cut-off times", "{race} cut-off times: swim, bike and finish limits", "{race} cut-off times for swim, bike and finish line, start times and what happens if you miss them."),
  },
  it: {
    results: D("risultati", "Risultati", "{race} risultati {year}: vincitori di categoria e tempi", "Risultati di {race} {year}: podio assoluto, vincitore di ogni categoria d'età con il tempo, arrivati, ritirati e tempi mediani."),
    registration: D("iscrizione-e-prezzi", "Iscrizione e prezzi", "{race} iscrizione: prezzo, opzioni e come iscriversi", "Come iscriversi a {race}: stato delle iscrizioni, prezzo, IRONMAN Access e pacchetti VIP, link ufficiali e regole di trasferimento."),
    weather: D("meteo-e-temperatura-acqua", "Meteo e acqua", "{race} meteo e temperatura dell'acqua il giorno della gara: 10 anni di dati", "Che tempo aspettarsi a {race}: temperature, pioggia, vento e temperatura dell'acqua nel giorno gara dagli ultimi 10 anni."),
    bikeshops: D("meccanici-e-negozi-bici", "Meccanici e negozi bici", "{race} meccanici e negozi bici vicino al percorso", "Negozi bici, meccanici e noleggi vicino a {race}: indirizzi, orari, distanza dalla gara e cosa fare se si rompe qualcosa."),
    reviews: D("recensioni", "Recensioni", "{race} recensioni: cosa dicono gli atleti di nuoto, bici, corsa e organizzazione", "Recensioni di {race} da chi l'ha corsa: voti per frazione, organizzazione, logistica e se la rifarebbero."),
    qualification: D("slot-mondiali", "Slot mondiali", "{race} slot per {wc}: qualificazione e assegnazione", "Quanti slot per {wc} assegna {race}, come sono divisi per categoria e come funziona il roll-down."),
    cutoffs: D("tempi-massimi", "Tempi massimi", "{race} tempi massimi: cancelli orari di nuoto, bici e arrivo", "I tempi massimi di {race} per nuoto, bici e arrivo, gli orari di partenza e cosa succede se non li rispetti."),
  },
  de: {
    results: D("ergebnisse", "Ergebnisse", "{race} Ergebnisse {year}: Altersklassensieger und Zielzeiten", "Ergebnisse {race} {year}: Gesamtpodium, Sieger jeder Altersklasse mit Zielzeit, Finisher, DNF und Medianzeiten."),
    registration: D("anmeldung-und-preise", "Anmeldung & Preis", "{race} Anmeldung: Startgebühr, Optionen und Ablauf", "So meldest du dich für {race} an: Anmeldestatus, Startgebühr, IRONMAN Access und VIP-Pakete, offizielle Links und Umschreiberegeln."),
    weather: D("wetter-und-wassertemperatur", "Wetter & Wasser", "{race} Wetter und Wassertemperatur am Renntag: 10 Jahre Daten", "Welches Wetter dich beim {race} erwartet: Temperaturen, Regen, Wind und Wassertemperatur am Renntag aus 10 Jahren Daten."),
    bikeshops: D("radladen-und-mechaniker", "Radläden", "{race} Radläden und Mechaniker in Streckennähe", "Radläden, Mechaniker und Verleih beim {race}: Adressen, Öffnungszeiten, Entfernung und was tun bei einem Defekt."),
    reviews: D("erfahrungsberichte", "Erfahrungen", "{race} Erfahrungen: was Athleten über Schwimmen, Rad, Laufen und Organisation sagen", "{race} Erfahrungsberichte: Bewertungen je Disziplin, Organisation, Logistik und ob sie wieder starten würden."),
    qualification: D("wm-slots", "WM-Slots", "{race} Slots für {wc}: Qualifikation und Vergabe", "Wie viele Slots für {wc} beim {race} vergeben werden, Verteilung nach Altersklassen und Roll-down."),
    cutoffs: D("zielschluss-zeiten", "Zeitlimits", "{race} Zeitlimits: Cut-offs für Schwimmen, Rad und Ziel", "Die Zeitlimits beim {race} für Schwimmen, Rad und Ziel, Startzeiten und was passiert, wenn du sie verpasst."),
  },
  fr: {
    results: D("resultats", "Résultats", "{race} résultats {year} : vainqueurs par catégorie et temps", "Résultats {race} {year} : podium scratch, vainqueur de chaque catégorie d'âge avec son temps, finishers, abandons et temps médians."),
    registration: D("inscription-et-prix", "Inscription et prix", "{race} inscription : prix, options et comment s'inscrire", "S'inscrire à l'{race} : état des inscriptions, prix, IRONMAN Access et formules VIP, liens officiels et règles de transfert."),
    weather: D("meteo-et-temperature-eau", "Météo et eau", "{race} météo et température de l'eau le jour de course : 10 ans de données", "Quel temps attendre à l'{race} : températures, pluie, vent et température de l'eau le jour J sur 10 ans."),
    bikeshops: D("magasins-et-mecaniciens-velo", "Magasins vélo", "{race} magasins et mécaniciens vélo près du parcours", "Magasins, mécaniciens et location de vélos près de l'{race} : adresses, horaires, distance et que faire en cas de casse."),
    reviews: D("avis", "Avis", "{race} avis : ce que disent les athlètes de la natation, du vélo, de la course et de l'organisation", "Avis sur l'{race} : notes par discipline, organisation, logistique et s'ils la referaient."),
    qualification: D("slots-championnat-du-monde", "Slots Mondiaux", "{race} slots pour {wc} : qualification et attribution", "Combien de slots pour {wc} à l'{race}, répartition par catégorie et fonctionnement du roll-down."),
    cutoffs: D("barrieres-horaires", "Barrières horaires", "{race} barrières horaires : natation, vélo et arrivée", "Les barrières horaires de l'{race} pour la natation, le vélo et l'arrivée, horaires de départ et ce qui se passe si on les dépasse."),
  },
  es: {
    results: D("resultados", "Resultados", "{race} resultados {year}: ganadores por grupo de edad y tiempos", "Resultados {race} {year}: podio absoluto, ganador de cada grupo de edad con su tiempo, finishers, abandonos y tiempos medianos."),
    registration: D("inscripcion-y-precios", "Inscripción y precio", "{race} inscripción: precio, opciones y cómo inscribirse", "Cómo inscribirse en {race}: estado de las inscripciones, precio, IRONMAN Access y paquetes VIP, enlaces oficiales y transferencias."),
    weather: D("clima-y-temperatura-agua", "Clima y agua", "{race} clima y temperatura del agua el día de carrera: 10 años de datos", "Qué tiempo esperar en {race}: temperaturas, lluvia, viento y temperatura del agua el día de carrera en los últimos 10 años."),
    bikeshops: D("tiendas-y-mecanicos-bici", "Tiendas de bici", "{race} tiendas y mecánicos de bici cerca del recorrido", "Tiendas, mecánicos y alquiler de bicis cerca de {race}: direcciones, horarios, distancia y qué hacer si algo se rompe."),
    reviews: D("opiniones", "Opiniones", "{race} opiniones: qué dicen los atletas de natación, bici, carrera y organización", "Opiniones de {race} de quienes la corrieron: notas por segmento, organización, logística y si repetirían."),
    qualification: D("plazas-mundial", "Plazas Mundial", "{race} plazas para {wc}: clasificación y asignación", "Cuántas plazas para {wc} da {race}, cómo se reparten por grupo de edad y cómo funciona el roll-down."),
    cutoffs: D("tiempos-de-corte", "Tiempos de corte", "{race} tiempos de corte: natación, bici y meta", "Los tiempos de corte de {race} para natación, bici y meta, horarios de salida y qué pasa si no los cumples."),
  },
  pt: {
    results: D("resultados", "Resultados", "{race} resultados {year}: vencedores por escalão e tempos", "Resultados {race} {year}: pódio absoluto, vencedor de cada escalão com o tempo, finishers, desistências e tempos medianos."),
    registration: D("inscricao-e-precos", "Inscrição e preço", "{race} inscrição: preço, opções e como se inscrever", "Como se inscrever no {race}: estado das inscrições, preço, IRONMAN Access e pacotes VIP, links oficiais e transferências."),
    weather: D("clima-e-temperatura-agua", "Clima e água", "{race} clima e temperatura da água no dia da prova: 10 anos de dados", "Que tempo esperar no {race}: temperaturas, chuva, vento e temperatura da água no dia da prova nos últimos 10 anos."),
    bikeshops: D("lojas-e-mecanicos-bike", "Lojas de bike", "{race} lojas e mecânicos de bike perto do percurso", "Lojas, mecânicos e aluguer de bicicletas perto do {race}: moradas, horários, distância e o que fazer se algo partir."),
    reviews: D("opinioes", "Opiniões", "{race} opiniões: o que dizem os atletas da natação, ciclismo, corrida e organização", "Opiniões sobre o {race} de quem o fez: notas por segmento, organização, logística e se repetiriam."),
    qualification: D("vagas-mundial", "Vagas Mundial", "{race} vagas para {wc}: qualificação e atribuição", "Quantas vagas para {wc} atribui o {race}, como se dividem por escalão e como funciona o roll-down."),
    cutoffs: D("tempos-de-corte", "Tempos de corte", "{race} tempos de corte: natação, ciclismo e meta", "Os tempos de corte do {race} para natação, ciclismo e meta, horários de partida e o que acontece se não os cumprires."),
  },
  nl: {
    results: D("uitslagen", "Uitslagen", "{race} uitslagen {year}: winnaars per leeftijdsgroep en eindtijden", "Uitslagen {race} {year}: podium, winnaar van elke leeftijdsgroep met eindtijd, finishers, DNF en mediane tijden."),
    registration: D("inschrijving-en-prijzen", "Inschrijving & prijs", "{race} inschrijving: prijs, opties en hoe je je aanmeldt", "Inschrijven voor {race}: status, inschrijfgeld, IRONMAN Access en VIP-pakketten, officiële links en overschrijfregels."),
    weather: D("weer-en-watertemperatuur", "Weer & water", "{race} weer en watertemperatuur op wedstrijddag: 10 jaar data", "Welk weer je kunt verwachten bij {race}: temperaturen, regen, wind en watertemperatuur op wedstrijddag over 10 jaar."),
    bikeshops: D("fietsenwinkels-en-mechaniekers", "Fietsenwinkels", "{race} fietsenwinkels en mechaniekers bij het parcours", "Fietsenwinkels, mechaniekers en verhuur bij {race}: adressen, openingstijden, afstand en wat te doen bij pech."),
    reviews: D("ervaringen", "Ervaringen", "{race} ervaringen: wat atleten zeggen over zwemmen, fietsen, lopen en organisatie", "Ervaringen met {race}: scores per onderdeel, organisatie, logistiek en of ze het opnieuw zouden doen."),
    qualification: D("wk-slots", "WK-slots", "{race} slots voor {wc}: kwalificatie en verdeling", "Hoeveel slots voor {wc} {race} uitdeelt, verdeling per leeftijdsgroep en hoe roll-down werkt."),
    cutoffs: D("tijdslimieten", "Tijdslimieten", "{race} tijdslimieten: zwemmen, fietsen en finish", "De tijdslimieten van {race} voor zwemmen, fietsen en finish, starttijden en wat er gebeurt als je ze mist."),
  },
  da: {
    results: D("resultater", "Resultater", "{race} resultater {year}: aldersgruppevindere og tider", "Resultater {race} {year}: samlet podium, vinder af hver aldersgruppe med tid, finishere, DNF og mediantider."),
    registration: D("tilmelding-og-priser", "Tilmelding & pris", "{race} tilmelding: pris, muligheder og sådan tilmelder du dig", "Sådan tilmelder du dig {race}: status, startgebyr, IRONMAN Access og VIP-pakker, officielle links og overdragelse."),
    weather: D("vejr-og-vandtemperatur", "Vejr & vand", "{race} vejr og vandtemperatur på løbsdagen: 10 års data", "Hvilket vejr du kan forvente ved {race}: temperatur, regn, vind og vandtemperatur på løbsdagen gennem 10 år."),
    bikeshops: D("cykelforhandlere-og-mekanikere", "Cykelbutikker", "{race} cykelbutikker og mekanikere nær ruten", "Cykelbutikker, mekanikere og udlejning ved {race}: adresser, åbningstider, afstand og hvad du gør ved defekt."),
    reviews: D("anmeldelser", "Anmeldelser", "{race} anmeldelser: hvad atleter siger om svøm, cykel, løb og organisering", "Anmeldelser af {race}: karakterer pr. disciplin, organisering, logistik og om de ville gøre det igen."),
    qualification: D("vm-pladser", "VM-pladser", "{race} pladser til {wc}: kvalifikation og fordeling", "Hvor mange pladser til {wc} {race} giver, fordelingen pr. aldersgruppe og hvordan roll-down fungerer."),
    cutoffs: D("tidsgraenser", "Tidsgrænser", "{race} tidsgrænser: svøm, cykel og mål", "Tidsgrænserne ved {race} for svøm, cykel og mål, starttider og hvad der sker, hvis du ikke når dem."),
  },
  sv: {
    results: D("resultat", "Resultat", "{race} resultat {year}: åldersklassvinnare och tider", "Resultat {race} {year}: totalpodium, vinnare i varje åldersklass med tid, finishers, DNF och mediantider."),
    registration: D("anmalan-och-priser", "Anmälan & pris", "{race} anmälan: pris, alternativ och hur du anmäler dig", "Så anmäler du dig till {race}: status, startavgift, IRONMAN Access och VIP-paket, officiella länkar och överlåtelse."),
    weather: D("vader-och-vattentemperatur", "Väder & vatten", "{race} väder och vattentemperatur på tävlingsdagen: 10 års data", "Vilket väder du kan vänta dig på {race}: temperatur, regn, vind och vattentemperatur på tävlingsdagen under 10 år."),
    bikeshops: D("cykelbutiker-och-mekaniker", "Cykelbutiker", "{race} cykelbutiker och mekaniker nära banan", "Cykelbutiker, mekaniker och uthyrning vid {race}: adresser, öppettider, avstånd och vad du gör vid defekt."),
    reviews: D("omdomen", "Omdömen", "{race} omdömen: vad atleter säger om sim, cykel, löpning och arrangemang", "Omdömen om {race}: betyg per gren, arrangemang, logistik och om de skulle göra det igen."),
    qualification: D("vm-platser", "VM-platser", "{race} platser till {wc}: kvalificering och fördelning", "Hur många platser till {wc} {race} delar ut, fördelning per åldersklass och hur roll-down fungerar."),
    cutoffs: D("tidsgranser", "Tidsgränser", "{race} tidsgränser: sim, cykel och mål", "Tidsgränserna på {race} för sim, cykel och mål, starttider och vad som händer om du missar dem."),
  },
  no: {
    results: D("resultater", "Resultater", "{race} resultater {year}: aldersklassevinnere og tider", "Resultater {race} {year}: sammenlagt pall, vinner i hver aldersklasse med tid, fullførte, DNF og mediantider."),
    registration: D("pamelding-og-priser", "Påmelding & pris", "{race} påmelding: pris, alternativer og hvordan melde seg på", "Slik melder du deg på {race}: status, startkontingent, IRONMAN Access og VIP-pakker, offisielle lenker og overføring."),
    weather: D("vaer-og-vanntemperatur", "Vær & vann", "{race} vær og vanntemperatur på konkurransedagen: 10 års data", "Hvilket vær du kan vente deg i {race}: temperatur, regn, vind og vanntemperatur på konkurransedagen over 10 år."),
    bikeshops: D("sykkelbutikker-og-mekanikere", "Sykkelbutikker", "{race} sykkelbutikker og mekanikere nær traseen", "Sykkelbutikker, mekanikere og utleie ved {race}: adresser, åpningstider, avstand og hva du gjør ved defekt."),
    reviews: D("anmeldelser", "Anmeldelser", "{race} anmeldelser: hva utøvere sier om svøm, sykkel, løp og arrangement", "Anmeldelser av {race}: karakterer per øvelse, arrangement, logistikk og om de ville gjort det igjen."),
    qualification: D("vm-plasser", "VM-plasser", "{race} plasser til {wc}: kvalifisering og fordeling", "Hvor mange plasser til {wc} {race} gir, fordeling per aldersklasse og hvordan roll-down fungerer."),
    cutoffs: D("tidsgrenser", "Tidsgrenser", "{race} tidsgrenser: svøm, sykkel og mål", "Tidsgrensene i {race} for svøm, sykkel og mål, starttider og hva som skjer om du ikke rekker dem."),
  },
  fi: {
    results: D("tulokset", "Tulokset", "{race} tulokset {year}: ikäsarjojen voittajat ja ajat", "{race} {year} tulokset: kokonaispalkintopalli, jokaisen ikäsarjan voittaja ja aika, maaliin tulleet, keskeyttäneet ja mediaaniajat."),
    registration: D("ilmoittautuminen-ja-hinnat", "Ilmoittautuminen", "{race} ilmoittautuminen: hinta, vaihtoehdot ja miten ilmoittaudut", "Näin ilmoittaudut {race}-kisaan: tilanne, osallistumismaksu, IRONMAN Access ja VIP-paketit, viralliset linkit ja siirrot."),
    weather: D("saa-ja-veden-lampotila", "Sää ja vesi", "{race} sää ja veden lämpötila kisapäivänä: 10 vuoden data", "Millaista säätä {race} kisapäivänä: lämpötilat, sade, tuuli ja veden lämpötila 10 vuoden ajalta."),
    bikeshops: D("pyorakaupat-ja-huollot", "Pyöräkaupat", "{race} pyöräkaupat ja huollot reitin lähellä", "Pyöräkaupat, huollot ja vuokraus {race} lähellä: osoitteet, aukioloajat, etäisyys ja mitä tehdä vian sattuessa."),
    reviews: D("arvostelut", "Arvostelut", "{race} arvostelut: mitä urheilijat sanovat uinnista, pyöräilystä, juoksusta ja järjestelyistä", "{race} arvostelut kisan juosseilta: arvosanat lajeittain, järjestelyt, logistiikka ja tekisivätkö uudestaan."),
    qualification: D("mm-paikat", "MM-paikat", "{race} paikat {wc}: karsinta ja jako", "Montako {wc} -paikkaa {race} jakaa, jako ikäsarjoittain ja miten roll-down toimii."),
    cutoffs: D("aikarajat", "Aikarajat", "{race} aikarajat: uinti, pyöräily ja maali", "{race} aikarajat uinnille, pyöräilylle ja maaliin, lähtöajat ja mitä tapahtuu jos et ehdi."),
  },
  pl: {
    results: D("wyniki", "Wyniki", "{race} wyniki {year}: zwycięzcy kategorii wiekowych i czasy", "Wyniki {race} {year}: podium open, zwycięzca każdej kategorii wiekowej z czasem, finiszerzy, DNF i mediany czasów."),
    registration: D("zapisy-i-ceny", "Zapisy i cena", "{race} zapisy: cena, opcje i jak się zapisać", "Jak zapisać się na {race}: status zapisów, opłata startowa, IRONMAN Access i pakiety VIP, oficjalne linki i przepisanie pakietu."),
    weather: D("pogoda-i-temperatura-wody", "Pogoda i woda", "{race} pogoda i temperatura wody w dniu zawodów: dane z 10 lat", "Jakiej pogody spodziewać się na {race}: temperatury, deszcz, wiatr i temperatura wody w dniu zawodów z 10 lat."),
    bikeshops: D("sklepy-i-serwisy-rowerowe", "Sklepy rowerowe", "{race} sklepy i serwisy rowerowe blisko trasy", "Sklepy, serwisy i wypożyczalnie rowerów przy {race}: adresy, godziny otwarcia, odległość i co zrobić przy awarii."),
    reviews: D("opinie", "Opinie", "{race} opinie: co zawodnicy mówią o pływaniu, rowerze, biegu i organizacji", "Opinie o {race} od tych, którzy startowali: oceny etapów, organizacja, logistyka i czy wystartowaliby ponownie."),
    qualification: D("sloty-mistrzostw-swiata", "Sloty MŚ", "{race} sloty na {wc}: kwalifikacja i przydział", "Ile slotów na {wc} daje {race}, jak są dzielone na kategorie wiekowe i jak działa roll-down."),
    cutoffs: D("limity-czasu", "Limity czasu", "{race} limity czasu: pływanie, rower i meta", "Limity czasu {race} na pływanie, rower i metę, godziny startu i co się dzieje, gdy ich nie zmieścisz."),
  },
};

export function dataFacetBySlug(lang: Lang, slug: string): DataFacet | null {
  const m = DATA_FACET_I18N[lang];
  return (Object.keys(m) as DataFacet[]).find((f) => m[f].slug === slug) ?? null;
}
export function dataFacetBySlugAnyLang(slug: string): DataFacet | null {
  for (const l of Object.keys(DATA_FACET_I18N) as Lang[]) { const f = dataFacetBySlug(l, slug); if (f) return f; }
  return null;
}
export function dataFacetPath(racePathStr: string, lang: Lang, f: DataFacet): string {
  return `${racePathStr}/${DATA_FACET_I18N[lang][f].slug}`;
}
export function fillData(tpl: string, v: { race: string; year?: string | number | null; wc?: string }): string {
  return tpl.replace(/\{race\}/g, v.race).replace(/\{year\}/g, v.year ? String(v.year) : "").replace(/\{wc\}/g, v.wc ?? "").replace(/\s+/g, " ").replace(/ :/g, " :").trim();
}

/** Facet dati disponibili per una gara, in base ai fatti raccolti. */
export function dataFacetsFor(facts: Record<string, unknown> | null, reviewsCount: number): DataFacet[] {
  const f = (facts ?? {}) as { results?: { ag?: unknown[] } | null; official?: { status?: string | null; price_tiers?: unknown[]; options?: unknown[]; register_url?: string | null; slots?: { total?: number | null } | null; cutoffs?: unknown[] } | null; climate?: unknown; bike_shops?: unknown[] | null };
  const o = f.official;
  const out: DataFacet[] = [];
  if (f.results?.ag?.length) out.push("results");
  if (o && (o.status || o.price_tiers?.length || o.options?.length || o.register_url)) out.push("registration");
  if (f.climate) out.push("weather");
  if ((f.bike_shops?.length ?? 0) >= 2) out.push("bikeshops");
  if (reviewsCount > 0) out.push("reviews");
  if (o?.slots?.total || (o?.slots as { notes?: string | null } | null)?.notes || (f.results as { slots_note?: string | null } | null)?.slots_note) out.push("qualification");
  if (o?.cutoffs?.length) out.push("cutoffs");
  return out;
}
