"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav-items";

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-neutral-900 text-neutral-100" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
