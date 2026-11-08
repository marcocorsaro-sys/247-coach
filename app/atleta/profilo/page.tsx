import { AthleteOverviewView, type PageProps } from "../AthleteOverviewView";

export default async function Page(props: PageProps) {
  return AthleteOverviewView(props, "profilo");
}
