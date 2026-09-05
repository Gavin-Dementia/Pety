import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

interface PersistedProgression {
  totalPlaytimeMs: number;
}

const SAVE_INTERVAL_MS = 10_000;

/**
 * Tracks cumulative app-open runtime (not calendar time since install),
 * persisted to a small JSON file under userData. Hand-rolled rather than
 * pulling in electron-store — this is the only thing that needs
 * persisting so far, not worth a dependency for ~30 lines.
 */
export class ProgressionTracker {
  private totalPlaytimeMs = 0;
  private sessionStart = Date.now();
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly filePath = path.join(app.getPath('userData'), 'progression.json');

  start(): void {
    this.load();
    this.sessionStart = Date.now();
    this.saveTimer = setInterval(() => this.flush(), SAVE_INTERVAL_MS);
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedProgression>;
      if (typeof parsed.totalPlaytimeMs === 'number') {
        this.totalPlaytimeMs = parsed.totalPlaytimeMs;
      }
    } catch {
      this.totalPlaytimeMs = 0; // first run, or an unreadable/corrupt file
    }
  }

  private flush(): void {
    const now = Date.now();
    this.totalPlaytimeMs += now - this.sessionStart;
    this.sessionStart = now;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify({ totalPlaytimeMs: this.totalPlaytimeMs }));
    } catch {
      // best-effort; playtime tracking isn't safety-critical
    }
  }

  getTotalPlaytimeMs(): number {
    return this.totalPlaytimeMs + (Date.now() - this.sessionStart);
  }

  stop(): void {
    if (this.saveTimer) clearInterval(this.saveTimer);
    this.flush();
  }
}
