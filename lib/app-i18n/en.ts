// Dizionario inglese dell'app (chiave = testo italiano esatto). Diviso per area.
import common from "./en/common";
import onboarding from "./en/onboarding";
import auth from "./en/auth";
import overview from "./en/overview";
import week from "./en/week";
import month from "./en/month";
import analysis from "./en/analysis";
import components from "./en/components";
import actions from "./en/actions";
import fixes from "./en/fixes";

export const EN: Record<string, string> = { ...common, ...onboarding, ...auth, ...overview, ...week, ...month, ...analysis, ...components, ...actions, ...fixes };
