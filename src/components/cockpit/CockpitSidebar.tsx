"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Calendar,
  Coins,
  FileBarChart,
  ExternalLink,
  Settings,
  HelpCircle,
} from "lucide-react";
import { MOCK_BERATER } from "@/lib/mock-mandanten";

export function CockpitSidebar() {
  const pathname = usePathname() ?? "";

  const navItems = [
    { href: "/app", icon: LayoutGrid, label: "Dashboard", exact: true },
    { href: "/app/mandanten", icon: Users, label: "Mandanten" },
    { href: "/app/termine", icon: Calendar, label: "Termine" },
    { href: "/app/provisionen", icon: Coins, label: "Provisionen" },
    { href: "/app/berichte", icon: FileBarChart, label: "Berichte" },
  ];

  const externalItems = [
    { href: "/", label: "Pro-Modus", sub: "10-Block-Wizard" },
    { href: "/erfassung", label: "Erfassung", sub: "Affiliate-Tool" },
    { href: "/kunde", label: "Kunden-Funnel", sub: "Public B2C" },
  ];

  return (
    <aside
      className="flex w-[220px] shrink-0 flex-col border-r"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-2.5 border-b px-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="inline-flex items-center gap-2 rounded-[10px] px-2.5 py-1.5"
          style={{ background: "var(--cuira-deep)" }}
        >
          <Image
            src="/cuira-logo.png"
            alt="Cuira"
            width={64}
            height={18}
            priority
            className="h-4 w-auto"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
                style={{
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent-ink)" : "var(--ink-2)",
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div
          className="my-5 h-px"
          style={{ background: "var(--border)" }}
        />

        <div
          className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--ink-3)" }}
        >
          Direkt-Links
        </div>
        <div className="space-y-0.5">
          {externalItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target="_blank"
              className="flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <ExternalLink
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                style={{ color: "var(--ink-3)" }}
              />
              <div className="leading-tight">
                <div
                  className="text-[12.5px] font-medium"
                  style={{ color: "var(--ink-2)" }}
                >
                  {item.label}
                </div>
                <div
                  className="text-[10.5px]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {item.sub}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      {/* User-Footer */}
      <div
        className="border-t p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: "var(--cuira-deep)" }}
          >
            {MOCK_BERATER.initialen}
          </div>
          <div className="flex-1 leading-tight">
            <div
              className="text-[12.5px] font-medium"
              style={{ color: "var(--ink) " }}
            >
              {MOCK_BERATER.name}
            </div>
            <div
              className="text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              {MOCK_BERATER.rolle}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors hover:bg-[var(--surface-hover)]"
            style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
          >
            <Settings className="h-3 w-3" />
            Einstellungen
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-md border px-2 py-1.5 transition-colors hover:bg-[var(--surface-hover)]"
            style={{ borderColor: "var(--border)", color: "var(--ink-2)" }}
            title="Hilfe"
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
