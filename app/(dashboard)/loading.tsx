export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .sk {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* Section label */}
      <div className="sk" style={{ width: 80, height: 11 }} />

      {/* Stat cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="sk" style={{ width: 80, height: 11 }} />
              <div className="sk" style={{ width: 32, height: 32, borderRadius: 8 }} />
            </div>
            <div className="sk" style={{ width: 56, height: 24 }} />
          </div>
        ))}
      </div>

      {/* Section label */}
      <div className="sk" style={{ width: 96, height: 11, marginTop: 4 }} />

      {/* Content rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 10, padding: "16px", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", display: "flex", gap: 12, alignItems: "center" }}>
            <div className="sk" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="sk" style={{ width: "50%", height: 13 }} />
              <div className="sk" style={{ width: "30%", height: 11 }} />
            </div>
            <div className="sk" style={{ width: 60, height: 24, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
