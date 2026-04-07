import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { geminiFlash } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const CV_SYSTEM_PROMPT = `You are a precise CV parser. Extract structured career data.
Return ONLY valid JSON with no markdown fences, no explanation.
Be conservative — only extract what is explicitly stated.`;

function buildCvPrompt(cvText: string): string {
  return `Extract from this CV:\n\n${cvText}\n\nReturn JSON matching exactly:
{
  "fullName": "string",
  "currentTitle": "string",
  "totalYearsExperience": 0,
  "skills": [
    {
      "name": "string",
      "yearsExperience": 0,
      "level": "expert | strong | familiar | learning",
      "isPrimary": false,
      "category": "frontend | backend | devops | database | mobile | ai_ml | tools | soft"
    }
  ],
  "domains": ["string"],
  "summary": "string"
}`;
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cvText = "";
  let cvUrl = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("cvText") as string | null;

    if (file) {
      // Parse PDF
      const buffer = Buffer.from(await file.arrayBuffer());

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const parsed = await pdfParse(buffer);
        cvText = parsed.text?.trim() ?? "";
      } catch (pdfErr) {
        console.error("[cv/upload] PDF parse error:", pdfErr);
        return NextResponse.json(
          { error: "Could not extract text from PDF" },
          { status: 400 }
        );
      }

      if (!cvText) {
        return NextResponse.json(
          { error: "PDF appears to be empty or image-only" },
          { status: 400 }
        );
      }

      // Upload to Supabase Storage
      const storagePath = `${user.id}/cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!uploadError) {
        cvUrl = storagePath;
      }
    } else if (rawText && rawText.trim()) {
      cvText = rawText.trim();
    } else {
      return NextResponse.json(
        { error: "No file or text provided" },
        { status: 400 }
      );
    }

    // Truncate cv_text to avoid token limits (keep first 8000 chars)
    const truncatedText = cvText.slice(0, 8000);

    // Update profile with cv_text
    await supabase
      .from("profiles")
      .update({ cv_text: cvText, cv_url: cvUrl })
      .eq("id", user.id);

    // Call Gemini for extraction
    let extracted: {
      fullName: string;
      currentTitle: string;
      totalYearsExperience: number;
      skills: {
        name: string;
        yearsExperience: number;
        level: "expert" | "strong" | "familiar" | "learning";
        isPrimary: boolean;
        category: string;
      }[];
      domains: string[];
      summary: string;
    };

    try {
      const { text } = await generateText({
        model: geminiFlash,
        system: CV_SYSTEM_PROMPT,
        prompt: buildCvPrompt(truncatedText),
      });

      // Strip any accidental markdown fences
      const clean = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

      extracted = JSON.parse(clean);
    } catch (aiErr) {
      console.error("[cv/upload] Gemini error:", aiErr);
      return NextResponse.json(
        { error: "AI extraction failed" },
        { status: 500 }
      );
    }

    // Validate skills array
    const skills = (extracted.skills ?? []).filter(
      (s) => s.name && typeof s.name === "string"
    );

    // Delete existing cv_extracted skills and reinsert (handles re-upload)
    await supabase
      .from("skills")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "cv_extracted");

    if (skills.length > 0) {
      const rows = skills.map((s) => ({
        user_id: user.id,
        name: s.name.trim(),
        years_experience: s.yearsExperience ?? 0,
        level: s.level ?? "familiar",
        category: s.category ?? "tools",
        is_primary: s.isPrimary ?? false,
        is_hidden: false,
        source: "cv_extracted",
      }));

      await supabase.from("skills").insert(rows);
    }

    return NextResponse.json({
      fullName: extracted.fullName ?? "",
      currentTitle: extracted.currentTitle ?? "",
      totalYearsExperience: extracted.totalYearsExperience ?? 0,
      skills,
      domains: extracted.domains ?? [],
      summary: extracted.summary ?? "",
      cvUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
