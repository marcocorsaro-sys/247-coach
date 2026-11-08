-- Prime fonti pubbliche su Nizza (raccolta manuale 27/10/2026). Solo URL e
-- metadati: alimentano sintesi, FAQ e la sezione "Fonti" della scheda.
-- Idempotente (unique race_id+url). Da ampliare con la pipeline Apify.
with r as (select id from public.event_races where slug = 'nizza-2027')
insert into public.event_race_sources (race_id, kind, platform, url, title, author, published_at, edition_year, lang, excerpt, topics, quality, fetched_via)
select r.id, s.kind, s.platform, s.url, s.title, s.author, s.published_at::date, s.edition_year, s.lang, s.excerpt, s.topics::text[], s.quality, 'manuale'
from r, (values
 ('report','blog','https://blog.stevegale.com/2024/06/nice-ironman-2024/','Nice Ironman 2024 — race report','Steve Gale','2024-06-30',2024,'en','Race report completo di un age-grouper: nuoto, salite, discesa e maratona sulla Promenade.','{bici,discesa,corsa,caldo}',3),
 ('official','pjammcycling','https://pjammcycling.com/triathlon/148.IRONMAN-France-Nice-Bike-Course-and-Profile','IRONMAN France Nice — bike course and profile',null,null,null,'en','Profilo altimetrico e descrizione km per km della frazione bici.','{bici,percorso,dislivello}',3),
 ('news','triathlete.com','https://www.triathlete.com/ironman-world-championship-2024-nice/how-hard-was-the-ironman-world-championship-nice-bike-course-anyway/','How hard was the Nice bike course, anyway?','Triathlete','2024-09-25',2024,'en','Analisi del percorso bici con dati di potenza e confronto con Kona.','{bici,dislivello,pacing}',3),
 ('blog','prommer.net','https://prommer.net/en/training/triathlon/races/ironman-nice-2026/','IRONMAN Nice 2026: race guide, mountain course & Kona slots','Prommer','2026-01-15',2026,'en','Guida gara: iscrizioni, percorso, slot, logistica.','{logistica,percorso,slot}',2),
 ('blog','tetsuo.com','https://tetsuo.com/blogs/blog/ironman-nice-2025-pacing-plan-bike-marathon','Ironman Nice 2025 pacing plan — 180 km bike & marathon strategy','Tetsuo','2025-06-01',2025,'en','Piano di pacing per frazione, con potenza target in salita e strategia caldo in maratona.','{pacing,bici,corsa,nutrizione}',3),
 ('results','protriathletes.org','https://stats.protriathletes.org/race/ironman-nice-world-championships/2025/results','Risultati pro 2025 — Nice','PTO stats','2025-09-14',2025,'en','Split pro per frazione, utili come riferimento di percorso.','{risultati,split}',2),
 ('news','coachcox.co.uk','https://www.coachcox.co.uk/2025/09/17/mens-ironman-world-champs-2025-nice-race-analysis/','Nice 2025 — race analysis','Russell Cox','2025-09-17',2025,'en','Analisi statistica dei tempi per frazione e distribuzione dei finisher.','{risultati,split,statistiche}',3),
 ('news','trirating.com','https://www.trirating.com/mens-ironman-world-championships-nice-2025-analyzing-results/','Nice 2025 — analyzing results','Thorsten Radde','2025-09-16',2025,'en','Rating del percorso e confronto dei tempi con altre full distance.','{risultati,split}',2),
 ('forum','raceraves','https://raceraves.com/races/ironman-france-nice/','IRONMAN France Nice — recensioni atleti','RaceRaves',null,null,'en','Recensioni a stelline di age-grouper: organizzazione, percorso, esperienza.','{recensioni,organizzazione}',2),
 ('video','youtube','https://www.youtube.com/watch?v=K8suFa2PfyQ','Ironman World Champs raw race report',null,'2025-09-20',2025,'en','Race report video dal giorno di gara a Nizza.','{racconto,corsa,bici}',2),
 ('official','rouvy','https://rouvy.com/en/ironman/france','Il percorso bici di Nizza su ROUVY','ROUVY',null,2027,'en','Percorso ufficiale 2027 riprodotto per allenamento indoor: utile per studiare salite e discesa.','{bici,allenamento,percorso}',2)
) as s(kind,platform,url,title,author,published_at,edition_year,lang,excerpt,topics,quality)
on conflict (race_id, url) do nothing;

with r as (select id from public.event_races where slug = 'nizza-2027')
insert into public.event_race_media (race_id, platform, media_type, url, embed_id, caption, thumbnail_url, edition_year, leg, published)
select r.id, 'youtube', 'video', 'https://www.youtube.com/watch?v=K8suFa2PfyQ', 'K8suFa2PfyQ', 'Race report video dal giorno di gara a Nizza (2025)', 'https://i.ytimg.com/vi/K8suFa2PfyQ/hqdefault.jpg', 2025, 'course', true
from r on conflict (race_id, url) do nothing;
