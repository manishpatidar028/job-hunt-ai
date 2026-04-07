"use client";

import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down";
  icon: LucideIcon;
}

export function StatCard({ label, value, delta, deltaType, icon: Icon }: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "16px",
        boxShadow: "var(--shadow-card)",
        transition: "box-shadow 0.18s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-card)";
      }}
    >
      {/* Top row: label + icon */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--radius-md)",
            background: "var(--accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color="var(--accent)" strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
          marginTop: "10px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {/* Delta */}
      {delta && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "11px",
            fontWeight: 500,
            color:
              deltaType === "up"
                ? "var(--success)"
                : deltaType === "down"
                ? "var(--danger)"
                : "var(--text-muted)",
          }}
        >
          {deltaType === "up" ? "↑ " : deltaType === "down" ? "↓ " : ""}
          {delta}
        </div>
      )}
    </div>
  );
}
