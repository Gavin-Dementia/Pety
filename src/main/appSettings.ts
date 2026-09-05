import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

interface PersistedSettings {
  selectedSpeciesId?: string;
}

const DEFAULT_SPECIES_ID = 'placeholder';

/**
 * Small, generalized settings store — starts with just the selected
 * species id, but the shape is meant to grow (write-through on every
 * `set`, no interval timer, since settings change on discrete user
 * actions, not continuously like playtime).
 */
export class AppSettings {
  private settings: PersistedSettings = {};
  private readonly filePath = path.join(app.getPath('userData'), 'settings.json');

  load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.settings = JSON.parse(raw) as PersistedSettings;
    } catch {
      this.settings = {}; // first run, or an unreadable/corrupt file
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings));
    } catch {
      // best-effort; settings aren't safety-critical
    }
  }

  getSelectedSpeciesId(): string {
    return this.settings.selectedSpeciesId ?? DEFAULT_SPECIES_ID;
  }

  setSelectedSpeciesId(id: string): void {
    this.settings.selectedSpeciesId = id;
    this.save();
  }
}
