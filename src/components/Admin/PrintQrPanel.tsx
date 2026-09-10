import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, Thermometer, Flame, Sparkles, HeartPulse, DoorOpen, Toilet, WashingMachine, ClipboardList } from 'lucide-react';
import { Site } from '../../types';
import { useTranslation } from '../../i18n/LanguageContext';
import { buildSimpleJobUrl, buildRoomJobUrl, SimpleJobAction } from '../../lib/qrLinks';

// Renders a QR code to an <img> via the `qrcode` package. No canvas element
// kept around after the data URL is generated — just an image, so it
// prints cleanly and scales like any other image.
function QrImage({ value, size = 176 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((err) => console.error('QrImage: failed to render QR code:', err));
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return <div style={{ width: size, height: size }} className="bg-psu-bg animate-pulse rounded-xl" />;
  }
  return <img src={src} width={size} height={size} alt="" className="rounded-xl" />;
}

interface QrCardProps {
  url: string;
  icon: typeof Thermometer;
  label: string;
  sublabel: string;
}

// Card = QR + icon + label + site name — deliberately never a PIN or an
// email (see PSU_QR_JobDeepLink_PRD.md's Admin section). The QR itself
// carries no identity either way (see deepLink.ts) — this is just the
// printed presentation of that same rule.
function QrCard({ url, icon: Icon, label, sublabel }: QrCardProps) {
  return (
    <div className="border border-psu-gray/10 rounded-2xl p-5 flex flex-col items-center gap-3 bg-white break-inside-avoid">
      <QrImage value={url} />
      <div className="flex items-center gap-2 text-psu-gray">
        <Icon size={16} />
        <span className="text-sm font-bold">{label}</span>
      </div>
      <span className="text-[10px] text-psu-gray/50 font-black uppercase tracking-widest text-center">{sublabel}</span>
    </div>
  );
}

const TECHNICIAN_ACTIONS: { action: SimpleJobAction; icon: typeof Thermometer; labelKey: string }[] = [
  { action: 'fridge', icon: Thermometer, labelKey: 'technician.fridgeTemp' },
  { action: 'core', icon: Flame, labelKey: 'technician.coreTemp' },
  { action: 'clean', icon: Sparkles, labelKey: 'technician.areaClean' },
  { action: 'wellness', icon: HeartPulse, labelKey: 'technician.sectionPersonalCheck' },
];

// Each of these roles has exactly one QR-triggerable job — a one-card
// "pack" — unlike the Technician's four. Food Safety Supervisor's card
// (action 'ops_logs') doesn't point at one form; scanning it just opens
// their Ops Logs tab, where all five forms in ops.restroom.title etc. live
// — see App.tsx's ACTION_ROLE map and SupervisorPortal.tsx's startTab.
const JANITOR_ACTION: { action: SimpleJobAction; icon: typeof Thermometer; labelKey: string } =
  { action: 'toilet', icon: Toilet, labelKey: 'ops.restroom.title' };
const LAUNDRY_ACTION: { action: SimpleJobAction; icon: typeof Thermometer; labelKey: string } =
  { action: 'laundry', icon: WashingMachine, labelKey: 'ops.laundryShop.title' };
const SUPERVISOR_ACTION: { action: SimpleJobAction; icon: typeof Thermometer; labelKey: string } =
  { action: 'ops_logs', icon: ClipboardList, labelKey: 'ops.tabTitle' };

export function PrintQrPanel({ sites }: { sites: Site[] }) {
  const { t } = useTranslation();
  const [siteId, setSiteId] = useState(sites[0]?.id || '');
  const [roomListText, setRoomListText] = useState('');

  const siteName = sites.find((s) => s.id === siteId)?.name || siteId;

  const roomRows = roomListText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [barak, kamar] = line.split(',').map((s) => s.trim());
      return { barak, kamar };
    })
    .filter((r) => r.barak && r.kamar);

  return (
    <div className="space-y-6">
      {/* Print-only visibility: hides everything else on the page so only
          .psu-print-area shows up on paper. Scoped here since this is the
          only tab that ever needs it. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .psu-print-area, .psu-print-area * { visibility: visible; }
          .psu-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div className="card space-y-4 print:hidden">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('admin.printTitle')}</h2>
        <p className="text-xs text-psu-gray/50 font-medium leading-relaxed">{t('admin.printSubtitle')}</p>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('admin.siteLabel')}</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-bold"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('admin.printRoomListLabel')}</label>
          <textarea
            value={roomListText}
            onChange={(e) => setRoomListText(e.target.value)}
            placeholder={t('admin.printRoomListPlaceholder')}
            rows={4}
            className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all"
          />
          <p className="text-[10px] text-psu-gray/40 font-medium mt-2">{t('admin.printRoomListNote')}</p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
        >
          <Printer size={16} />
          {t('admin.printButton')}
        </button>
      </div>

      <div className="psu-print-area space-y-8">
        <div>
          <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest mb-3 px-1">{t('admin.printTechnicianPack')} — {siteName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TECHNICIAN_ACTIONS.map((a) => (
              <div key={a.action}>
                <QrCard
                  url={buildSimpleJobUrl(a.action, siteId)}
                  icon={a.icon}
                  label={t(a.labelKey)}
                  sublabel={siteName}
                />
              </div>
            ))}
          </div>
        </div>

        {roomRows.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest mb-3 px-1">{t('admin.printHousekeepingPack')} — {siteName}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {roomRows.map((r) => (
                <div key={`${r.barak}-${r.kamar}`}>
                  <QrCard
                    url={buildRoomJobUrl(siteId, r.barak, r.kamar)}
                    icon={DoorOpen}
                    label={`${t('housekeeper.barakLabel')} ${r.barak} · ${t('housekeeper.roomLabel')} ${r.kamar}`}
                    sublabel={siteName}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest mb-3 px-1">{t('admin.printJanitorPack')} — {siteName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QrCard
              url={buildSimpleJobUrl(JANITOR_ACTION.action, siteId)}
              icon={JANITOR_ACTION.icon}
              label={t(JANITOR_ACTION.labelKey)}
              sublabel={siteName}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest mb-3 px-1">{t('admin.printLaundryPack')} — {siteName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QrCard
              url={buildSimpleJobUrl(LAUNDRY_ACTION.action, siteId)}
              icon={LAUNDRY_ACTION.icon}
              label={t(LAUNDRY_ACTION.labelKey)}
              sublabel={siteName}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest mb-3 px-1">{t('admin.printSupervisorPack')} — {siteName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QrCard
              url={buildSimpleJobUrl(SUPERVISOR_ACTION.action, siteId)}
              icon={SUPERVISOR_ACTION.icon}
              label={t(SUPERVISOR_ACTION.labelKey)}
              sublabel={siteName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
