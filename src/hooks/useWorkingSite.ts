// Resolves "which site is this submission for," for anyone whose Site
// Access (Admin Portal → Personnel, see lib/siteScope.ts) covers more
// than one site. Most accounts still have exactly one site (Home Site
// only, the default) and this returns that one site with no picker
// needed — behavior identical to before Site Access existed. Once an
// Admin gives someone All Sites or a Custom set of 2+, every screen that
// used to just read `currentUser.site` needs to ask instead; this is the
// one place that logic lives.
//
// A pending job QR (`expectedSite`) always wins over anything picked
// manually — scanning a door sticker at site B is a stronger, more
// current signal of "I'm here right now" than yesterday's manual choice.

import { useEffect, useState } from 'react';
import { Site, User } from '../types';
import { sitesForScope } from '../lib/siteScope';

export function useWorkingSite(
  currentUser: User | null | undefined,
  sites: Site[],
  expectedSite?: string
) {
  const scope = currentUser ? sitesForScope(currentUser) : [];
  const availableSites = scope === 'ALL' ? sites : sites.filter(s => scope.includes(s.id));

  const fallbackId =
    currentUser && availableSites.some(s => s.id === currentUser.site)
      ? currentUser.site
      : (availableSites[0]?.id ?? currentUser?.site ?? '');

  const [manualSiteId, setManualSiteId] = useState(fallbackId);

  // Keep the manual pick valid as the user (and therefore their site
  // list) loads in or changes — e.g. right after auth resolves.
  useEffect(() => {
    if (!availableSites.some(s => s.id === manualSiteId)) {
      setManualSiteId(fallbackId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackId]);

  const pinnedByQr = Boolean(expectedSite) && availableSites.some(s => s.id === expectedSite);
  const workingSiteId = pinnedByQr ? expectedSite! : manualSiteId;
  const workingSiteName = availableSites.find(s => s.id === workingSiteId)?.name || workingSiteId;

  return {
    workingSiteId,
    workingSiteName,
    setWorkingSiteId: setManualSiteId,
    availableSites,
    // Only show a picker when there's an actual choice to make and a QR
    // hasn't already made it for them.
    needsPicker: availableSites.length > 1 && !pinnedByQr,
  };
}
