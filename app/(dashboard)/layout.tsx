"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/jobs": "Evaluate Job",
  "/discover": "Discover Jobs",
  "/skills": "My Skills",
  "/pipeline": "Pipeline",
  "/prep": "Interview Prep",
  "/settings": "Settings",
  "/profile": "Profile",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title =
    Object.entries(PAGE_TITLES).find(([key]) =>
      key === "/" ? pathname === "/" : pathname.startsWith(key)
    )?.[1] ?? "JobHunt AI";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg-page)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar — hidden on mobile via inline style + responsive overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 39,
          display: sidebarOpen ? "block" : "none",
        }}
        onClick={() => setSidebarOpen(false)}
      />
      <div
        style={{
          transform: sidebarOpen ? "translateX(0)" : undefined,
        }}
        className="sidebar-wrapper"
      >
        <Sidebar />
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          marginLeft: "var(--sidebar-width)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-page)",
        }}
        className="main-content"
      >
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-wrapper {
            position: fixed !important;
            left: 0;
            top: 0;
            z-index: 40;
            transform: translateX(-100%);
            transition: transform 150ms ease;
          }
          .sidebar-wrapper.open {
            transform: translateX(0) !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
          .md-hide {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
