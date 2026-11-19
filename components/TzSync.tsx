"use client";
// Manda al server il fuso orario del browser dell'atleta (una volta, e quando cambia).
import { useEffect } from "react";
import { saveTimezone } from "@/app/atleta/tz-action";

export default function TzSync({ current }: { current: string | null }) {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== current) void saveTimezone(tz);
    } catch { /* browser senza Intl: resta il fuso di default */ }
  }, [current]);
  return null;
}
