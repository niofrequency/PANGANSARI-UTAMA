import { useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

// A tab/sidebar icon with a red count bubble (same look as the Chat tab's
// unread badge). Returns a component usable wherever a LucideIcon is.
export function useBadgedIcon(Icon: LucideIcon, count: number): LucideIcon {
  return useMemo(() => {
    const Badged = (props: { size?: number; className?: string }) => (
      <span className="relative inline-flex">
        <Icon {...props} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-psu-rejected text-white text-[9px] font-black leading-4 text-center shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
    );
    return Badged as unknown as LucideIcon;
  }, [Icon, count]);
}

// Opens a portal's Ops Logs tab when the app is opened from a "new log to
// check" notification (/?tab=opslogs) or one is tapped while it's open.
export function useOpenOpsLogsSignal(open: () => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'opslogs') {
      open();
      params.delete('tab');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }
    const onMessage = (e: MessageEvent) => { if (e.data?.type === 'OPEN_OPSLOGS') open(); };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Generic version for any tab: /?tab=<name> on open, or an OPEN_TAB
// message from the service worker when a notification is tapped
// (public/sw.js) — used for reported issues and action items.
export function useOpenTabSignal(tab: string, open: () => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === tab) {
      open();
      params.delete('tab');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }
    const onMessage = (e: MessageEvent) => { if (e.data?.type === 'OPEN_TAB' && e.data.tab === tab) open(); };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
