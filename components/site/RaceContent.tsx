// Sezioni "hub" della scheda gara: media social, articoli, fonti, con stati vuoti.
import Link from "next/link";
import YtLite from "./YtLite";
import type { RaceArticle, RaceMedia, RacePlace, RaceSource, Race } from "@/lib/site/races";
import { racePath } from "@/lib/site/races";
import type { Lang } from "@/lib/i18n/config";
import type { T, DictKey } from "@/lib/i18n";

const topicKey = (x: string): DictKey => (`topic.${x}` as DictKey);
const kindKey = (x: string): DictKey => (`kind.${x}` as DictKey);

const HL_VIDEOS = 6, HL_PHOTOS = 12;
const byViews = (a: RaceMedia, b: RaceMedia) => Number(b.featured) - Number(a.featured) || (b.views ?? 0) - (a.views ?? 0);
const byPop = (a: RaceMedia, b: RaceMedia) => Number(b.featured) - Number(a.featured) || (b.likes ?? b.views ?? 0) - (a.likes ?? a.views ?? 0);

/** Selezione dei contenuti: i migliori in alto (sezione "racconti"), il resto nelle gallerie complete in fondo. */
export function pickMedia(media: RaceMedia[]) {
  const videos = media.filter((m) => m.platform === "youtube" && m.embed_id).sort(byViews);
  const photos = media.filter((m) => m.platform !== "youtube" && (m.media_type === "photo" || m.media_type === "reel" || m.media_type === "short") && m.thumbnail_url).sort(byPop);
  const voices = media.filter((m) => m.platform === "instagram" && (m.caption?.length ?? 0) > 160).sort((a, b) => (b.caption?.length ?? 0) - (a.caption?.length ?? 0)).slice(0, 18);
  // nei video in evidenza almeno 2 di percorso, se esistono
  const course = videos.filter((v) => v.leg === "bike" || v.leg === "course");
  const hlVideos = [...videos.slice(0, HL_VIDEOS)];
  for (const c of course.slice(0, 2)) if (!hlVideos.includes(c)) { hlVideos.pop(); hlVideos.push(c); }
  const hlPhotos = photos.slice(0, HL_PHOTOS);
  const restVideos = videos.filter((v) => !hlVideos.includes(v));
  const restPhotos = photos.filter((m) => !hlPhotos.includes(m));
  return { videos, photos, voices, hlVideos, hlPhotos, restVideos, restPhotos };
}

function PhotoGrid({ items }: { items: RaceMedia[] }) {
  return (
    <div className="ld-media">
      {items.map((m) => (
        <a key={m.id} className={`ld-mi ${m.media_type !== "photo" ? "vid" : ""}`} href={m.url} target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.thumbnail_url!} alt={m.caption?.slice(0, 80) ?? `${m.platform} · ${m.author ?? ""}`} loading="lazy" referrerPolicy="no-referrer" />
          <span className="pf">{m.platform}{m.edition_year ? ` · ${m.edition_year}` : ""}</span>
          <span className="ov"><b>{m.author_handle ? `@${m.author_handle}` : m.author ?? ""}</b>{m.caption ? m.caption.slice(0, 70) + (m.caption.length > 70 ? "…" : "") : ""}</span>
        </a>
      ))}
    </div>
  );
}
function VideoGrid({ items }: { items: RaceMedia[] }) {
  return (
    <div className="yt-grid">
      {items.map((v) => (
        <figure key={v.id}>
          <YtLite id={v.embed_id!} title={v.caption ?? ""} thumb={v.thumbnail_url} />
          <figcaption><b>{v.author}</b>{v.edition_year ? ` · ${v.edition_year}` : ""}<br />{v.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** In alto: il video principale, i migliori video e le foto più popolari. */
export function MediaHighlights({ race, media, t }: { race: Race; media: RaceMedia[]; t: T }) {
  const { hlVideos, hlPhotos, videos, photos } = pickMedia(media);
  const hero = hlVideos[0];
  const rest = hlVideos.slice(1);
  return (
    <section id="racconti" className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-sechead">
          <div><p className="mono">{t("media.kicker")}</p><h2>{t("media.hlA")} <em>{t("media.hlB")}</em></h2></div>
          <p>{t("media.hlIntro")}</p>
        </div>
        {media.length === 0 ? (
          <div className="ld-empty"><b>{t("media.emptyB")}</b>{t("media.emptyText", { name: race.name })}</div>
        ) : (
          <>
            {hero ? (
              <div className="yt-hero">
                <YtLite id={hero.embed_id!} title={hero.caption ?? ""} thumb={hero.thumbnail_url} big />
                <div><p className="lab">{hero.author}{hero.edition_year ? ` · ${hero.edition_year}` : ""}</p><h3>{hero.caption}</h3></div>
              </div>
            ) : null}
            {rest.length ? <div className="yt-group"><VideoGrid items={rest} /></div> : null}
            {hlPhotos.length ? <div className="yt-group"><h3 className="yt-h">{t("media.photosH")}</h3><PhotoGrid items={hlPhotos} /></div> : null}
            {videos.length + photos.length > hlVideos.length + hlPhotos.length ? (
              <p style={{ marginTop: 18 }}><a className="btn btn-ghost" href="#galleria">{t("media.seeAll", { n: String(videos.length + photos.length) })}</a></p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/** In fondo: gallerie complete (tutto il resto) e voci degli atleti. */
export function MediaFull({ media, t }: { media: RaceMedia[]; t: T }) {
  const { restVideos, restPhotos, voices } = pickMedia(media);
  const course = restVideos.filter((v) => v.leg === "bike" || v.leg === "course");
  const stories = restVideos.filter((v) => !(v.leg === "bike" || v.leg === "course"));
  if (!restVideos.length && !restPhotos.length && !voices.length) return null;
  return (
    <section id="galleria" className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-sechead">
          <div><p className="mono">{t("media.kicker")}</p><h2>{t("media.fullA")} <em>{t("media.fullB")}</em></h2></div>
          <p>{t("media.fullIntro")}</p>
        </div>
        {[[course, "vid.course"], [stories, "vid.race"]].map(([list, key]) => (list as RaceMedia[]).length ? (
          <div key={key as string} className="yt-group">
            <h3 className="yt-h">{t(key as "vid.course")} <span className="num">{(list as RaceMedia[]).length}</span></h3>
            <VideoGrid items={list as RaceMedia[]} />
          </div>
        ) : null)}
        {restPhotos.length ? (
          <div className="yt-group"><h3 className="yt-h">{t("media.photosH")} <span className="num">{restPhotos.length}</span></h3><PhotoGrid items={restPhotos} /></div>
        ) : null}
        {voices.length ? (
          <div className="yt-group">
            <h3 className="yt-h">{t("voices.h")} <span className="num">{voices.length}</span></h3>
            <p className="src">{t("voices.intro")}</p>
            <div className="voices">
              {voices.map((m) => (
                <blockquote key={m.id}>
                  <p>{m.caption!.length > 320 ? `${m.caption!.slice(0, 320).replace(/\s+\S*$/, "")}…` : m.caption}</p>
                  <footer><b>@{m.author_handle}</b>{m.edition_year ? ` · ${m.edition_year}` : ""} · <a href={m.url} target="_blank" rel="noopener">{t("voices.open")}</a></footer>
                </blockquote>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const PLACE_GROUPS: { id: string; kinds: RacePlace["kind"][]; kicker: string; h: string }[] = [
  { id: "viaggio", kinds: ["arrival", "hotel", "spectator"], kicker: "places.kickerGuide", h: "places.hGuide" },
  { id: "allenarsi", kinds: ["training", "segment"], kicker: "places.kickerTrain", h: "places.hTrain" },
];
const KIND_LABEL: Record<RacePlace["kind"], string> = { arrival: "places.arrival", hotel: "places.hotel", spectator: "places.spectator", training: "places.training", segment: "places.segment", food: "places.food" };

export function PlacesSections({ places, t }: { places: RacePlace[]; t: T }) {
  return (
    <>
      {PLACE_GROUPS.map((g) => {
        const items = places.filter((p) => g.kinds.includes(p.kind));
        if (!items.length) return null;
        return (
          <section key={g.id} id={g.id} className="ld-sec">
            <div className="ld-wrap">
              <div className="ld-sechead">
                <div><p className="mono">{t(g.kicker as "places.kickerGuide")}</p><h2>{t(g.h as "places.hGuide")}</h2></div>
              </div>
              {g.kinds.map((k) => {
                const list = items.filter((p) => p.kind === k);
                return list.length ? (
                  <div key={k} className="yt-group">
                    <h3 className="yt-h">{t(KIND_LABEL[k] as "places.arrival")}</h3>
                    <div className="pl-grid">
                      {list.map((p) => (
                        <article key={p.id} className="pl-card">
                          {p.area ? <p className="lab">{p.area}</p> : null}
                          <h4>{p.title}</h4>
                          {p.body ? <p>{p.body}</p> : null}
                          {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer">{t("places.open")} ↗</a> : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}


export function ArticlesList({ race, articles, lang, t }: { race: Race; articles: RaceArticle[]; lang: Lang; t: T }) {
  return (
    <section id="articoli" className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-sechead">
          <div><p className="mono">{t("art.kicker")}</p><h2>{t("art.h2a")} <em>{t("art.h2b")}</em></h2></div>
          <p>{t("art.intro")}</p>
        </div>
        {articles.length === 0 ? (
          <div className="ld-empty"><b>{t("art.emptyB")}</b>{t("art.emptyText", { name: race.name })}</div>
        ) : (
          <div className="ld-arts">
            {articles.map((a) => (
              <Link key={a.id} className="ld-card ld-art" href={`${racePath(race, lang)}/${a.slug}`}>
                <span className="lab">{t(topicKey(a.topic))}{a.reading_min ? ` · ${t("art.min", { n: a.reading_min })}` : ""}{a.author_type === "ai" ? ` · ${t("art.ai")}` : ""}</span>
                <h3>{a.title}</h3>
                {a.dek ? <p>{a.dek}</p> : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function SourcesList({ race, sources, t }: { race: Race; sources: RaceSource[]; t: T }) {
  return (
    <section id="fonti" className="ld-sec">
      <div className="ld-wrap">
        <div className="ld-sechead">
          <div><p className="mono">{t("src.kicker")}</p><h2>{t("src.h2a")} <em>{t("src.h2b")}</em></h2></div>
          <p>{t("src.intro", { name: race.name })}</p>
        </div>
        {sources.length === 0 ? (
          <div className="ld-empty"><b>{t("src.emptyB")}</b>{t("src.emptyText")}</div>
        ) : (
          <div className="ld-srcs">
            {sources.map((s) => (
              <a key={s.id} className="ld-src" href={s.url} target="_blank" rel="noopener">
                <span className="k">{t(kindKey(s.kind))}</span>
                <span>
                  <span className="t">{s.title ?? s.url}</span>
                  <span className="a">{[s.author ?? (s.author_handle ? `@${s.author_handle}` : null), s.platform, s.edition_year].filter(Boolean).join(" · ")}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
