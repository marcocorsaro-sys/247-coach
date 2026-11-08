import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Fissa la root del progetto: evita che Next la inferisca dalla home
  // quando esistono lockfile multipli (es. ~/package-lock.json).
  outputFileTracingRoot: __dirname,
  // Il progetto è in iCloud Drive: iCloud "sfratta" i file dentro `.next`
  // mentre il dev server gira → ENOENT su `.next/server/.../page.js` e crash 500.
  // Una cartella che termina in `.nosync` è esclusa dalla sincronizzazione
  // iCloud, quindi in sviluppo scriviamo la build lì, rendendola immune agli
  // sfratti. In produzione (Vercel) si usa la `.next` standard.
  ...(isDev ? { distDir: ".next.nosync" } : {}),
  experimental: {
    serverActions: {
      // L'import dello storico manda l'intero .xlsx alla server action, e il
      // limite predefinito è 1 MB: le tabelle vere lo superano appena hanno
      // qualche foglio in più o un'immagine dentro. Superato il limite Next
      // rifiuta la richiesta prima del nostro codice e la coach si trova una
      // pagina di errore senza spiegazione.
      // Il tetto vero è quello di Vercel (4,5 MB per il corpo di una
      // richiesta): oltre non si passa comunque, quindi 4 MB è il massimo
      // utile. Il campo file avvisa prima di arrivarci.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
