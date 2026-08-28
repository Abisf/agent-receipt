import { Dashboard } from "@/components/Dashboard";
import { getSnapshot } from "@/lib/state";

export const dynamic = "force-dynamic";

export default function Home() {
  const initial = getSnapshot();
  return <Dashboard initial={initial} />;
}
