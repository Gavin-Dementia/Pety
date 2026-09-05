import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Generic named-stat persistence — deliberately generic and deliberately
 * unused by any gameplay logic yet. This is plumbing for a future growth/
 * hunger-style stats system; the actual stat keys, formulas, and decay
 * rates are an intentionally separate decision, not made here. Same
 * write-through-on-mutation persistence style as AppSettings (stats
 * change on discrete events, not continuously, so no interval timer).
 */
export class StatsTracker {
  private stats: Record<string, number> = {};
  private readonly filePath = path.join(app.getPath('userData'), 'stats.json');

  load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        this.stats = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(
            (entry): entry is [string, number] => typeof entry[1] === 'number',
          ),
        );
      }
    } catch {
      this.stats = {}; // first run, or an unreadable/corrupt file
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.stats));
    } catch {
      // best-effort; stats aren't safety-critical
    }
  }

  get(key: string): number {
    return this.stats[key] ?? 0;
  }

  set(key: string, value: number): void {
    this.stats[key] = value;
    this.save();
  }

  increment(key: string, delta: number): number {
    const next = this.get(key) + delta;
    this.set(key, next);
    return next;
  }

  getAll(): Record<string, number> {
    return { ...this.stats };
  }
}
