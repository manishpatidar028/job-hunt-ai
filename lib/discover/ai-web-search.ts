/**
 * AI-Powered Web Search Fetcher
 *
 * Pipeline:
 *   User skills/criteria
 *     → Tavily Search API  (finds real job posting URLs — free: 1000 calls/month)
 *     → Jina Reader        (converts each page to clean markdown — free, unlimited)
 *     → Groq Llama 3.3    (extracts + validates structured job data — already integrated)
 *     → RawJob[]           (fed into normal rule-score pipeline)
 *
 * Cost: 100% free within limits
 *   Tavily Search : 1 000 calls / month free — https://app.tavily.com (no credit card)
 *   Jina Reader   : unlimited, rate-limited (~20 rpm) — https://jina.ai (no key needed)
 *   Groq          : already integrated, generous free limits
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { llm } from '@/lib/ai/groq';
import type { RawJob } from '@/lib/discover/fetchers';

// ─── Constants ────────────────────────────────────────────────────────────────

const TAVILY_API = 'https://api.tavily.com/search';
const JINA_BASE  = 'https://r.jina.ai/';

/** Max individual job pages to fetch and process per search call (cost guard) */
const MAX_PAGES = 6;

/** Timeout for each individual HTTP call (ms) */
const TIMEOUT_MS = 6_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIWebSearchParams {
  /** All active skill names (ordered best-first) */
  skills: string[];
  /** Primary / must-have skill names */
  primarySkills: string[];
  /** Location filters from the search UI (e.g. ["remote", "Bangalore"]) */
  locations: string[];
  minYears?: number;
  maxYears?: number;
  daysBack?: number;
}

// ─── Groq extraction schema ───────────────────────────────────────────────────

const extractionSchema = z.object({
  isJobPosting:    z.boolean(),
  matchesCriteria: z.boolean(),
  title:           z.string().default(''),
  company:         z.string().default(''),
  location:        z.string().default(''),
  remoteType:      z.enum(['remote', 'hybrid', 'onsite']).nullable().default(null),
  jdText:          z.string().default(''),
  salaryMin:       z.number().nullable().default(null),
  salaryMax:       z.number().nullable().default(null),
  rejectReason:    z.string().optional(),
});

type Extraction = z.infer<typeof extractionSchema>;

const REJECTED: Extraction = {
  isJobPosting: false, matchesCriteria: false,
  title: '', company: '', location: '',
  remoteType: null, jdText: '',
  salaryMin: null, salaryMax: null,
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// ─── Step 1: Tavily Search ────────────────────────────────────────────────────

type SearchResult = { url: string; title: string; snippet: string };

async function tavilySearch(query: string, maxResults: number): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetchWithTimeout(TAVILY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:      key,
        query,
        search_depth: 'basic',   // 'basic' uses 1 credit vs 'advanced' uses 2
        max_results:  maxResults,
        // Exclude noisy aggregator sites that block crawlers anyway
        exclude_domains: [
          'linkedin.com', 'indeed.com', 'glassdoor.com',
          'naukri.com', 'monster.com', 'ziprecruiter.com',
          'reddit.com', 'twitter.com', 'quora.com',
          'medium.com', 'dev.to',
        ],
      }),
    });

    if (!res.ok) return [];
    const json = await res.json();

    return ((json.results ?? []) as Record<string, unknown>[]).map((r) => ({
      url:     String(r.url     ?? ''),
      title:   String(r.title   ?? ''),
      snippet: String(r.content ?? r.snippet ?? ''),
    }));
  } catch {
    return [];
  }
}

// ─── Step 2: Jina Reader ──────────────────────────────────────────────────────

async function fetchViaJina(url: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(`${JINA_BASE}${encodeURIComponent(url)}`, {
      headers: {
        Accept:            'text/plain',
        'X-Return-Format': 'markdown',
        'X-Timeout':       '8',
        // Ask Jina to strip nav/footer boilerplate for a cleaner JD
        'X-Remove-Selector': 'nav, footer, header, .cookie-banner, .navbar, aside',
      },
    });
    if (!res.ok) return '';
    const text = await res.text();
    return text.slice(0, 10_000); // cap at 10k chars — enough for any JD
  } catch {
    return '';
  }
}

// ─── Step 3: Groq extraction + strict criteria validation ─────────────────────

function buildExtractionPrompt(
  content: string,
  pageUrl: string,
  params: AIWebSearchParams,
): string {
  const { skills, primarySkills, locations, minYears, maxYears } = params;

  const skillsLine   = skills.slice(0, 8).join(', ');
  const primaryLine  = primarySkills.slice(0, 4).join(', ');
  const cityFilters  = locations.filter((l) => !REMOTE_KEYWORDS.has(l.toLowerCase()));
  const locationLine = cityFilters.length > 0
    ? `${cityFilters.join(' OR ')} (onsite or hybrid in that city only — do NOT accept pure remote jobs)`
    : locations.length > 0
      ? locations.join(' OR ')
      : 'remote (preferred) or any location';
  const yearsLine    = minYears !== undefined
    ? `${minYears} to ${maxYears ?? minYears + 6} years of experience`
    : 'any experience level';

  return `You are a precise job data extractor with strict relevance filtering.

===== CANDIDATE CRITERIA =====
Primary skills (must appear explicitly in the job requirements): ${primaryLine}
All skills: ${skillsLine}
Target location: ${locationLine}
Experience level: ${yearsLine}

===== SOURCE URL =====
${pageUrl}

===== PAGE CONTENT =====
${content}

===== YOUR TASK =====
Step 1 — Is this a SINGLE job posting?
  YES if: the page describes one specific open role with responsibilities and requirements.
  NO if: it is a jobs listing page, company homepage, blog post, news article, or search results page.

Step 2 — If YES, validate ALL of the following (reject if ANY fails):
  a) PRIMARY SKILL CHECK: At least one primary skill must appear explicitly in the
     job title or requirements/qualifications section.
     Partial/tangential mentions (e.g. "nice to have", "familiarity") do NOT count.
  b) LOCATION CHECK: The job's location must match the target location.
     "remote" / "work from home" / "distributed" counts as remote.
     If target is a city, that city or its metro area must be stated.
  c) EXPERIENCE CHECK: Required years stated in the JD must be within ±3 years
     of the candidate's range. If the JD states no specific years, treat as matching.

Step 3 — If all validations pass, extract the job details.
  - jdText: full responsibilities + requirements section, plain text, no markdown, max 3000 chars.
  - Extract salary only if explicitly stated as a number; otherwise null.

===== OUTPUT FORMAT =====
Return ONLY this exact JSON, nothing else — no markdown fences, no explanation:
{
  "isJobPosting": true,
  "matchesCriteria": true,
  "title": "Senior Frontend Engineer",
  "company": "Acme Corp",
  "location": "Remote, India",
  "remoteType": "remote",
  "jdText": "We are looking for a Senior Frontend Engineer...",
  "salaryMin": null,
  "salaryMax": null,
  "rejectReason": null
}

Rules:
- remoteType must be exactly: "remote" | "hybrid" | "onsite" | null
- If isJobPosting=false OR matchesCriteria=false → set title/company/jdText to ""
- rejectReason: one-line explanation when matchesCriteria=false
  Examples: "No primary skill found in requirements", "Location is onsite US only", "Requires 10+ years, candidate has 3"
- salaryMin/salaryMax: numbers as-is (USD or INR), or null`;
}

async function extractJob(
  content: string,
  pageUrl: string,
  params: AIWebSearchParams,
): Promise<Extraction> {
  if (!content.trim()) return REJECTED;

  try {
    const { text } = await generateText({
      model: llm,
      system: 'You are a precise structured data extractor. Return ONLY valid JSON — no markdown fences, no prose.',
      prompt: buildExtractionPrompt(content, pageUrl, params),
    });

    const clean = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    return extractionSchema.parse(JSON.parse(clean));
  } catch {
    return REJECTED;
  }
}

// ─── URL pre-filter (skip obvious non-postings before Jina/Groq) ──────────────

const JOB_POSTING_URL_PATTERNS = [
  /\/job\/[a-z0-9-]+/i,
  /\/jobs\/[a-z0-9-]{4,}/i,
  /\/careers\/[a-z0-9-]{4,}/i,
  /\/posting\/[a-z0-9-]+/i,
  /\/position\/[a-z0-9-]+/i,
  /\/opening\/[a-z0-9-]+/i,
  /\/apply\/[a-z0-9-]+/i,
  /\/role\/[a-z0-9-]+/i,
  /[?&]jid=/i,
  /[?&]jobid=/i,
  // Known ATS patterns
  /lever\.co\/[^/]+\/[a-z0-9-]{8,}/i,
  /greenhouse\.io\/[^/]+\/jobs\/\d+/i,
  /ashbyhq\.com\/.+\/[a-z0-9-]{8,}/i,
  /workday\.com.+\/job\//i,
  /smartrecruiters\.com\/.+\/[a-z0-9-]{8,}/i,
];

const SNIPPET_JOB_SIGNALS = [
  'apply now', 'job description', 'responsibilities:', 'requirements:',
  'qualifications:', 'we are hiring', 'we are looking for', 'join our team',
  'full-time', 'years of experience', 'what you will do', 'who you are',
];

function isLikelyJobPosting(url: string, snippet: string): boolean {
  try {
    // URL pattern match
    if (JOB_POSTING_URL_PATTERNS.some((re) => re.test(url))) return true;

    // Snippet signal match
    const text = snippet.toLowerCase();
    return SNIPPET_JOB_SIGNALS.some((s) => text.includes(s));
  } catch {
    return false;
  }
}

// ─── Search query builder ─────────────────────────────────────────────────────

const REMOTE_KEYWORDS = new Set(['remote', 'wfh', 'work from home', 'anywhere', 'distributed']);

function buildQueries(params: AIWebSearchParams): string[] {
  const { skills, primarySkills, locations } = params;

  const topPrimary = primarySkills.slice(0, 2).join(' ');
  const topSkills  = skills.slice(0, 4).join(' ');

  const cityFilters  = locations.filter((l) => !REMOTE_KEYWORDS.has(l.toLowerCase()));
  const wantsRemote  = locations.length === 0 || cityFilters.length < locations.length;
  const city         = cityFilters[0] ?? '';

  const queries: string[] = [];

  if (city) {
    // City-specific queries — NO site: restriction, cast wide net across all companies
    queries.push(`${topPrimary} software engineer jobs ${city} India 2025 apply`);
    queries.push(`${topSkills} developer hiring ${city} career opening full-time`);
    queries.push(`${topPrimary} developer "${city}" job opening apply`);
  }

  if (wantsRemote && !city) {
    // Pure remote search — use ATS site: operators (they have rich remote listings)
    queries.push(`${topPrimary} developer job opening remote apply now 2025`);
    queries.push(
      `${topSkills} software engineer remote site:jobs.lever.co OR site:boards.greenhouse.io OR site:ashbyhq.com`,
    );
  }

  if (queries.length === 0) {
    // Fallback: no location specified
    queries.push(`${topPrimary} software engineer job opening apply now`);
    queries.push(`${topSkills} developer hiring career 2025`);
  }

  return queries;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchAIWebSearch(params: AIWebSearchParams): Promise<RawJob[]> {
  if (!process.env.TAVILY_API_KEY) return [];
  if (params.skills.length === 0)  return [];

  const queries = buildQueries(params);

  // ── 1. Tavily Search: run all queries in parallel ──
  const searchResults = await Promise.allSettled(
    queries.map((q) => tavilySearch(q, 6)),
  );

  const allResults = searchResults
    .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  // ── 2. Deduplicate + pre-filter to likely job posting pages ──
  const seenUrls = new Set<string>();
  const candidates = allResults
    .filter((r) => {
      if (!r.url || seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return isLikelyJobPosting(r.url, r.snippet);
    })
    .slice(0, MAX_PAGES);

  if (candidates.length === 0) return [];

  // ── 3. Jina fetch: all pages in parallel ──
  const contents = await Promise.allSettled(
    candidates.map((c) => fetchViaJina(c.url)),
  );

  // ── 4. Groq extraction: all in parallel ──
  const extractions = await Promise.allSettled(
    candidates.map((c, i) => {
      const content = contents[i].status === 'fulfilled'
        ? (contents[i] as PromiseFulfilledResult<string>).value
        : '';
      return extractJob(content, c.url, params);
    }),
  );

  // ── 5. Build RawJob[] from accepted extractions ──
  const jobs: RawJob[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const ex = extractions[i];
    if (ex.status !== 'fulfilled') continue;

    const e = ex.value;
    if (!e.isJobPosting || !e.matchesCriteria) continue;
    if (!e.title || !e.company) continue;

    // Stable externalId derived from URL — prevents duplicates across re-runs
    const idSeed = candidates[i].url.replace(/[^a-z0-9]/gi, '').slice(-20);

    jobs.push({
      externalId: `aiweb-${idSeed}`,
      title:      e.title,
      company:    e.company,
      location:   e.location || (e.remoteType === 'remote' ? 'Remote' : ''),
      remoteType: e.remoteType,
      jdText:     e.jdText,
      jdUrl:      candidates[i].url,
      source:     'ai_web_search',
      salaryMin:  e.salaryMin,
      salaryMax:  e.salaryMax,
    });
  }

  return jobs;
}
