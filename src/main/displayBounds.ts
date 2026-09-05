import { screen } from 'electron';
import type { Rect } from '../shared/ipcContract';

/** The work area of the display nearest the cursor, used as the pet's "home" bounds. */
export function getHomeWorkArea(): Rect {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  return display.workArea;
}
