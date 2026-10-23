// Demo-site stand-in for ./sample.ts (static build has no server).
import type { SampleState } from "./types";

export async function loadSampleData(): Promise<SampleState> {
  return { error: "Not available on the demo site." };
}
