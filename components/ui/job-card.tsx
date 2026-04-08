"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Wifi, Clock, ArrowRight } from "lucide-react";

interface JobCardProps {
  company: string;
  role: string;
  score: number;
  status: string;
  location?: string;
  isRemote?: boolean;
  salaryRange?: { min?: number; max?: number };
  currency?: string;
  discoveredAt?: string;
  href?: string;
}

// 6 bg/text pairs for company logos
const LOGO_PALETTES: [string, string][] = [
  ["#EFF6FF", "#3B82F6"],
  ["#F0FDF4", "#10B981"],
  ["#FDF4FF", "#A855F7"],
  ["#FFF7ED", "#F97316"],
  ["#FEF2F2", "#EF4444"],
  ["#F0FDFA", "#14B8A6"],
];

function companyPalette(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOGO_PALETTES[Math.abs(hash) % LOGO_PALETTES.length];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  new:        { bg: "var(--bg-muted)",    color: "var(--text-muted)",    border: "var(--border-strong)" },
  reviewing:  { bg: "var(--warning-bg)",  color: "var(--warning)",       border: "var(--warning-border)" },
  applied:    { bg: "var(--info-bg)",     color: "var(--info)",          border: "var(--info-border)" },
  responded:  { bg: "var(--info-bg)",     color: "var(--info)",          border: "var(--info-border)" },
  interview:  { bg: "var(--warning-bg)",  color: "var(--warning)",       border: "var(--warning-border)" },
  offer:      { bg: "var(--success-bg)",  color: "var(--success)",       border: "var(--success-border)" },
  rejected:   { bg: "var(--danger-bg)",   color: "var(--danger)",        border: "var(--danger-border)" },
  skipped:    { bg: "var(--bg-muted)",    color: "var(--text-muted)",    border: "var(--border-strong)" },
};

function scoreStyle(score: number) {
  if (score >= 4.0) return { color: "var(--score-high)", bg: "var(--success-bg)" };
  if (score >= 3.0) return { color: "var(--score-mid)",  bg: "var(--warning-bg)" };
  return               { color: "var(--score-low)",  bg: "var(--danger-bg)" };
}

function formatSalary(min?: number, max?: number, currency = "INR") {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    currency === "INR" ? `₹${(n / 100000).toFixed(0)}L` : `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `up to ${fmt(max)}`;
  return null;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function JobCard({
  company,
  role,
  score,
  status,
  location,
  isRemote,
  salaryRange,
  currency = "INR",
  discoveredAt,
  href = "/jobs",
}: JobCardProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const [logoBg, logoText] = companyPalette(company);
  const logoInitials = company.slice(0, 2).toUpperCase();
  const sc = scoreStyle(score);
  const st = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  const salary = formatSalary(salaryRange?.min, salaryRange?.max, currency);
  const time = timeAgo(discoveredAt);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${hovered ? "var(--border-accent)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "16px",
        boxShadow: hovered ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.18s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(href)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Company logo */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: logoBg,
            color: logoText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {logoInitials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 500,
              color: "var(--text-muted)",
              marginBottom: "3px",
            }}
          >
            {company}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.4,
            }}
          >
            {role}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {/* Score badge */}
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: sc.color,
            background: sc.bg,
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
          }}
        >
          {score.toFixed(1)}/5
        </span>

        {/* Tags */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {/* Status */}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              background: st.bg,
              color: st.color,
              border: `1px solid ${st.border}`,
              textTransform: "capitalize",
            }}
          >
            {status}
          </span>

          {/* Location */}
          {location && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-secondary)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 7px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <MapPin size={9} />
              {location}
            </span>
          )}

          {/* Remote */}
          {isRemote && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-secondary)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 7px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Wifi size={9} />
              Remote
            </span>
          )}

          {/* Salary */}
          {salary && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-secondary)",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 7px",
              }}
            >
              {salary}
            </span>
          )}

          {/* Time */}
          {time && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Clock size={9} />
              {time}
            </span>
          )}
        </div>
      </div>

      {/* Hover CTA */}
      {hovered && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "4px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--accent)",
            borderTop: "1px solid var(--border-default)",
            paddingTop: "10px",
            marginTop: "10px",
          }}
        >
          Review job
          <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
}
