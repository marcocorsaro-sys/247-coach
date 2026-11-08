// Tipi di atleta (multi-valore). Allineati al check di athlete_categories.
export const ATHLETE_CATEGORIES: [string, string][] = [
  ["triathlete", "Triatleta"],
  ["runner", "Runner"],
  ["ultra_runner", "Ultra runner"],
  ["swimmer", "Nuotatore"],
  ["cyclist", "Ciclista"],
];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ATHLETE_CATEGORIES,
);

export function categoryLabels(cats: string[]): string[] {
  return cats.map((c) => CATEGORY_LABEL[c] ?? c);
}
