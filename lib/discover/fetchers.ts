import { stripHtml } from '@/lib/utils/html';

const FETCH_TIMEOUT_MS = 8000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export type RawJob = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'onsite' | null;
  jdText: string;
  jdUrl: string;
  source: string;
  salaryMin: number | null;
  salaryMax: number | null;
};

// Default companies on Greenhouse / Lever known to hire remotely or in India
export const DEFAULT_GREENHOUSE: string[] = [
  'browserstack', 'postman', 'freshworks', 'chargebee', 'stripe',
  'figma', 'notion', 'shopify', 'coinbase', 'twilio', 'datadog',
  'zendesk', 'airbnb', 'cloudflare', 'hashicorp', 'elastic',
  'grafanalabs', 'mongodb', 'vercel', 'linear', 'loom',
  'clevertap', 'moengage', 'gojek',
];

export const DEFAULT_LEVER: string[] = [
  'remote', 'gitlab', 'automattic', 'doist', 'hotjar',
  'maze', 'raycast', 'coda', 'pitch', 'whereby',
];

export function queryTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
}

export function matchesAnyToken(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

const REMOTE_KEYWORDS = ['remote', 'wfh', 'work from home', 'anywhere', 'distributed'];


export function isRemoteFilter(location: string): boolean {
  const l = location.toLowerCase().trim();
  return REMOTE_KEYWORDS.some((k) => l === k);
}

/**
 * Returns true if the job matches any of the location filters.
 * - No filters → always match
 * - "remote" in filters → remote/hybrid jobs match
 * - City in filters → job location must contain that city name
 * Multiple filters are OR'd: a job passes if it matches any one filter.
 */
export function locationMatchesFilter(
  jobLocation: string,
  jobRemoteType: 'remote' | 'hybrid' | 'onsite' | null,
  filterLocations: string[],
): boolean {
  if (filterLocations.length === 0) return true;

  const jobLoc = jobLocation.toLowerCase();
  const isJobRemote = jobRemoteType === 'remote' || jobRemoteType === 'hybrid'
    || jobLoc.includes('remote') || jobLoc.includes('anywhere');

  return filterLocations.some((filterLocation) => {
    const filter = filterLocation.toLowerCase().trim();
    if (!filter) return false;
    if (isRemoteFilter(filter)) return isJobRemote;
    return jobLoc.includes(filter);
  });
}

// --- RemoteOK (free, no key) ---
export async function fetchRemoteOK(tokens: string[], daysBack?: number): Promise<RawJob[]> {
  try {
    const tags = tokens.slice(0, 4).join(',');
    const url = `https://remoteok.com/api${tags ? `?tags=${encodeURIComponent(tags)}` : ''}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
    const items = (Array.isArray(json) ? json.slice(1) : []) as Record<string, unknown>[];
    return items
      .filter((j) => {
        if (!cutoff) return true;
        const epoch = (j.epoch as number) * 1000;
        return epoch ? epoch >= cutoff : true;
      })
      .filter((j) => matchesAnyToken(`${j.title ?? ''} ${j.description ?? ''}`, tokens))
      .slice(0, 20)
      .map((j) => ({
        externalId: `remoteok-${j.id}`,
        title: String(j.position ?? j.title ?? ''),
        company: String(j.company ?? ''),
        location: String(j.location ?? 'Remote'),
        remoteType: 'remote' as const,
        jdText: stripHtml(String(j.description ?? '')),
        jdUrl: String(j.url ?? ''),
        source: 'remoteok',
        salaryMin: null,
        salaryMax: null,
      }));
  } catch {
    return [];
  }
}

// --- Remotive (free, no key) ---
export async function fetchRemotive(query: string, tokens: string[], daysBack?: number): Promise<RawJob[]> {
  try {
    const params = new URLSearchParams({ search: query, limit: '20' });
    const res = await fetchWithTimeout(`https://remotive.com/api/remote-jobs?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
    const items = (json.jobs ?? []) as Record<string, unknown>[];
    return items
      .filter((j) => {
        if (!cutoff) return true;
        const pub = j.publication_date as string;
        return pub ? new Date(pub).getTime() >= cutoff : true;
      })
      .filter((j) => matchesAnyToken(`${j.title ?? ''} ${j.description ?? ''}`, tokens))
      .slice(0, 20)
      .map((j) => ({
        externalId: `remotive-${j.id}`,
        title: String(j.title ?? ''),
        company: String(j.company_name ?? ''),
        location: String(j.candidate_required_location ?? 'Remote'),
        remoteType: 'remote' as const,
        jdText: stripHtml(String(j.description ?? '')),
        jdUrl: String(j.url ?? ''),
        source: 'remotive',
        salaryMin: null,
        salaryMax: null,
      }));
  } catch {
    return [];
  }
}

// --- Adzuna (needs API keys) ---
export async function fetchAdzuna(
  query: string, location: string, country: string, daysBack?: number
): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  try {
    const params = new URLSearchParams({
      app_id: appId, app_key: appKey,
      results_per_page: '20',
      what_or: query,
      ...(location ? { where: location } : {}),
      ...(daysBack ? { max_days_old: String(daysBack) } : {}),
    });
    const res = await fetchWithTimeout(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.results ?? []).map((r: Record<string, unknown>) => {
      const desc = String((r.description as string) ?? '');
      const remoteMatch = desc.toLowerCase().match(/\b(remote|hybrid)\b/);
      const remoteType = remoteMatch ? (remoteMatch[1] as 'remote' | 'hybrid') : 'onsite';
      return {
        externalId: `adzuna-${r.id}`,
        title: String((r.title as string) ?? ''),
        company: String(((r.company as Record<string, unknown>)?.display_name as string) ?? ''),
        location: String(((r.location as Record<string, unknown>)?.display_name as string) ?? ''),
        remoteType,
        jdText: desc,
        jdUrl: String((r.redirect_url as string) ?? ''),
        source: 'adzuna',
        salaryMin: (r.salary_min as number) ?? null,
        salaryMax: (r.salary_max as number) ?? null,
      };
    });
  } catch {
    return [];
  }
}

// --- Greenhouse ---
export async function fetchGreenhouse(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
  try {
    const res = await fetchWithTimeout(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((json.jobs ?? []) as Record<string, unknown>[])
      .filter((j) => {
        if (!cutoff) return true;
        const updated = (j.updated_at as string) ?? (j.first_published as string);
        return updated ? new Date(updated).getTime() >= cutoff : true;
      })
      .map((j) => {
        const loc = ((j.location as Record<string, unknown>)?.name as string) ?? '';
        const remoteType = loc.toLowerCase().includes('remote') ? ('remote' as const) : null;
        return {
          externalId: `greenhouse-${j.id}`,
          title: String((j.title as string) ?? ''),
          company,
          location: loc,
          remoteType,
          jdText: stripHtml(String((j.content as string) ?? '')),
          jdUrl: String((j.absolute_url as string) ?? ''),
          source: 'greenhouse',
          salaryMin: null,
          salaryMax: null,
        };
      });
    return jobs
      .filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// --- Ashby ---
export const DEFAULT_ASHBY: string[] = [
  'linear', 'vercel', 'raycast', 'retool', 'cal', 'resend',
  'mercury', 'ramp', 'brex', 'deel', 'rippling', 'loom',
  'descript', 'replit', 'row', 'gather', 'codeium', 'trunk',
];

export async function fetchAshby(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
  const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
  try {
    const res = await fetchWithTimeout(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((json.jobPostings ?? []) as Record<string, unknown>[])
      .filter((j) => {
        if (!cutoff) return true;
        const pub = j.publishedDate as string;
        return pub ? new Date(pub).getTime() >= cutoff : true;
      })
      .map((j) => {
        const loc = String((j.locationName as string) ?? '');
        const isRemote = Boolean(j.isRemote);
        const remoteType: 'remote' | 'hybrid' | 'onsite' | null = isRemote ? 'remote' : loc.toLowerCase().includes('remote') ? 'remote' : null;
        return {
          externalId: `ashby-${j.id}`,
          title: String((j.title as string) ?? ''),
          company,
          location: loc || (isRemote ? 'Remote' : ''),
          remoteType,
          jdText: stripHtml(String((j.descriptionHtml as string) ?? '')),
          jdUrl: String((j.applyLink as string) ?? ''),
          source: 'ashby',
          salaryMin: null,
          salaryMax: null,
        };
      });
    return jobs
      .filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// --- Workable ---
export const DEFAULT_WORKABLE: string[] = [
  'spotify', 'skroutz', 'taxfix', 'beat', 'blueground',
  'ovotech', 'synergetica', 'epignosis', 'workato',
];

export async function fetchWorkable(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
  try {
    const res = await fetchWithTimeout(
      `https://apply.workable.com/api/v3/accounts/${slug}/jobs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: tokens.join(' '), location: [], department: [], workplace: [], employment_type: [], limit: 20, offset: 0 }),
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((json.results ?? []) as Record<string, unknown>[])
      .filter((j) => {
        if (!cutoff) return true;
        const created = j.created_at as string;
        return created ? new Date(created).getTime() >= cutoff : true;
      })
      .map((j) => {
        const locObj = (j.location as Record<string, unknown>) ?? {};
        const loc = [locObj.city, locObj.country].filter(Boolean).join(', ');
        const isRemote = Boolean(locObj.telecommuting);
        const remoteType: 'remote' | 'hybrid' | 'onsite' | null = isRemote ? 'remote' : null;
        return {
          externalId: `workable-${j.id}`,
          title: String((j.title as string) ?? ''),
          company,
          location: loc || (isRemote ? 'Remote' : ''),
          remoteType,
          jdText: '',
          jdUrl: String((j.url as string) ?? ''),
          source: 'workable',
          salaryMin: null,
          salaryMax: null,
        };
      });
    return jobs
      .filter((j) => matchesAnyToken(j.title, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// --- SmartRecruiters ---
export const DEFAULT_SMARTRECRUITERS: string[] = [
  'atlassian', 'bosch', 'lidl', 'ikea', 'klarna',
  'aldi', 'delivery-hero', 'zalando', 'n26',
];

export async function fetchSmartRecruiters(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
  const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
  try {
    const params = new URLSearchParams({ q: tokens.join(' '), limit: '20' });
    const res = await fetchWithTimeout(
      `https://api.smartrecruiters.com/v1/companies/${slug}/postings?${params}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((json.content ?? []) as Record<string, unknown>[])
      .filter((j) => {
        if (!cutoff) return true;
        const released = j.releasedDate as string;
        return released ? new Date(released).getTime() >= cutoff : true;
      })
      .map((j) => {
        const locObj = (j.location as Record<string, unknown>) ?? {};
        const loc = [locObj.city, locObj.country].filter(Boolean).join(', ');
        const isRemote = Boolean(locObj.remote);
        const remoteType: 'remote' | 'hybrid' | 'onsite' | null = isRemote ? 'remote' : null;
        return {
          externalId: `smartrecruiters-${j.id}`,
          title: String((j.name as string) ?? ''),
          company,
          location: loc || (isRemote ? 'Remote' : ''),
          remoteType,
          jdText: '',
          jdUrl: String((j.ref as string) ?? ''),
          source: 'smartrecruiters',
          salaryMin: null,
          salaryMax: null,
        };
      });
    return jobs
      .filter((j) => matchesAnyToken(j.title, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// --- BambooHR ---
export const DEFAULT_BAMBOOHR: string[] = [
  'razorpay', 'chargebee', 'freshworks', 'zoho', 'browserstack',
  'postman', 'wingify', 'healthkart', 'testbook', 'unacademy',
];

export async function fetchBambooHR(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  try {
    const res = await fetchWithTimeout(
      `https://${slug}.bamboohr.com/jobs/feed.php?format=json`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const items = (Array.isArray(json) ? json : []) as Record<string, unknown>[];
    const jobs = items.map((j) => {
      const locObj = (j.location as Record<string, unknown>) ?? {};
      const loc = [locObj.city, locObj.state, locObj.country].filter(Boolean).join(', ');
      const isRemote = Boolean(locObj.isRemote);
      const remoteType: 'remote' | 'hybrid' | 'onsite' | null = isRemote ? 'remote' : null;
      return {
        externalId: `bamboohr-${j.id}`,
        title: String((j.title as string) ?? ''),
        company,
        location: loc || (isRemote ? 'Remote' : ''),
        remoteType,
        jdText: stripHtml(String((j.description as string) ?? '')),
        jdUrl: String((j.url as string) ?? ''),
        source: 'bamboohr',
        salaryMin: null,
        salaryMax: null,
      };
    });
    return jobs
      .filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// --- Recruitee ---
export const DEFAULT_RECRUITEE: string[] = [
  'whereby', 'pitch', 'hotjar', 'maze', 'stonly',
  'piwik', 'usercentrics', 'toggl', 'pipedrive',
];

export async function fetchRecruitee(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
  const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
  try {
    const res = await fetchWithTimeout(
      `https://${slug}.recruitee.com/api/offers/`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((json.offers ?? []) as Record<string, unknown>[])
      .filter((j) => {
        if (!cutoff) return true;
        const created = j.created_at as string;
        return created ? new Date(created).getTime() >= cutoff : true;
      })
      .map((j) => {
        const city = String((j.city as string) ?? '');
        const country = String((j.country_code as string) ?? '');
        const loc = [city, country].filter(Boolean).join(', ');
        const isRemote = Boolean(j.remote);
        const remoteType: 'remote' | 'hybrid' | 'onsite' | null = isRemote ? 'remote' : null;
        return {
          externalId: `recruitee-${j.id}`,
          title: String((j.title as string) ?? ''),
          company,
          location: loc || (isRemote ? 'Remote' : ''),
          remoteType,
          jdText: stripHtml(String((j.description as string) ?? '')),
          jdUrl: String((j.careers_url as string) ?? ''),
          source: 'recruitee',
          salaryMin: null,
          salaryMax: null,
        };
      });
    return jobs
      .filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// --- Lever ---
export async function fetchLever(company: string, tokens: string[], daysBack?: number, locations: string[] = []): Promise<RawJob[]> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const cutoff = daysBack ? Date.now() - daysBack * 86400_000 : null;
  try {
    const res = await fetchWithTimeout(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const jobs = ((Array.isArray(json) ? json : []) as Record<string, unknown>[])
      .filter((j) => {
        if (!cutoff) return true;
        const createdAt = j.createdAt as number;
        return createdAt ? createdAt >= cutoff : true;
      })
      .map((j) => {
        const lists = ((j.lists as Record<string, unknown>[]) ?? [])
          .map((l) => `${l.text}\n${l.content}`).join('\n');
        const additional = stripHtml(String((j.additional as string) ?? ''));
        const locStr = String(((j.categories as Record<string, unknown>)?.location as string) ?? '');
        const remoteType = locStr.toLowerCase().includes('remote') ? ('remote' as const) : null;
        return {
          externalId: `lever-${j.id}`,
          title: String((j.text as string) ?? ''),
          company,
          location: locStr,
          remoteType,
          jdText: stripHtml(`${j.text}\n${lists}\n${additional}`),
          jdUrl: String((j.hostedUrl as string) ?? ''),
          source: 'lever',
          salaryMin: null,
          salaryMax: null,
        };
      });
    return jobs
      .filter((j) => matchesAnyToken(`${j.title} ${j.jdText}`, tokens))
      .filter((j) => locationMatchesFilter(j.location, j.remoteType, locations))
      .slice(0, 10);
  } catch {
    return [];
  }
}
