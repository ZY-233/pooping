export const TAB_PATHS = ["/", "/calendar", "/me"] as const;

export type TabPath = (typeof TAB_PATHS)[number];

export function normalizeTabPath(pathname: string): TabPath | null {
  if (pathname === "/") {
    return "/";
  }

  if (pathname.startsWith("/calendar")) {
    return "/calendar";
  }

  if (pathname.startsWith("/me")) {
    return "/me";
  }

  return null;
}

export function getTabIndex(pathname: string): number {
  const normalized = normalizeTabPath(pathname);
  if (!normalized) {
    return -1;
  }
  return TAB_PATHS.indexOf(normalized);
}

export function getSwipeThreshold(pathname: string): number {
  const normalized = normalizeTabPath(pathname);
  if (normalized === "/calendar") {
    return 85;
  }
  return 70;
}

export function getSwipeTarget(pathname: string, direction: "left" | "right"): TabPath | null {
  const index = getTabIndex(pathname);
  if (index < 0) {
    return null;
  }

  const next = direction === "left" ? index + 1 : index - 1;
  if (next < 0 || next >= TAB_PATHS.length) {
    return null;
  }

  return TAB_PATHS[next];
}
