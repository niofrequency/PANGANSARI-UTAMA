import { Site } from '../types';

type SiteLike = Pick<Site, 'id' | 'name'> & Partial<Pick<Site, 'area'>>;

// Area display order for grouped site pickers (see SITES' `area`).
const AREA_ORDER = ['TOWNSITE', '32', '38', '66', '68', '72', '74', 'PS', 'BC', 'KK', 'HL', 'LL', 'GRS', 'HOTEL', 'OTHER'];
const AREA_LABEL: Record<string, string> = { TOWNSITE: 'Townsite', HOTEL: 'Hotel', OTHER: 'Other' };

export function groupSitesByArea<T extends SiteLike>(sites: T[]): { area: string; label: string; sites: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const s of sites) {
    const a = s.area || 'OTHER';
    groups.set(a, [...(groups.get(a) || []), s]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (AREA_ORDER.indexOf(a) + 100 * +(AREA_ORDER.indexOf(a) < 0)) - (AREA_ORDER.indexOf(b) + 100 * +(AREA_ORDER.indexOf(b) < 0)) || a.localeCompare(b))
    .map(([area, list]) => ({ area, label: AREA_LABEL[area] || `Area ${area}`, sites: list.sort((x, y) => x.name.localeCompare(y.name)) }));
}

// <option>s for a site <select>, grouped by area. With only a handful of
// sites (e.g. one person's own site access) it stays a flat list.
export function SiteOptions({ sites }: { sites: SiteLike[] }) {
  if (sites.length <= 6) {
    return <>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</>;
  }
  return (
    <>
      {groupSitesByArea(sites).map(g => (
        <optgroup key={g.area} label={g.label}>
          {g.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </optgroup>
      ))}
    </>
  );
}
