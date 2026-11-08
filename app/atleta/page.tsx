import { AthleteOverviewView, type PageProps } from "./AthleteOverviewView";

export default async function AthleteOverview(props: PageProps) {
  return AthleteOverviewView(props, "home");
}
