import { createContext, useContext } from 'react';
import { History } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

// In Firebase mode each device only keeps the last LIVE_WINDOW_DAYS days of
// submissions (plus anything still PENDING) loaded — see
// services/submissionsService.ts. This is the "go back further" control
// every history-style list shows under its rows. Provided once from
// App.tsx via context so the many portals that render
// SubmissionHistoryList don't each need a new prop threaded through.
export interface OlderHistory {
  enabled: boolean;
  loadedFrom: string; // ISO: everything on/after this is already loaded
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void | Promise<void>;
}

export const OlderHistoryContext = createContext<OlderHistory | null>(null);

export function LoadOlderHistory() {
  const { t } = useTranslation();
  const h = useContext(OlderHistoryContext);
  if (!h || !h.enabled) return null;
  const since = new Date(h.loadedFrom).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest text-center">
        {t('history.showingSince').replace('{date}', since)}
      </p>
      {h.hasMore ? (
        <button
          type="button"
          onClick={() => h.loadMore()}
          disabled={h.isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-psu-gray/10 text-[10px] font-black uppercase tracking-widest text-psu-gray/60 hover:text-psu-gray disabled:opacity-50"
        >
          <History size={14} />
          {h.isLoading ? t('history.loadingOlder') : t('history.loadOlder')}
        </button>
      ) : (
        <p className="text-[10px] text-psu-gray/30 font-black uppercase tracking-widest">{t('history.noOlder')}</p>
      )}
    </div>
  );
}
