import { Wizard } from "@/components/wizard/Wizard";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  return (
    <main className="grid h-screen grid-cols-1 lg:grid-cols-[minmax(380px,440px)_1fr]">
      <aside className="overflow-y-auto border-r border-slate-200 bg-white">
        <Wizard />
      </aside>
      <section className="overflow-y-auto p-6">
        <Dashboard />
      </section>
    </main>
  );
}
