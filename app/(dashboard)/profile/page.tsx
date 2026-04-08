"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ExtractedSkill {
  name: string;
  yearsExperience: number;
  level: "expert" | "strong" | "familiar" | "learning";
  isPrimary: boolean;
  category: string;
}

interface ExtractedData {
  fullName: string;
  currentTitle: string;
  totalYearsExperience: number;
  skills: ExtractedSkill[];
  domains: string[];
  summary: string;
  cvUrl: string;
}

const LEVEL_STYLES: Record<
  string,
  { bg: string; color: string }
> = {
  expert:   { bg: "var(--success-bg)",  color: "var(--success)"  },
  strong:   { bg: "var(--info-bg)",     color: "var(--info)"     },
  familiar: { bg: "var(--warning-bg)",  color: "var(--warning)"  },
  learning: { bg: "var(--bg-muted)",    color: "var(--text-muted)" },
};

const ROLE_SUGGESTIONS = [
  "Senior Frontend Engineer",
  "Tech Lead",
  "Staff Engineer",
  "Frontend Architect",
];

const LOCATIONS = [
  "Ahmedabad (onsite)",
  "India Remote",
  "Global Remote",
];

// ─── Sub-components ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em" }}
        >
          Step {step} of 3 —{" "}
          {step === 1 ? "Upload your CV" : step === 2 ? "Review extracted info" : "Preferences"}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {Math.round((step / 3) * 100)}%
        </span>
      </div>
      <div
        style={{
          height: "4px",
          background: "var(--border-strong)",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(step / 3) * 100}%`,
            background: "var(--accent)",
            borderRadius: "99px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  inputValue,
  onInputChange,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder: string;
  inputValue: string;
  onInputChange: (v: string) => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      onAdd(inputValue.trim().replace(/,$/, ""));
      onInputChange("");
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        padding: "8px",
        border: "1px solid var(--border-input)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-input)",
        minHeight: "40px",
        alignItems: "center",
        cursor: "text",
      }}
      onClick={(e) => {
        const input = (e.currentTarget as HTMLElement).querySelector("input");
        input?.focus();
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            background: "var(--accent-subtle)",
            color: "var(--accent)",
            borderRadius: "var(--radius-full)",
            fontSize: "11px",
            fontWeight: 500,
            border: "1px solid var(--accent-border)",
          }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--accent)",
              padding: 0,
              display: "flex",
              lineHeight: 1,
            }}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={tags.length === 0 ? placeholder : ""}
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: "12px",
          color: "var(--text-primary)",
          flex: 1,
          minWidth: "120px",
        }}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step
  const [step, setStep] = useState(1);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Step 1
  const [uploadMethod, setUploadMethod] = useState<"pdf" | "text">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Step 2
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editYears, setEditYears] = useState("");

  // Step 3
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(3.8);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [dealBreakerInput, setDealBreakerInput] = useState("");
  const [watchedCompanies, setWatchedCompanies] = useState<string[]>([]);
  const [watchedInput, setWatchedInput] = useState("");
  const [jobMarket, setJobMarket] = useState("in");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load existing profile data on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, preferences, onboarding_complete")
        .eq("id", user.id)
        .single();
      if (!data) return;
      const pref = (data.preferences ?? {}) as Record<string, unknown>;
      if (data.full_name) setEditName(data.full_name);
      if (pref.currentTitle) setEditTitle(pref.currentTitle as string);
      if (pref.totalYearsExperience) setEditYears(String(pref.totalYearsExperience));
      if (pref.targetRoles) setTargetRoles(pref.targetRoles as string[]);
      if ((pref.salary as Record<string, unknown>)?.currency) setCurrency((pref.salary as Record<string, string>).currency as "INR" | "USD");
      if ((pref.salary as Record<string, unknown>)?.min) setSalaryMin(String((pref.salary as Record<string, unknown>).min));
      if ((pref.salary as Record<string, unknown>)?.max) setSalaryMax(String((pref.salary as Record<string, unknown>).max));
      if (pref.locations) setLocations(pref.locations as string[]);
      if (pref.minScore) setMinScore(pref.minScore as number);
      if (pref.dealBreakers) setDealBreakers(pref.dealBreakers as string[]);
      if (pref.watchedCompanies) setWatchedCompanies(pref.watchedCompanies as string[]);
      if (pref.jobMarket) setJobMarket(pref.jobMarket as string);
      // Show welcome-back choice screen if they've already set up their profile
      if (data.onboarding_complete) setShowWelcomeBack(true);
      setProfileLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag & Drop ────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  }, []);

  // ── Step 1: Submit ─────────────────────────────────────────────────────

  async function handleUpload() {
    setUploadError("");
    setUploading(true);

    try {
      const fd = new FormData();
      if (uploadMethod === "pdf" && file) {
        fd.append("file", file);
      } else if (uploadMethod === "text" && cvText.trim()) {
        fd.append("cvText", cvText.trim());
      } else {
        setUploadError("Please provide a PDF or paste your CV text.");
        return;
      }

      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }

      setExtracted(data);
      setEditName(data.fullName ?? "");
      setEditTitle(data.currentTitle ?? "");
      setEditYears(String(data.totalYearsExperience ?? ""));
      setStep(2);
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Step 3: Save ───────────────────────────────────────────────────────

  async function handleSave() {
    setSaveError("");
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName || extracted?.fullName,
          onboarding_complete: true,
          preferences: {
            currentTitle: editTitle,
            totalYearsExperience: parseFloat(editYears) || 0,
            targetRoles,
            salary: {
              currency,
              min: salaryMin ? parseFloat(salaryMin) : null,
              max: salaryMax ? parseFloat(salaryMax) : null,
            },
            locations,
            minScore,
            dealBreakers,
            watchedCompanies,
            jobMarket,
          },
        })
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (profileLoading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 48px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* Progress bar skeleton */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ width: "140px", height: "12px", borderRadius: "var(--radius-sm)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "32px", height: "12px", borderRadius: "var(--radius-sm)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
          <div style={{ height: "4px", borderRadius: "99px", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
        {/* Card skeleton */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "36px 28px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ width: "160px", height: "20px", borderRadius: "var(--radius-sm)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "100%", height: "14px", borderRadius: "var(--radius-sm)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "80%", height: "14px", borderRadius: "var(--radius-sm)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            <div style={{ width: "100%", height: "52px", borderRadius: "var(--radius-lg)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "100%", height: "52px", borderRadius: "var(--radius-lg)", background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "8px 0 48px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <ProgressBar step={step} />

        {/* ── WELCOME BACK ── */}
        {showWelcomeBack && (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 28px",
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                Welcome back 👋
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Your profile is already set up. What would you like to do?
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Option 1 — Edit preferences */}
              <button
                onClick={() => { setShowWelcomeBack(false); setStep(3); }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--accent-subtle)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; }}
              >
                <div style={{ fontSize: "22px", lineHeight: 1 }}>⚙️</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                    Update my preferences
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Edit target roles, salary, locations and job filters.
                  </div>
                </div>
              </button>

              {/* Option 2 — Re-upload CV */}
              <button
                onClick={() => { setShowWelcomeBack(false); setStep(1); }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-subtle)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; }}
              >
                <div style={{ fontSize: "22px", lineHeight: 1 }}>📄</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                    Start from scratch
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Re-upload your CV and let AI re-extract everything fresh.
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            padding: "28px",
            boxShadow: "var(--shadow-card)",
            display: showWelcomeBack ? "none" : undefined,
          }}
        >
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Upload your CV
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  We&apos;ll extract your skills and experience automatically.
                </p>
              </div>

              {uploadMethod === "pdf" ? (
                <>
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragging ? "var(--accent)" : "var(--accent-border)"}`,
                      borderRadius: "var(--radius-lg)",
                      background: dragging ? "var(--accent-subtle)" : "#F0FDF4",
                      height: "180px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        background: "var(--accent-subtle)",
                        border: "1px solid var(--accent-border)",
                        borderRadius: "var(--radius-lg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Upload size={18} color="var(--accent)" />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Drop your CV here
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      PDF up to 10MB
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />

                  {/* Selected file chip */}
                  {file && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        background: "var(--accent-subtle)",
                        border: "1px solid var(--accent-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <FileText size={14} color="var(--accent)" />
                      <span style={{ flex: 1, fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: "2px",
                          display: "flex",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setUploadMethod("text")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      textDecoration: "underline",
                      padding: 0,
                      alignSelf: "center",
                    }}
                  >
                    or paste CV text instead
                  </button>
                </>
              ) : (
                <>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Paste your full CV/resume text here..."
                    style={{
                      width: "100%",
                      height: "200px",
                      padding: "10px 12px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-input)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "var(--font)",
                      lineHeight: 1.6,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-input-focus)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-input)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setUploadMethod("pdf")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      textDecoration: "underline",
                      padding: 0,
                      alignSelf: "center",
                    }}
                  >
                    Upload PDF instead
                  </button>
                </>
              )}

              {uploadError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                    color: "var(--danger)",
                  }}
                >
                  {uploadError}
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={
                  uploading ||
                  (uploadMethod === "pdf" ? !file : !cvText.trim())
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  height: "42px",
                  background:
                    uploading ||
                    (uploadMethod === "pdf" ? !file : !cvText.trim())
                      ? "var(--text-placeholder)"
                      : "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor:
                    uploading ||
                    (uploadMethod === "pdf" ? !file : !cvText.trim())
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Extracting skills...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && extracted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  padding: 0,
                  alignSelf: "flex-start",
                }}
              >
                <ArrowLeft size={12} /> Back
              </button>

              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Review extracted info
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Confirm what we found in your CV.
                </p>
              </div>

              {/* Profile fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={fieldInputStyle}
                  onFocus={focusField}
                  onBlur={blurField}
                />

                <label style={labelStyle}>Current title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={fieldInputStyle}
                  onFocus={focusField}
                  onBlur={blurField}
                />

                <label style={labelStyle}>Years of experience</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={editYears}
                  onChange={(e) => setEditYears(e.target.value)}
                  style={{ ...fieldInputStyle, width: "100px" }}
                  onFocus={focusField}
                  onBlur={blurField}
                />
              </div>

              {/* Skills preview */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Skills extracted
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "11px",
                      fontWeight: 600,
                      border: "1px solid var(--accent-border)",
                    }}
                  >
                    {extracted.skills.length} skills
                  </span>
                </div>

                <div
                  style={{
                    maxHeight: "240px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px",
                  }}
                >
                  {extracted.skills.map((skill, i) => {
                    const ls = LEVEL_STYLES[skill.level] ?? LEVEL_STYLES.familiar;
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          borderRadius: "var(--radius-sm)",
                          background: i % 2 === 0 ? "transparent" : "var(--bg-page)",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
                          {skill.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {skill.yearsExperience > 0 && (
                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              {skill.yearsExperience}y
                            </span>
                          )}
                          <span
                            style={{
                              padding: "1px 7px",
                              borderRadius: "var(--radius-full)",
                              background: ls.bg,
                              color: ls.color,
                              fontSize: "10px",
                              fontWeight: 600,
                            }}
                          >
                            {skill.level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                  You can edit these on the Skills page
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                style={primaryBtnStyle}
              >
                Looks good, continue
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  padding: 0,
                  alignSelf: "flex-start",
                }}
              >
                <ArrowLeft size={12} /> Back
              </button>

              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Preferences
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Help us find the right jobs for you.
                </p>
              </div>

              {/* Target roles */}
              <div>
                <label style={labelStyle}>Target roles</label>
                <TagInput
                  tags={targetRoles}
                  onAdd={(t) => { if (!targetRoles.includes(t)) setTargetRoles([...targetRoles, t]); }}
                  onRemove={(t) => setTargetRoles(targetRoles.filter((r) => r !== t))}
                  placeholder="Type a role and press Enter..."
                  inputValue={roleInput}
                  onInputChange={setRoleInput}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
                  {ROLE_SUGGESTIONS.filter((r) => !targetRoles.includes(r)).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTargetRoles([...targetRoles, s])}
                        style={{
                          padding: "2px 8px",
                          background: "var(--bg-muted)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--radius-full)",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          transition: "all 0.12s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)";
                          (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                        }}
                      >
                        + {s}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Salary range */}
              <div>
                <label style={labelStyle}>Expected salary range</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                  {(["INR", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-strong)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                        background: currency === c ? "var(--accent)" : "transparent",
                        color: currency === c ? "white" : "var(--text-secondary)",
                        borderColor: currency === c ? "var(--accent)" : "var(--border-strong)",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="number"
                    placeholder={currency === "INR" ? "Min (₹)" : "Min ($)"}
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    style={{ ...fieldInputStyle, flex: 1 }}
                    onFocus={focusField}
                    onBlur={blurField}
                  />
                  <input
                    type="number"
                    placeholder={currency === "INR" ? "Max (₹)" : "Max ($)"}
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    style={{ ...fieldInputStyle, flex: 1 }}
                    onFocus={focusField}
                    onBlur={blurField}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Enter your expected range
                </p>
              </div>

              {/* Location preference */}
              <div>
                <label style={labelStyle}>Location preference</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {LOCATIONS.map((loc) => {
                    const active = locations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() =>
                          setLocations(
                            active
                              ? locations.filter((l) => l !== loc)
                              : [...locations, loc]
                          )
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
                          fontSize: "12px",
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.12s ease",
                          background: active ? "var(--accent)" : "var(--bg-card)",
                          color: active ? "white" : "var(--text-secondary)",
                        }}
                      >
                        {active && <Check size={11} style={{ marginRight: "4px", display: "inline" }} />}
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Min score slider */}
              <div>
                <label style={labelStyle}>Only show jobs scoring above</label>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <input
                    type="range"
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    value={minScore}
                    onChange={(e) => setMinScore(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      minWidth: "52px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {minScore.toFixed(1)}{" "}
                    <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>/ 5</span>
                  </span>
                </div>
              </div>

              {/* Deal-breakers */}
              <div>
                <label style={labelStyle}>Deal-breakers</label>
                <TagInput
                  tags={dealBreakers}
                  onAdd={(t) => { if (!dealBreakers.includes(t)) setDealBreakers([...dealBreakers, t]); }}
                  onRemove={(t) => setDealBreakers(dealBreakers.filter((d) => d !== t))}
                  placeholder="e.g. no pre-series A, no relocate"
                  inputValue={dealBreakerInput}
                  onInputChange={setDealBreakerInput}
                />
              </div>

              {/* Nightly discovery */}
              <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "14px" }}>
                  🌙 Nightly Job Discovery
                </p>

                <label style={labelStyle}>Job market (Adzuna region)</label>
                <select
                  value={jobMarket}
                  onChange={(e) => setJobMarket(e.target.value)}
                  style={{ ...fieldInputStyle, width: "auto", marginBottom: "14px", cursor: "pointer" }}
                >
                  <option value="in">🇮🇳 India</option>
                  <option value="gb">🇬🇧 UK</option>
                  <option value="us">🇺🇸 USA</option>
                  <option value="au">🇦🇺 Australia</option>
                  <option value="ca">🇨🇦 Canada</option>
                  <option value="sg">🇸🇬 Singapore</option>
                </select>

                <label style={labelStyle}>Watch company portals (Greenhouse + Lever)</label>
                <TagInput
                  tags={watchedCompanies}
                  onAdd={(t) => { if (!watchedCompanies.includes(t)) setWatchedCompanies([...watchedCompanies, t]); }}
                  onRemove={(t) => setWatchedCompanies(watchedCompanies.filter((c) => c !== t))}
                  placeholder="Stripe, Figma, Notion… press Enter"
                  inputValue={watchedInput}
                  onInputChange={setWatchedInput}
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>
                  The cron job runs at 1 AM UTC and saves matching roles to your dashboard.
                </p>
              </div>

              {saveError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                    color: "var(--danger)",
                  }}
                >
                  {saveError}
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...primaryBtnStyle,
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving...</>
                ) : (
                  <>Save &amp; go to dashboard <ArrowRight size={14} /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: "6px",
};

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-input)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  fontSize: "13px",
  outline: "none",
  transition: "all 0.15s ease",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  height: "42px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

function focusField(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--border-input-focus)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)";
}

function blurField(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--border-input)";
  e.currentTarget.style.boxShadow = "none";
}
