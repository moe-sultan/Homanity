"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { useStore } from "@/lib/store";

// The flow as four steps. The header doubles as navigation.
export function Header() {
  const pathname = usePathname();
  const { saved, context } = useStore();

  const current = pathname.startsWith("/saved")
    ? 3
    : pathname.startsWith("/properties")
      ? 2
      : pathname.startsWith("/areas")
        ? 1
        : 0;

  const steps = [
    { label: "Your life", href: context ? "/context" : "/", enabled: true },
    { label: "Areas", href: "/areas", enabled: !!context },
    { label: "Homes", href: "/areas", enabled: !!context },
    { label: "Compare", href: "/saved", enabled: !!context, badge: saved.length },
  ];

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <House size={17} strokeWidth={2.4} />
          </span>
          <span className="brand-name">Homanity</span>
        </Link>
        <nav className="steps" aria-label="Steps">
          {steps.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <span className="step-sep" />}
              <Link
                href={s.href}
                className={`step ${i === current ? "active" : i < current ? "done" : ""} ${s.enabled ? "" : "disabled"}`}
                aria-current={i === current ? "step" : undefined}
              >
                <span className="dot-n">{i + 1}</span>
                <span className="lbl">{s.label}</span>
                {s.badge ? <span className="count" aria-label={`${s.badge} saved`}>{s.badge}</span> : null}
              </Link>
            </Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
}
