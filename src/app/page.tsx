import { Wizard } from "@/components/wizard/Wizard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ResizableSplit } from "@/components/layout/ResizableSplit";

export default function Home() {
  return (
    <main>
      <ResizableSplit left={<Wizard />} right={<Dashboard />} />
    </main>
  );
}
