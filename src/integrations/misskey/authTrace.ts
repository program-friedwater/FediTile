const TRACE_KEY = "feditile:misskey-auth-trace";

export type TraceEntry = {
  at: number;
  step: string;
  detail?: string;
};

export function pushAuthTrace(step: string, detail?: string) {
  try {
    const current = readAuthTrace();
    const next = [{ at: Date.now(), step, detail }, ...current].slice(0, 24);
    localStorage.setItem(TRACE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function readAuthTrace(): TraceEntry[] {
  try {
    const raw = localStorage.getItem(TRACE_KEY);
    return raw ? (JSON.parse(raw) as TraceEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearAuthTrace() {
  try {
    localStorage.removeItem(TRACE_KEY);
  } catch {
    // ignore
  }
}
