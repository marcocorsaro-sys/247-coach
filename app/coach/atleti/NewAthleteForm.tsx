"use client";

import { useState } from "react";
import { createAthlete } from "./actions";
import { ATHLETE_CATEGORIES } from "@/lib/training/categories";

function slugName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".");
}

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string, k: number) =>
    Array.from({ length: k }, () => set[Math.floor(Math.random() * set.length)]).join("");
  return pick(upper, 1) + pick(lower, 5) + pick(digits, 3);
}

export default function NewAthleteForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("");
  const [phone, setPhone] = useState("");

  const genEmail = () => {
    const base = slugName(name) || "atleta" + Math.floor(Math.random() * 1000);
    setEmail(`${base}@tabella.app`);
  };

  return (
    <form action={createAthlete}>
      <div className="card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label className="label">Nome e cognome</label>
            <input
              className="input"
              name="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Giulia Rossi"
            />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label className="label">Livello</label>
            <select
              className="input"
              name="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">—</option>
              <option value="neofita">Neofita</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzato">Avanzato</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Email (ID di accesso)</label>
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email di login dell'atleta"
            />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={genEmail} style={{ marginBottom: 2 }}>
            ⚙ Genera email
          </button>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label className="label">Password</label>
            <input
              className="input"
              name="password"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 6 caratteri"
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setPassword(genPassword())}
            style={{ marginBottom: 2 }}
          >
            ⚙ Genera password
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Telefono (per notifica SMS, opzionale)</label>
            <input
              className="input"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+39 333 1234567"
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label className="label">Tipo di atleta (uno o più)</label>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
            {ATHLETE_CATEGORIES.map(([value, label]) => (
              <label
                key={value}
                className="mono"
                style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}
              >
                <input type="checkbox" name="categories" value={value} /> {label}
              </label>
            ))}
          </div>
        </div>

        <div
          className="mono"
          style={{ color: "var(--text-2)", fontSize: ".78rem", marginTop: 12 }}
        >
          // Annota email e password: servono all&apos;atleta per accedere. La password è visibile solo
          ora.
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="submit">
            + Crea atleta
          </button>
        </div>
      </div>
    </form>
  );
}
