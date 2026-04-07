"use client";

import { Bell, ChevronDown, Menu } from "lucide-react";

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const user = { name: "Your Name" };
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      style={{
        height: "var(--topbar-height)",
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--topbar-border)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onMenuClick}
          className="md-hide"
          style={{
            display: "none",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "var(--radius-sm)",
          }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <h1
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Notification bell */}
        <button
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-muted)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          aria-label="Notifications"
        >
          <Bell size={16} color="var(--text-muted)" />
        </button>

        {/* User chip */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 10px 4px 4px",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-full)",
            background: "transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-muted)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 700,
              color: "white",
            }}
          >
            {initials}
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {user.name}
          </span>
          <ChevronDown size={12} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  );
}
