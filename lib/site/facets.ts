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
