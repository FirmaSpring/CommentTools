const TOOLBAR_MOUSE_LEAVE_DELAY_MS = 90;

export function getToolbarMouseLeaveDelay(): number {
  return TOOLBAR_MOUSE_LEAVE_DELAY_MS;
}

export function shouldIgnoreToolbarMouse(
  isOverInteractiveArea: boolean,
  hasGracePeriod = false,
  keepWindowInteractive = false,
): boolean {
  if (keepWindowInteractive) {
    return false;
  }

  return !isOverInteractiveArea && !hasGracePeriod;
}

export function getToolbarHoverCursor(isOverInteractiveArea: boolean): 'default' | 'pointer' {
  return isOverInteractiveArea ? 'pointer' : 'default';
}
