-- ============================================================================
-- Migration 0029 — Catalogo gare long distance (sito pubblico 24/7 Coach).
--  - races: scheda gara (una riga per edizione), leggibile da tutti (anon).
--    I contenuti ricchi (frazioni, split, consigli, logistica, FAQ, profilo)
--    sono jsonb: cambiano forma spesso e si rigenerano a ogni edizione.
--  - race_segments: segmenti chiave per frazione (km da/a, pendenza): è il
--    pezzo che il generatore del piano legge per scegliere sedute e percorsi.
--  - race_reviews: recensioni strutturate. source = 'synthesis' (sintesi AI
--    di race report pubblici, dichiarata) | 'verified' (atleta con attività
--    collegata) | 'manual'. Lettura pubblica solo se published.
-- Prefisso `event_` per non collidere con `public.races` (gare obiettivo
-- dell'atleta nel modello coach↔atleta): sono due cose diverse.
-- ============================================================================

create table if not exists public.event_races (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,              -- es. 'nizza-2027'
  series          text not null default 'ironman',   -- ironman | challenge | indipendente
  distance        text not null check (distance in ('full','half')),
  name            text not null,                     -- 'Nizza'
  official_name   text,                              -- nome ufficiale, citato a scopo descrittivo
  city            text,
  region          text,
  country         text,
  race_date       date,
  date_confirmed  boolean not null default false,
  season          text check (season in ('prim','est','aut','inv')),
  water_type      text check (water_type in ('mare','lago','fiume')),
  swim_km         numeric default 3.8,
  bike_km         numeric default 180,
  bike_dplus_m    integer,
  run_km          numeric default 42.2,
  run_flat        boolean default true,
  heat_idx        smallint default 1,  -- 0 fresco · 1 medio · 2 caldo
  wind_idx        smallint default 1,  -- 0..3
  fast_idx        smallint default 2,  -- 0 lento/duro · 3 velocissimo
  tagline         text,                -- una riga per card e advisor
  intro           text,                -- paragrafo di apertura scheda
  kpis            jsonb,               -- [{v,l}]
  legs            jsonb,               -- {swim:{bullets[]},bike:{bullets[]},run:{bullets[]}}
  profile         jsonb,               -- {points:[[km,m]], labels:[{km,m,t}]}
  splits          jsonb,               -- [{goal,swim,bike,run,total}]
  demands         jsonb,               -- [{t,b}]
  tips            jsonb,               -- [{t,p}]
  logistics       jsonb,               -- [{t,p}]
  faq             jsonb,               -- [{q,a}]
  status          text not null default 'draft' check (status in ('draft','published')),
  course_version  text,                -- es. '2023-2026 indicativo'
  updated_at      timestamptz not null default now()
);
create index if not exists event_races_date_idx on public.event_races (race_date);

create table if not exists public.event_race_segments (
  id          uuid primary key default gen_random_uuid(),
  race_id     uuid not null references public.event_races(id) on delete cascade,
  leg         text not null check (leg in ('swim','bike','run')),
  position    smallint not null,
  km_from     numeric,
  km_to       numeric,
  title       text not null,
  note        text,
  grade_pct   numeric,       -- pendenza media (bici/corsa)
  dplus_m     integer,
  kind        text           -- flat | climb | descent | plateau | technical | loop
);
create index if not exists event_race_segments_race_idx on public.event_race_segments (race_id, leg, position);

create table if not exists public.event_race_reviews (
  id            uuid primary key default gen_random_uuid(),
  race_id       uuid not null references public.event_races(id) on delete cascade,
  athlete_id    uuid references public.profiles(id) on delete set null,
  edition_year  smallint,
  source        text not null check (source in ('synthesis','verified','manual')),
  title         text,
  scores        jsonb,        -- {swim,bike,run,org,logistics}
  times         jsonb,        -- {swim,bike,run,total}
  wetsuit       boolean,
  gear          text,
  body          text,
  would_repeat  boolean,
  sources_note  text,         -- per le sintesi: numero e tipo di fonti
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists event_race_reviews_race_idx on public.event_race_reviews (race_id, published);

alter table public.event_races enable row level security;
alter table public.event_race_segments enable row level security;
alter table public.event_race_reviews enable row level security;

-- Lettura pubblica (sito senza login) delle gare pubblicate.
create policy event_races_public_read on public.event_races
  for select to anon, authenticated using (status = 'published');
create policy event_race_segments_public_read on public.event_race_segments
  for select to anon, authenticated
  using (exists (select 1 from public.event_races r where r.id = race_id and r.status = 'published'));
create policy event_race_reviews_public_read on public.event_race_reviews
  for select to anon, authenticated using (published);
-- Un atleta loggato può scrivere la propria recensione (pubblicata dopo controllo).
create policy event_race_reviews_own_insert on public.event_race_reviews
  for insert to authenticated with check (athlete_id = auth.uid() and source = 'verified' and published = false);

grant select on public.event_races, public.event_race_segments, public.event_race_reviews to anon, authenticated;
grant insert on public.event_race_reviews to authenticated;
grant all on public.event_races, public.event_race_segments, public.event_race_reviews to service_role;

-- ============================================================================
-- SEED — calendario Europa 2027 (date come pubblicate a ottobre 2026).
-- ============================================================================
insert into public.event_races
 (slug,distance,name,city,country,race_date,season,water_type,bike_dplus_m,run_flat,heat_idx,wind_idx,fast_idx,tagline,status,course_version) values
 ('lanzarote-2027','full','Lanzarote','Tías','Spagna','2027-05-15','prim','mare',2550,true,2,3,1,'Vento e 2.550 m D+: la più dura del circuito, pochi iscritti per slot','published',null),
 ('hamburg-2027','full','Hamburg','Amburgo','Germania','2027-06-06','est','lago',300,true,0,1,3,'Piatta, fresca, lago: percorso da PB','published',null),
 ('klagenfurt-2027','full','Kärnten · Klagenfurt','Klagenfurt','Austria','2027-06-13','est','lago',1500,true,1,1,2,'Lago caldo e pulito, bici con il Rupertiberg, tifo austriaco','published',null),
 ('frankfurt-2027','full','Frankfurt','Francoforte','Germania','2027-06-27','est','lago',1100,true,2,1,2,'Campionato europeo, caldo continentale, corsa in città','published',null),
 ('sables-2027','full','Les Sables d''Olonne','Les Sables-d''Olonne','Francia','2027-06-27','est','mare',500,true,0,2,2,'Oceano con onda, bici piatta e ventosa, clima mite','published',null),
 ('vitoria-2027','full','Vitoria-Gasteiz','Vitoria','Spagna','2027-07-11','est','lago',1300,true,1,1,2,'Lago, bici mossa senza salite lunghe, città che vive la gara','published',null),
 ('leeds-2027','full','Leeds','Leeds','Regno Unito','2027-08-15','est','lago',1800,false,0,2,1,'Bici dura e fresca, corsa con dislivello','published',null),
 ('kalmar-2027','full','Kalmar','Kalmar','Svezia','2027-08-21','est','mare',300,true,0,3,2,'Baltico piatto e salmastro, ponte di Öland ventoso','published',null),
 ('copenhagen-2027','full','Copenhagen','Copenaghen','Danimarca','2027-08-22','est','mare',500,true,0,2,3,'La più veloce del nord: mare chiuso, bici e corsa piatte','published',null),
 ('nizza-2027','full','Nizza','Nizza','Francia','2027-09-12','aut','mare',2400,true,2,1,0,'2.400 m D+ e discesa tecnica, corsa calda e piatta: la full di montagna','published','Edizioni 2023-2026, indicativo'),
 ('cervia-2027','full','Italy Emilia-Romagna','Cervia','Italia','2027-09-18','aut','mare',250,true,1,1,3,'La più piatta d''Europa, mare calmo, la gara di casa per il PB','published',null),
 ('wales-2027','full','Wales','Tenby','Regno Unito','2027-09-19','aut','mare',2400,false,0,3,0,'Oceano, 2.400 m D+ e corsa in salita: la più dura per chi odia il caldo','published',null),
 ('jesolo-703-2027','half','Venice-Jesolo','Jesolo','Italia','2027-04-24','prim','mare',150,true,0,1,3,'Apertura di stagione piatta e veloce','published',null),
 ('alghero-703-2027','half','Alghero','Alghero','Italia','2027-05-30','prim','mare',700,true,2,2,2,'Mare aperto, bici mossa, caldo precoce','published',null),
 ('stpolten-703-2027','half','St. Pölten','Sankt Pölten','Austria','2027-05-23','prim','lago',800,true,0,1,2,'Due laghi, bici con salita unica, test di primavera','published',null),
 ('aix-703-2027','half','Aix-en-Provence','Aix-en-Provence','Francia','2027-05-23','prim','lago',1000,false,1,2,1,'Bici dura e corsa in città con salite','published',null),
 ('switzerland-703-2027','half','Switzerland','Rapperswil-Jona','Svizzera','2027-06-06','est','lago',900,false,0,1,1,'Lago di Zurigo, bici con due salite, corsa con scalinata','published',null),
 ('elsinore-703-2027','half','Elsinore','Elsinore','Danimarca','2027-06-27','est','mare',300,true,0,2,3,'Øresund piatto e fresco','published',null),
 ('vitoria-703-2027','half','Vitoria-Gasteiz 70.3','Vitoria','Spagna','2027-07-11','est','lago',650,true,1,1,2,'Stesso weekend della full, percorso mosso','published',null),
 ('zell-703-2027','half','Zell am See-Kaprun','Zell am See','Austria','2027-08-29','est','lago',1100,true,0,1,1,'Lago alpino freddo e salita lunga: la 70.3 di montagna','published',null),
 ('duisburg-703-2027','half','Duisburg','Duisburg','Germania','2027-08-29','est','lago',100,true,1,1,3,'La più piatta in assoluto, canale e corsa a giri','published',null),
 ('erkner-703-2027','half','Erkner','Erkner · Berlino','Germania','2027-09-12','aut','lago',200,true,0,1,3,'Laghi berlinesi, piatta, fine stagione','published',null),
 ('cervia-703-2027','half','Italy Emilia-Romagna 70.3','Cervia','Italia','2027-09-19','aut','mare',150,true,1,1,3,'La 70.3 di casa, piatta e veloce','published',null)
on conflict (slug) do nothing;

update public.event_races set swim_km=1.9, bike_km=90, run_km=21.1 where distance='half';

-- ============================================================================
-- SEED — scheda completa Nizza 2027
-- ============================================================================
update public.event_races set
 official_name = 'IRONMAN France Nice',
 region = 'Costa Azzurra',
 intro = $j$La full distance di montagna del circuito europeo: 3,8 km nel Mediterraneo, 180 km con 2.400 m di dislivello tra Col de Vence e Col de l'Ecre, maratona piatta e calda sulla Promenade des Anglais. Si vince o si perde in discesa e nei primi 10 km di corsa.$j$,
 kpis = $j$[
  {"v":"3,8 km","l":"nuoto · mare, un giro, partenza a onde dalla spiaggia di sassi"},
  {"v":"180 km","l":"bici · 2.400 m D+ · un giro, ritorno in piano sulla costa"},
  {"v":"42,2 km","l":"corsa · 4 giri da 10,5 km sulla Promenade, piatta"},
  {"v":"24-26 °C","l":"acqua a settembre · muta di solito ammessa, al limite"},
  {"v":"26-30 °C","l":"aria nel pomeriggio · sole pieno sulla corsa"},
  {"v":"12:40","l":"finisher mediano stimato · cut-off 16 h"}
 ]$j$::jsonb,
 legs = $j${
  "swim":{"bullets":[
   "Baia degli Angeli, un giro rettangolare con boe grandi, acqua limpida e profonda subito",
   "Ingresso dalla spiaggia di ciottoli: scarpette da scoglio o sandali lasciati sulla riva",
   "Partenza a onde per tempo dichiarato: scegli la tua in modo onesto, il traffico si sente nei primi 400 m",
   "Mare quasi sempre calmo al mattino; corrente laterale debole verso ovest"]},
  "bike":{"bullets":[
   "km 0-25 piano lungo la costa e il Var: resisti, la gara comincia dopo",
   "km 40-55 Col de Vence, circa 10 km al 6-7 %: qui si decide il pacing, non il risultato",
   "km 60-78 Col de l'Ecre via Gorges du Loup e Gourdon: lungo, regolare, 5 % medio",
   "km 80-100 altipiano di Caussols e Gréolières, vento e saliscendi: rabbocca qui",
   "km 100-135 discesa lunga e tecnica, asfalto misto, tornanti: freni e nutrizione prima, non durante",
   "km 135-180 ritorno sulla costa in piano con vento frontale leggero: la corsa inizia qui"]},
  "run":{"bullets":[
   "Quattro giri da 10,5 km sulla Promenade des Anglais, piatti, inversione a cono",
   "Sole pieno dalle 14, asfalto che restituisce calore: la temperatura percepita supera i 30 °C",
   "Ristori ogni 2 km con ghiaccio e spugne: strategia di raffreddamento prima del passo",
   "Pubblico continuo e tifo alto: il rischio è il primo giro troppo veloce"]}
 }$j$::jsonb,
 profile = $j${"maxm":1200,"points":[[0,20],[20,40],[30,80],[42,300],[52,963],[60,780],[70,950],[78,1118],[90,1050],[100,950],[110,600],[125,250],[135,80],[160,30],[180,20]],
   "labels":[{"km":52,"m":963,"t":"Col de Vence 963 m"},{"km":78,"m":1118,"t":"Col de l'Ecre 1118 m"},{"km":115,"m":450,"t":"Discesa tecnica"}]}$j$::jsonb,
 splits = $j$[
  {"goal":"Finisher sereno","swim":"1:20","bike":"7:05","run":"4:40","total":"13:20"},
  {"goal":"Sub 12","swim":"1:12","bike":"6:25","run":"4:05","total":"11:55"},
  {"goal":"Sub 11","swim":"1:05","bike":"5:50","run":"3:50","total":"10:55"},
  {"goal":"Slot Kona M40-44","swim":"0:58","bike":"5:15","run":"3:20","total":"9:45"}
 ]$j$::jsonb,
 demands = $j$[
  {"t":"Bici: 2.400 m D+ con due salite da 40'-60' a FTP 75-80 %","b":"w/kg conta"},
  {"t":"Discesa: 35 km tecnici, rapporti e freni a disco consigliati","b":"guida"},
  {"t":"Caldo: maratona a 28-30 °C dopo 7 ore","b":"acclimatamento"},
  {"t":"Nuoto: mare calmo, muta al limite della temperatura","b":"adattamento no-muta"},
  {"t":"Logistica: ciottoli, deposito borse lontano, 4 giri","b":"piano T1/T2"}
 ]$j$::jsonb,
 tips = $j$[
  {"t":"Salite lunghe","p":"Due blocchi a settimana da 40'-60' continui a FTP 75-80 % da marzo. Il piano cerca tra i tuoi percorsi quelli con 15-20 km al 5-7 % e li propone al posto della seduta generica."},
  {"t":"Discesa","p":"Almeno 6 uscite con discese tecniche da 20'+ prima di luglio. Se non le hai vicino, un weekend in Costa Azzurra a giugno sul percorso vale più di un mese di rulli."},
  {"t":"Caldo","p":"Dal 1° agosto corse pomeridiane 2x a settimana con vestiario pesante o sauna post-seduta. Prova la strategia ghiaccio e spugne nelle ultime due lunghe."},
  {"t":"Nuoto senza muta","p":"Da luglio il lungo in acque libere senza muta ogni due settimane: la differenza di galleggiamento sui 3,8 km pesa 3-5'."},
  {"t":"Nutrizione","p":"90 g/h di carboidrati in bici provati in tutte le lunghe; borraccia già aperta e gel in tasca prima della discesa. In corsa 60 g/h più sodio."},
  {"t":"Materiale","p":"Rapporti 34/32 o 36/30, freni a disco, pastiglie nuove, pneumatici 28 mm. Niente ruota lenticolare: sull'altipiano il vento la paga."}
 ]$j$::jsonb,
 logistics = $j$[
  {"t":"Arrivare","p":"Aeroporto a 7 km dalla zona cambio, tram diretto. Da Torino e Milano 3-4 ore in auto: la soluzione più comoda con la bici. Treno fino a Nice-Ville con bici smontata."},
  {"t":"Dormire","p":"Promenade ovest, Carras o Magnan: a piedi dalla T1 e sul percorso corsa per i tuoi tifosi. Prenota a novembre, da giugno i prezzi raddoppiano."},
  {"t":"Famiglia","p":"La corsa a 4 giri è la gara più comoda da seguire: un punto sulla Promenade e ti vedono 8 volte. Vecchia Nizza e Castello a 15' a piedi per le ore della bici."}
 ]$j$::jsonb,
 faq = $j$[
  {"q":"Serve la muta a settembre?","a":"Dipende dall'anno: con acqua a 24,5 °C o meno è ammessa, oltre no. Allenati a nuotare 3,8 km senza."},
  {"q":"TT o bici da corsa?","a":"La maggioranza va in TT con rapporti 34/32 o 36/30 e freni a disco; chi conosce la discesa guadagna 8-12' su chi non l'ha mai vista."},
  {"q":"Dove dormire?","a":"Zona Promenade ovest o Carras, bici in camera, a piedi dalla zona cambio."}
 ]$j$::jsonb
where slug = 'nizza-2027';

insert into public.event_race_segments (race_id, leg, position, km_from, km_to, title, note, grade_pct, dplus_m, kind)
select r.id, s.leg, s.position, s.km_from, s.km_to, s.title, s.note, s.grade_pct, s.dplus_m, s.kind
from public.event_races r,
(values
 ('bike',1,0,25,'Costa e Var','Piano, gruppi, resistere alla tentazione di spingere',0.5,80,'flat'),
 ('bike',2,40,55,'Col de Vence','Circa 10 km al 6-7 %, regolare; pacing a 75-80 % FTP',6.5,650,'climb'),
 ('bike',3,60,78,'Col de l''Ecre via Gourdon','Lungo e regolare, 5 % medio, esposto al sole',5.0,850,'climb'),
 ('bike',4,80,100,'Altipiano Caussols–Gréolières','Vento, saliscendi, momento per mangiare e bere',1.0,250,'plateau'),
 ('bike',5,100,135,'Discesa tecnica','Tornanti, asfalto misto: freni a disco, nessun gel in mano',-4.5,0,'descent'),
 ('bike',6,135,180,'Rientro sulla costa','Piano, vento frontale leggero, gambe da preparare alla corsa',0.2,60,'flat'),
 ('run',1,0,42.2,'Promenade des Anglais × 4','Giri da 10,5 km piatti, inversione a cono, ristori ogni 2 km',0.0,40,'loop'),
 ('swim',1,0,3.8,'Baia degli Angeli','Un giro rettangolare, ingresso dai ciottoli, corrente laterale debole',null,null,'loop')
) as s(leg,position,km_from,km_to,title,note,grade_pct,dplus_m,kind)
where r.slug = 'nizza-2027'
and not exists (select 1 from public.event_race_segments x where x.race_id = r.id);

insert into public.event_race_reviews (race_id, edition_year, source, title, scores, body, sources_note, published)
select r.id, 2026, 'synthesis', 'Sintesi race report 2024-2026',
 '{"swim":4.3,"bike":4.8,"run":3.6,"org":4.1}'::jsonb,
 $j$Il percorso bici è unanimemente il più bello d'Europa e il motivo per cui si torna. La corsa divide: chi arriva con le gambe la trova «un lungomare infinito con il tifo migliore», chi ha spinto in salita la racconta come «quattro giri di sopravvivenza». Il tema ricorrente è la nutrizione in discesa: molti dichiarano di aver smesso di mangiare per 45' tra Gréolières e la costa.$j$,
 '14 fonti · blog, forum, video. Sintesi AI, nessuna frase attribuita a persone reali.', true
from public.event_races r where r.slug = 'nizza-2027'
and not exists (select 1 from public.event_race_reviews x where x.race_id = r.id);

-- ============================================================================
-- CONTENUTI — la scheda gara come hub: fonti, articoli, media social.
--  - event_race_sources: tutto ciò che racconta la gara (race report, blog,
--    video YouTube, post Instagram/Strava, pagina ufficiale). Solo URL +
--    metadati + estratto: nessun contenuto copiato. Alimenta sintesi e Q&A.
--  - event_race_articles: articoli editoriali/AI per tema (nuoto, bici,
--    corsa, logistica, nutrizione, materiale, race-day) con le fonti citate.
--  - event_race_media: foto e video degli atleti, incorporati con l'embed
--    ufficiale della piattaforma (link al post originale, autore visibile).
-- ============================================================================
create table if not exists public.event_race_sources (
  id            uuid primary key default gen_random_uuid(),
  race_id       uuid not null references public.event_races(id) on delete cascade,
  kind          text not null check (kind in ('report','blog','video','post','forum','official','news','results')),
  platform      text,                -- youtube | instagram | strava | reddit | blog | ironman.com ...
  url           text not null,
  title         text,
  author        text,
  author_handle text,
  published_at  date,
  edition_year  smallint,
  lang          text default 'it',
  excerpt       text,                -- breve estratto o descrizione (no full text)
  thumbnail_url text,
  topics        text[],              -- es. {bici,discesa,caldo}
  quality       smallint default 2,  -- 0 scarto · 1 debole · 2 utile · 3 ottimo
  fetched_via   text,                -- apify actor / manuale
  raw           jsonb,               -- payload originale per rielaborazioni
  created_at    timestamptz not null default now(),
  unique (race_id, url)
);
create index if not exists event_race_sources_race_idx on public.event_race_sources (race_id, kind);

create table if not exists public.event_race_articles (
  id            uuid primary key default gen_random_uuid(),
  race_id       uuid not null references public.event_races(id) on delete cascade,
  slug          text not null,
  topic         text not null,       -- swim | bike | run | logistics | nutrition | gear | raceday | history | weather
  title         text not null,
  dek           text,                -- sottotitolo
  body_md       text not null,       -- markdown
  source_ids    uuid[],              -- fonti citate
  author_type   text not null default 'ai' check (author_type in ('ai','editorial','athlete')),
  edition_year  smallint,
  reading_min   smallint,
  published     boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (race_id, slug)
);
create index if not exists event_race_articles_race_idx on public.event_race_articles (race_id, published);

create table if not exists public.event_race_media (
  id            uuid primary key default gen_random_uuid(),
  race_id       uuid not null references public.event_races(id) on delete cascade,
  source_id     uuid references public.event_race_sources(id) on delete set null,
  platform      text not null check (platform in ('instagram','youtube','strava','tiktok','other')),
  media_type    text not null check (media_type in ('photo','video','reel','short','activity')),
  url           text not null,       -- link al post originale (embed ufficiale)
  embed_id      text,                -- shortcode IG / videoId YT
  author        text,
  author_handle text,
  caption       text,
  thumbnail_url text,
  taken_at      date,
  edition_year  smallint,
  leg           text check (leg in ('swim','bike','run','transition','finish','expo','course')),
  likes         integer,
  views         integer,
  featured      boolean not null default false,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (race_id, url)
);
create index if not exists event_race_media_race_idx on public.event_race_media (race_id, published, featured);

alter table public.event_race_sources  enable row level security;
alter table public.event_race_articles enable row level security;
alter table public.event_race_media    enable row level security;
create policy event_race_sources_public_read  on public.event_race_sources  for select to anon, authenticated using (quality >= 2);
create policy event_race_articles_public_read on public.event_race_articles for select to anon, authenticated using (published);
create policy event_race_media_public_read    on public.event_race_media    for select to anon, authenticated using (published);
grant select on public.event_race_sources, public.event_race_articles, public.event_race_media to anon, authenticated;
grant all on public.event_race_sources, public.event_race_articles, public.event_race_media to service_role;
