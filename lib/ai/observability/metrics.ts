/** Lightweight process-local counters for development; use external metrics in multi-instance production. */
const counters = new Map<string, number>();
export function incrementMetric(name: string, amount = 1) { counters.set(name, (counters.get(name) ?? 0) + amount); }
export function readMetrics() { return Object.fromEntries(counters.entries()); }
