"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";

const nav = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/students", label: "Students", icon: "users" },
  { href: "/library", label: "Ebook library", icon: "book" },
] as const;

export function AppShell({
  children,
  demo = true,
}: {
  children: React.ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <span />
          </span>
          <span>
            reading
            <br />
            <em>radar</em>
          </span>
        </Link>
        <div className="school-switcher">
          <span className="eyebrow">School</span>
          <strong>Cedar Grove Elementary</strong>
          <span className="switch-chevron">⌄</span>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "active" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-note">
            <span className="spark-dot">
              <Icon name="spark" size={14} />
            </span>
            <p>
              <strong>Small steps matter.</strong>
              <br />
              Keep the momentum going.
            </p>
          </div>
          <div className="profile">
            <span className="avatar">AR</span>
            <span>
              <strong>Alex Rivera</strong>
              <small>Teacher · All classrooms</small>
            </span>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>
              {pathname === "/library" ? "Collection" : "All classrooms"}
            </span>
            <span className="slash">/</span>
            <strong>
              {pathname === "/library"
                ? "Ebook library"
                : pathname.startsWith("/students")
                  ? "Students"
                  : "Overview"}
            </strong>
          </div>
          <div className="top-actions">
            <span className={`data-badge ${demo ? "" : "live"}`}>
              <span className="status-dot" />
              {demo ? "Demo data" : "Live classroom"}
            </span>
            <button className="icon-button" aria-label="Search">
              <Icon name="search" />
            </button>
            <button className="notification" aria-label="Notifications">
              <span>2</span>○
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
