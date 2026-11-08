
## 24/7 Coach: regole di lavoro (Marco, 8/11/2026)
- Ogni nuova funzione per gli atleti 247 va annunciata a TUTTI gli atleti 247, ognuno dal proprio coach AI (nome in ai_athlete_profiles.coach_name: per Luca Valerio è "Dan"). Usa `announceFeature` (lib/server/announce.ts) o il form "Novità" in /admin: mette in coda in coach_outbox, parte su Telegram al giro orario (cron watch, minuto 15). Mai agli atleti di Irene.
- Quando un atleta (soprattutto Luca Valerio) chiede o suggerisce una funzione che non c'è, il coach risponde che oggi non c'è, che ci ragioniamo per inserirla e che torna da lui a breve; la richiesta finisce in feature_requests e arriva a Marco su Telegram. Quando la funzione è fatta: status 'fatta' in feature_requests e il coach torna dall'atleta.
- Gli atleti di Irene seguono un iter separato: non mischiare.
