"use client";
// Calendario con ricerca: testo libero (nome, città, regione, paese), distanza,
// paese e mese. Tutto lato client sul catalogo già caricato (poche decine di gare).
import { useMemo, useState } from "react";
import { RaceCard } from "./RaceCard";
import type { Race } from "@/lib/site/races";
import { LOCALE, type Lang } from "@/lib/i18n/config";
import { fmt, type Dict } from "@/lib/i18n/dict";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function RaceBrowser({ races, lang, dict }: { races: Race[]; lang: Lang; dict: Dict }) {
  const t = (k: keyof Dict, v?: Record<string, string | number>) => fmt(dict[k] ?? k, v);
  const tt = ((k: string, v?: Record<string, string | number>) => fmt(dict[k as keyof Dict] ?? k, v)) as never;
  const [q, setQ] = useState("");
  const [dist, setDist] = useState<"all" | "full" | "half">("all");
  const [country, setCountry] = useState("");
  const [month, setMonth] = useState("");

  const countries = useMemo(() => [...new Set(races.map((r) => r.country).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, LOCALE[lang])), [races, lang]);
  const months = useMemo(() => {
    const set = new Set(races.map((r) => r.race_date?.slice(5, 7)).filter(Boolean) as string[]);
    return [...set].sort().map((m) => ({ m, label: new Date(Date.UTC(2027, Number(m) - 1, 15)).toLocaleDateString(LOCALE[lang], { month: "long", timeZone: "UTC" }) }));
  }, [races, lang]);

  const rows = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return races.filter((r) => {
      if (dist !== "all" && r.distance !== dist) return false;
      if (country && r.country !== country) return false;
      if (month && r.race_date?.slice(5, 7) !== month) return false;
      if (!words.length) return true;
      const hay = norm([r.name, r.official_name, r.city, r.region, r.country, r.series, r.distance === "full" ? "ironman full" : "70.3 half", r.tagline].filter(Boolean).join(" "));
      return words.every((w) => hay.includes(w));
    });
  }, [races, q, dist, country, month]);
  const active = q || dist !== "all" || country || month;

  return (
    <>
      <div className="rb">
        <input className="cx-inp rb-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("races.search")} aria-label={t("races.search")} />
        <div className="rb-f">
          <span className="ld-seg">
            {([["all", t("races.fAll")], ["full", t("races.full")], ["half", t("races.half")]] as ["all" | "full" | "half", string][]).map(([v, l]) => (
              <button key={v} type="button" className={dist === v ? "on" : ""} onClick={() => setDist(v)}>{l}</button>
            ))}
          </span>
          <select className="cx-inp" value={country} onChange={(e) => setCountry(e.target.value)} aria-label={t("races.fCountry")}>
            <option value="">{t("races.fCountry")}: {t("races.fAll")}</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="cx-inp" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t("races.fMonth")}>
            <option value="">{t("races.fMonth")}: {t("races.fAll")}</option>
            {months.map((m) => <option key={m.m} value={m.m}>{m.label}</option>)}
          </select>
          {active ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQ(""); setDist("all"); setCountry(""); setMonth(""); }}>{t("races.clear")}</button> : null}
        </div>
        <p className="src" aria-live="polite">{t("races.count", { n: rows.length })} · {t("races.fSort")}</p>
      </div>
      {rows.length ? (
        <div className="ld-cal">{rows.map((r) => <RaceCard key={r.id} r={r} lang={lang} t={tt} />)}</div>
      ) : (
        <div className="ld-empty"><b>{t("races.noResult")}</b></div>
      )}
    </>
  );
}
