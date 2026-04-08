"use client";

export function GradientOrbs() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <style>{`
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.05); }
          66%       { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(-50px, 30px) scale(1.08); }
          75%       { transform: translate(30px, -20px) scale(0.95); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(25px, 40px) scale(1.04); }
        }
      `}</style>

      {/* Top-left — emerald */}
      <div style={{
        position: "absolute",
        top: "-120px",
        left: "-80px",
        width: "420px",
        height: "420px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 70%)",
        filter: "blur(40px)",
        animation: "orb-drift-1 18s ease-in-out infinite",
        willChange: "transform",
      }} />

      {/* Top-right — blue */}
      <div style={{
        position: "absolute",
        top: "-60px",
        right: "-100px",
        width: "360px",
        height: "360px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)",
        filter: "blur(50px)",
        animation: "orb-drift-2 22s ease-in-out infinite",
        willChange: "transform",
      }} />

      {/* Bottom-right — violet */}
      <div style={{
        position: "absolute",
        bottom: "-100px",
        right: "-60px",
        width: "380px",
        height: "380px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)",
        filter: "blur(45px)",
        animation: "orb-drift-3 26s ease-in-out infinite",
        willChange: "transform",
      }} />
    </div>
  );
}
