"use client";
// Percorso guidato al primo accesso: 7 passi, un solo form, dati precompilati.
import { useState } from "react";
import { useT } from "@/components/AppLang";

export interface WizardRace {
  id: string; name: string; race_date: string; distance_label: string | null; target_time: string | null; priority: string | null;
}
export interface WizardData {
  firstName: string;
  fit: Record<string, string>;
  ai: Record<string, string>;
  races: WizardRace[];
  hasIntervals: boolean;
  hasPlan: boolean;
}

const STEPS = ["Benvenuto", "I tuoi dati", "Obiettivi", "Tempo e attrezzatura", "Dove ti alleni", "La tua analisi", "Si parte"];

export default function Wizard({ data, action }: { data: WizardData; action: (fd: FormData) => void }) {
  const [step, setStep] = useState(0);
  const t = useT();
  const { fit, ai } = data;
  const last = STEPS.length - 1;
  const F = ({ name, label, type = "text", value, placeholder, step: st }: { name: string; label: string; type?: string; value?: string; placeholder?: string; step?: string }) => (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} step={st} />
    </div>
  );
  return (
    <form action={action} className="wiz">
      <ol className="wiz-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "on" : i < step ? "done" : ""} onClick={() => i < step && setStep(i)}>
            <span>{i + 1}</span>{t(s)}
          </li>
        ))}
      </ol>

      {/* Tutti i passi restano montati (hidden) così il form invia tutto insieme. */}
      <section className="card wiz-panel" hidden={step !== 0}>
        <h2>{t("Ciao {name}, io sono il tuo coach.", { name: data.firstName })}</h2>
        <p>{t("Sono un allenatore di ultra endurance che lavora 24 ore su 24 sui tuoi dati veri: le attività che arrivano dal Garmin via Intervals, la tua forma giorno per giorno, quello che mi scrivi.")}</p>
        <div className="wiz-how">
          <div><b>{t("Costruisco il piano")}</b><span>{t("Blocchi verso le tue gare, 4 settimane alla volta, con percorsi che conosci già.")}</span></div>
          <div><b>{t("Ogni domenica pomeriggio")}</b><span>{t("Rileggo la settimana fatta davvero (non quella scritta) e preparo la successiva.")}</span></div>
          <div><b>{t("Quando mi scrivi")}</b><span>{t("Decido io se cambiare il piano da domani, tenerne conto domenica, o solo risponderti — e te lo dico.")}</span></div>
          <div><b>{t("Mai sopra i tuoi limiti")}</b><span>{t("Tempo feriale, weekend, palestra con la tua preparatrice: sono vincoli, non suggerimenti.")}</span></div>
        </div>
        <p className="dim">{t("Nei prossimi passi confermiamo insieme i dati da cui parto. Ci vogliono tre minuti.")}</p>
      </section>

      <section className="card wiz-panel" hidden={step !== 1}>
        <h2>{t("I tuoi dati")}</h2>
        <p className="dim">{t("Li uso per zone, W/kg e carichi in salita. Correggi quello che non torna.")}</p>
        <div className="wiz-grid">
          <F name="birth_date" label={t("Data di nascita")} type="date" value={fit.birth_date} />
          <F name="height_cm" label={t("Altezza (cm)")} type="number" value={fit.height_cm} />
          <F name="weight_kg" label={t("Peso (kg)")} type="number" step="0.1" value={fit.weight_kg} />
          <F name="body_fat_pct" label={t("Massa grassa (%)")} type="number" step="0.5" value={fit.body_fat_pct} />
          <F name="resting_hr" label={t("FC a riposo")} type="number" value={fit.resting_hr} placeholder={t("es. 45")} />
          <F name="max_hr" label={t("FC massima")} type="number" value={fit.max_hr} />
          <F name="lthr" label={t("FC di soglia (se la conosci)")} type="number" value={fit.lthr} />
          <F name="ftp_watts" label={t("FTP bici (W, se la conosci)")} type="number" value={fit.ftp_watts} />
          <F name="threshold_pace" label={t("Passo soglia corsa (min/km)")} value={fit.threshold_pace} placeholder={t("es. 4:05")} />
        </div>
        <p className="dim">{t("Quello che non sai, lascialo vuoto: lo misuriamo con i test nelle prime due settimane.")}</p>
      </section>

      <section className="card wiz-panel" hidden={step !== 2}>
        <h2>{t("Obiettivi")}</h2>
        <p className="dim">{t("Le gare che ho in calendario. Conferma priorità (A = l'obiettivo, B = importante, C = allenamento) e, se ce l'hai, il tempo o il piazzamento che vuoi.")}</p>
        <div className="wiz-races">
          {data.races.map((r) => (
            <div className="wiz-race" key={r.id}>
              <input type="hidden" name="race_id" value={r.id} />
              <div className="wiz-race-main"><b>{r.name}</b><span className="mono">{r.race_date}{r.distance_label ? ` · ${r.distance_label}` : ""}</span></div>
              <select className="input" name={`race_priority_${r.id}`} defaultValue={r.priority ?? "B"}>
                <option value="A">{t("A · obiettivo")}</option><option value="B">{t("B · importante")}</option><option value="C">{t("C · allenamento")}</option>
              </select>
              <input className="input" name={`race_target_${r.id}`} defaultValue={r.target_time ?? ""} placeholder={t("obiettivo: es. sotto le 12h, finire, top 50")} />
              <label className="wiz-remove"><input type="checkbox" name={`race_remove_${r.id}`} /> {t("togli")}</label>
            </div>
          ))}
        </div>
        <details className="wiz-add">
          <summary>{t("Aggiungi una gara")}</summary>
          <div className="wiz-grid">
            <F name="new_race_name" label={t("Nome")} placeholder={t("es. Lavaredo Ultra Trail")} />
            <F name="new_race_date" label={t("Data")} type="date" />
            <F name="new_race_distance" label={t("Distanza")} placeholder={t("es. 120 km D+5800")} />
            <F name="new_race_target" label={t("Obiettivo")} placeholder={t("es. finire sotto le 28h")} />
            <div className="field"><label className="label">{t("Priorità")}</label><select className="input" name="new_race_priority" defaultValue="B"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div>
          </div>
        </details>
        <div className="field">
          <label className="label">{t("Cosa vuoi da questa stagione, con parole tue")}</label>
          <textarea className="input" name="goal_notes" rows={4} defaultValue={ai.goal_notes ?? ""} placeholder={t("Es. arrivare a Sanremo senza crollare, poi fare un ultra da 90 km stando bene.")} />
        </div>
        <div className="field">
          <label className="label">{t("Da dove vieni (anni, gare fatte, come ti senti ora)")}</label>
          <textarea className="input" name="experience_notes" rows={3} defaultValue={ai.experience_notes ?? ""} />
        </div>
        <div className="field">
          <label className="label">{t("Fastidi o limitazioni di cui devo tenere conto")}</label>
          <input className="input" name="injuries" defaultValue={ai.injuries ?? ""} placeholder={t("Nessuno")} />
        </div>
      </section>

      <section className="card wiz-panel" hidden={step !== 3}>
        <h2>{t("Tempo e attrezzatura")}</h2>
        <p className="dim">{t("Questi sono vincoli assoluti: il piano non li supera mai.")}</p>
        <div className="wiz-grid">
          <F name="weekday_minutes_max" label={t("Minuti massimi per seduta, lun-ven")} type="number" value={ai.weekday_minutes_max} placeholder="80" />
          <F name="weekend_hours_max" label={t("Ore totali nel weekend (nei blocchi di carico)")} type="number" step="0.5" value={ai.weekend_hours_max} placeholder="5" />
          <F name="availability_days" label={t("Giorni a settimana")} type="number" value={ai.availability_days} placeholder="6" />
          <F name="availability_hours" label={t("Ore a settimana (indicativo)")} type="number" step="0.5" value={ai.availability_hours} placeholder="9" />
          <F name="strength_sessions_per_week" label={t("Palestra: sedute a settimana")} type="number" value={ai.strength_sessions_per_week} placeholder="2" />
        </div>
        <div className="field"><label className="label">{t("Palestra: cosa fai e con chi")}</label><input className="input" name="strength_notes" defaultValue={ai.strength_notes ?? ""} /></div>
        <div className="field"><label className="label">{t("Vincoli fissi (giorni, orari, impegni)")}</label><textarea className="input" name="fixed_constraints" rows={3} defaultValue={ai.fixed_constraints ?? ""} /></div>
        <div className="field"><label className="label">{t("Attrezzatura (bici, rulli, bastoncini, orologio…)")}</label><textarea className="input" name="equipment" rows={2} defaultValue={ai.equipment ?? ""} /></div>
      </section>

      <section className="card wiz-panel" hidden={step !== 4}>
        <h2>{t("Dove ti alleni")}</h2>
        <p className="dim">{t("Conosco i tuoi percorsi dalle tracce GPS. Se so dove sei, ti propongo quello giusto per ogni seduta.")}</p>
        <div className="wiz-grid">
          <F name="home_base" label={t("Base nei giorni feriali")} value={ai.home_base} placeholder={t("es. Novara")} />
          <F name="weekend_base" label={t("Base nel weekend (se diversa)")} value={ai.weekend_base} placeholder={t("es. Morgex, Valle d'Aosta")} />
        </div>
        <p className="dim">{t("Cambia qualcosa una settimana? Scrivimelo nel dialogo (“la prossima settimana sono a Chioggia”): ne tengo conto domenica quando costruisco la settimana.")}</p>
      </section>

      <section className="card wiz-panel" hidden={step !== 5}>
        <h2>{t("La tua analisi")}</h2>
        <p className="dim">{t("Nella pagina")} <b>{t("Analisi")}</b> {t("trovi gli stessi numeri che leggo io prima di scrivere il piano.")}</p>
        <div className="wiz-how">
          <div><b>{t("Forma")}</b><span>{t("CTL fitness (42 giorni), ATL fatica (7), TSB freschezza. Sotto −25 scarico, sopra +5 pronto per una gara.")}</span></div>
          <div><b>{t("Ore a settimana e mesi")}</b><span>{t("Volume per sport, km e dislivello: dove sei stato forte e dove manca.")}</span></div>
          <div><b>{t("Zone FC e record")}</b><span>{t("Quanto corri facile davvero, e i tuoi riferimenti degli ultimi 12 mesi.")}</span></div>
          <div><b>{t("Percorsi")}</b><span>{t("Gli anelli che fai di solito, con km, D+ e tempo tipico: li uso per suggerirti dove andare.")}</span></div>
        </div>
      </section>

      <section className="card wiz-panel" hidden={step !== 6}>
        <h2>{t("Si parte.")}</h2>
        <p>{t("Salvo tutto e costruisco il piano sui tuoi dati. Ci vogliono 3-4 minuti: la pagina ti tiene aggiornato.")}</p>
        {!data.hasIntervals ? (
          <p className="pill warn">{t("Intervals.icu non è collegato: senza, non vedo le tue attività. Lo colleghi dopo in Dispositivi.")}</p>
        ) : null}
        <div className="wiz-actions">
          <button className="btn btn-primary btn-lg" type="submit" name="then" value="plan">{data.hasPlan ? t("Salva e rigenera il piano") : t("Salva e genera il piano")}</button>
          <button className="btn btn-subtle" type="submit" name="then" value="home">{t("Salva e basta")}</button>
        </div>
      </section>

      <div className="wiz-nav">
        <button type="button" className="btn btn-subtle" disabled={step === 0} onClick={() => setStep(step - 1)}>{t("Indietro")}</button>
        <span className="mono">{step + 1} / {STEPS.length}</span>
        {step < last ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>{t("Avanti")}</button>
        ) : <span />}
      </div>
    </form>
  );
}
