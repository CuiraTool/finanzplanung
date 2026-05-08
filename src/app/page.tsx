import { Wizard } from "@/components/wizard/Wizard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ResizableSplit } from "@/components/layout/ResizableSplit";
import { CuiraHeader } from "@/components/layout/CuiraHeader";

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <CuiraHeader />
      <div className="flex-1 overflow-hidden">
        <ResizableSplit left={<Wizard />} right={<Dashboard />} />
      </div>
    </main>
  );
}
