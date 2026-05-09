"use client";

import { Wizard } from "@/components/wizard/Wizard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ResizableSplit } from "@/components/layout/ResizableSplit";
import { CuiraHeader } from "@/components/layout/CuiraHeader";
import { useViewMode } from "@/lib/view-mode";

export default function Home() {
  const [viewMode, setViewMode] = useViewMode();

  return (
    <main className="flex h-screen flex-col">
      <CuiraHeader viewMode={viewMode} onViewModeChange={setViewMode} />
      <div className="flex-1 overflow-hidden">
        <ResizableSplit
          left={<Wizard />}
          right={<Dashboard />}
          viewMode={viewMode}
        />
      </div>
    </main>
  );
}
