"use client";

import { useEffect, useRef, useState } from "react";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down";
  icon: LucideIcon;
}

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

export function StatCard({ label, value, delta, deltaType, icon: Icon }: StatCardProps) {
  const isNumeric = typeof value === "number" || (typeof value === "string" && value !== "—" && !isNaN(parseFloat(value)));
  const targetNum = isNumeric ? parseFloat(String(value)) : 0;
  const isFloat = String(value).includes(".");

  const animated = useCountUp(isNumeric ? targetNum : 0);

  const displayValue = !isNumeric
    ? value
    : isFloat
    ? animated.toFixed(1)
    : Math.round(animated);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
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
          fontSize: "24px",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
          marginTop: "8px",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayValue}
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
