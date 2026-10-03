"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export function Header() {
  const pathname = usePathname();
  const { saved, context } = useStore();
  const is = (prefix: string) => (prefix === "/" ? pathname === "/" || pathname === "/context" : pathname.startsWith(prefix));

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">⌂</span> Homanity
        </Link>
        <nav className="nav">
          <Link href={context ? "/context" : "/"} className={is("/") ? "active" : ""}>
            Your life
          </Link>
          <Link href="/areas" className={is("/areas") || is("/properties") ? "active" : ""}>
            Areas
          </Link>
          <Link href="/saved" className={is("/saved") ? "active" : ""}>
            Saved{saved.length > 0 && <span className="count">{saved.length}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
