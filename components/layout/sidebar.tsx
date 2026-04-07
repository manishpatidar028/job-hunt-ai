"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Telescope,
  Sparkles,
  Kanban,
  BrainCircuit,
  Settings,
} from "lucide-react";

const navGroups = [
  {
    label: "DISCOVER",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/jobs", label: "Evaluate Job", icon: Search },
      { href: "/discover", label: "Discover Jobs", icon: Telescope },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { href: "/skills", label: "My Skills", icon: Sparkles },
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
    ],
  },
  {
    label: "PREPARE",
    items: [
      { href: "/prep", label: "Interview Prep", icon: BrainCircuit },
    ],
  },
];

const bottomNav = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 10px",
        margin: "1px 8px",
        borderRadius: "var(--radius-md)",
        fontSize: "12px",
        fontWeight: active ? 500 : 400,
        color: active ? "var(--nav-active-text)" : "var(--nav-inactive-text)",
        background: active ? "var(--nav-active-bg)" : "transparent",
        textDecoration: "none",
        transition: "all 0.12s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "#F8FAFC";
          el.style.color = "var(--text-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "transparent";
          el.style.color = "var(--nav-inactive-text)";
        }
      }}
    >
      <Icon
        size={14}
        strokeWidth={active ? 2 : 1.5}
        color={active ? "var(--nav-active-icon)" : "var(--nav-inactive-icon)"}
      />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const user = { name: "Your Name", email: "you@example.com" };
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        height: "100vh",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 40,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "18px 16px",
          borderBottom: "1px solid var(--sidebar-border)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            background: "#10B981",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* White checkmark SVG */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7L5.5 10L11.5 4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.3px",
          }}
        >
          JobHunt AI
        </span>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "0",
        }}
      >
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "4px" }}>
            <div
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: "var(--text-placeholder)",
                padding: "14px 16px 5px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                }
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--sidebar-border)",
        }}
      >
        {bottomNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.startsWith(item.href)}
          />
        ))}

        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
