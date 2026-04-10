"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Menu, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("...");
  const [userEmail, setUserEmail] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { email?: string; user_metadata?: Record<string, string> } | null } }) => {
      const meta = data.user?.user_metadata;
      setUserEmail(data.user?.email ?? "");
      setUserName(
        meta?.full_name || meta?.name || data.user?.email?.split("@")[0] || "User"
      );
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initials = userName
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
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
          style={{ display: "none", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", borderRadius: "var(--radius-sm)" }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <h1 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          {title}
        </h1>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Bell */}
        <div ref={bellRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setBellOpen((v) => !v); setProfileOpen(false); }}
            style={{
              width: "32px", height: "32px", borderRadius: "var(--radius-md)",
              border: `1px solid ${bellOpen ? "var(--accent-border)" : "var(--border-strong)"}`,
              background: bellOpen ? "var(--accent-subtle)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s ease", position: "relative",
            }}
            aria-label="Notifications"
          >
            <Bell size={16} color={bellOpen ? "var(--accent)" : "var(--text-muted)"} />
          </button>

          {bellOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: "300px", background: "#fff",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-dropdown)", zIndex: 50, overflow: "hidden",
              animation: "dropIn 0.15s ease",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Notifications</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-muted)", padding: "2px 7px", borderRadius: "100px" }}>0 new</span>
              </div>
              <div style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Bell size={24} color="var(--text-placeholder)" style={{ marginBottom: "8px" }} />
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>No notifications yet</p>
                <p style={{ fontSize: "11px", color: "var(--text-placeholder)", marginTop: "4px" }}>
                  You'll be notified when new matches arrive from nightly discovery.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Profile chip */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setProfileOpen((v) => !v); setBellOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "4px 10px 4px 4px",
              border: `1px solid ${profileOpen ? "var(--accent-border)" : "var(--border-strong)"}`,
              borderRadius: "var(--radius-full)",
              background: profileOpen ? "var(--accent-subtle)" : "transparent",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "white" }}>
              {initials}
            </div>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
              {userName}
            </span>
            <ChevronDown size={12} color="var(--text-muted)" style={{ transition: "transform 0.15s ease", transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          {profileOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: "220px", background: "#fff",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-dropdown)", zIndex: 50, overflow: "hidden",
              animation: "dropIn 0.15s ease",
            }}>
              {/* User info */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{userName}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
              </div>

              {/* Menu items */}
              <div style={{ padding: "6px" }}>
                <DropdownItem icon={<User size={13} />} label="My Profile" onClick={() => { setProfileOpen(false); router.push("/profile"); }} />
                <DropdownItem icon={<Settings size={13} />} label="Settings" onClick={() => { setProfileOpen(false); router.push("/settings"); }} />
              </div>

              <div style={{ borderTop: "1px solid var(--border-default)", padding: "6px" }}>
                <DropdownItem icon={<LogOut size={13} />} label="Sign out" onClick={handleSignOut} danger />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

function DropdownItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "9px",
        padding: "8px 10px", borderRadius: "var(--radius-md)",
        background: hovered ? (danger ? "var(--danger-bg)" : "var(--bg-muted)") : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
        color: danger ? "var(--danger)" : "var(--text-primary)",
        fontSize: "12px", fontWeight: 500, transition: "background 0.1s ease",
      }}
    >
      <span style={{ color: danger ? "var(--danger)" : "var(--text-muted)", display: "flex" }}>{icon}</span>
      {label}
      {!danger && <ChevronRight size={11} style={{ marginLeft: "auto", color: "var(--text-placeholder)" }} />}
    </button>
  );
}
