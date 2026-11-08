import { AthleteOverviewView, type PageProps } from "../AthleteOverviewView";

export const maxDuration = 300;

export default async function Page(props: PageProps) {
  return AthleteOverviewView(props, "dispositivi");
}
