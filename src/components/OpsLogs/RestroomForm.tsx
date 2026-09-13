import { useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OpsFormProps, ResubmitNotice, ChecklistRow } from './opsHelpers';
import { RESTROOM_GROUPS, RESTROOM_SLOTS, RestroomSlot, RESTROOM_EXAMPLE_SECTION } from '../../data/restroomData';
import { Check, CheckCircle2, Clock } from 'lucide-react';
import { useWorkingSite } from '../../hooks/useWorkingSite';

// Remembers the last section a janitor filed for, so reopening the form
// tomorrow doesn't mean retyping the same section letter again — the
// paper equivalent is "same sheet as yesterday," not a blank field every
// time. Per-browser only (localStorage), same tradeoff as every other
// convenience like this in the app.
const RESTROOM_LAST_SECTION_KEY = 'psu_restroom_last_section_v1';

// UN.00.45 Pembersihan Toilet — the paper is ONE sheet per section/day
// with three time-slot columns (08/11/16). Storage still stays one
// submission per section+date+slot (what the review queue already
// expects — see opsLogsCatalog.ts's SIGNOFF_CHAINS), but the UI is one
// screen: pick the section once, then flip between slot chips without
// ever starting a new form. Saving a slot just upserts that slot's own
// submission (create if today's slot has none yet, resubmit if it does)
// — same as a paraf, not a fresh document each time.
//
// Reopening a past REJECTED entry from History (editingSubmission set)
// is a different, simpler mode: no chips, no "today" framing — just that
// one slot's marks, corrected and resubmitted, same as before this
// rework.
export function RestroomForm({ store, onCancel, onSubmitted, editingSubmission }: OpsFormProps) {
  const { t, language } = useTranslation();
  const { currentUser, sites, submissions, addSubmission, resubmitAfterRejection } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);
  const today = new Date().toISOString().slice(0, 10);
  const allItems = RESTROOM_GROUPS.flatMap(g => g.items);

  // --- Editing a past rejected entry: unchanged single-slot behavior ---
  if (editingSubmission) {
    return (
      <RestroomSlotEditor
        title={t('ops.restroom.title')}
        siteName={currentSiteName}
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        availableSites={availableSites}
        onSiteChange={setWorkingSiteId}
        section={editingSubmission.meta?.section || ''}
        onSectionChange={() => {}}
        sectionLocked
        slot={editingSubmission.meta?.slot || '08'}
        onSlotChange={() => {}}
        marks={(() => {
          const initial: Record<string, string> = {};
          editingSubmission.items.forEach(i => { initial[i.id] = String(i.answer); });
          return initial;
        })()}
        onSave={(marks) => {
          const items = allItems.map(i => ({ id: i.id, question: `${i.labelId} (${i.labelEn})`, answer: marks[i.id] }));
          resubmitAfterRejection(editingSubmission.id, {
            items,
            meta: { ...editingSubmission.meta, section: editingSubmission.meta?.section, slot: editingSubmission.meta?.slot },
          });
          onSubmitted();
        }}
        onCancel={onCancel}
        savedBadge={false}
        resubmitBanner
      />
    );
  }

  // --- Fresh fill: one sheet for today, slot chips, upsert per slot ---
  const [section, setSection] = useState(() => localStorage.getItem(RESTROOM_LAST_SECTION_KEY) || '');
  const trimmedSection = section.trim();

  // Which of today's three slots (for this section/site/filer) already
  // have a submission, so the chips can show progress and Save can
  // upsert the right one instead of always creating a new document.
  const todaysSlotSubmissions: Partial<Record<RestroomSlot, typeof submissions[number]>> = {};
  if (trimmedSection && currentUser) {
    for (const slot of RESTROOM_SLOTS) {
      const found = submissions.find(s =>
        s.type === 'RESTROOM' && s.userId === currentUser.id && s.siteId === workingSiteId &&
        s.meta?.section === trimmedSection && s.meta?.slot === slot && s.timestamp.slice(0, 10) === today
      );
      if (found) todaysSlotSubmissions[slot] = found;
    }
  }
  // Default to the first slot not yet done today — same "next thing to
  // do" ordering a janitor's actual round follows — falling back to the
  // last slot once all three are already saved.
  const [activeSlot, setActiveSlot] = useState<RestroomSlot>(() =>
    RESTROOM_SLOTS.find(s => !todaysSlotSubmissions[s]) || RESTROOM_SLOTS[RESTROOM_SLOTS.length - 1]
  );
  const [marksBySlot, setMarksBySlot] = useState<Record<RestroomSlot, Record<string, string>>>(() => {
    const initial = {} as Record<RestroomSlot, Record<string, string>>;
    RESTROOM_SLOTS.forEach(slot => {
      const m: Record<string, string> = {};
      todaysSlotSubmissions[slot]?.items.forEach(i => { m[i.id] = String(i.answer); });
      initial[slot] = m;
    });
    return initial;
  });

  const handleSectionChange = (value: string) => {
    setSection(value);
    localStorage.setItem(RESTROOM_LAST_SECTION_KEY, value);
  };

  // A brief "Saved" flash next to the slot chips instead of navigating
  // anywhere — the whole point of this rework is that saving a slot
  // never leaves the sheet (see this file's header comment). The portal
  // one level up (JanitorPortal.tsx) only knows one thing to do with
  // onSubmitted: jump to History, which is exactly the "new document"
  // feeling this form isn't supposed to have — so onSubmitted is reserved
  // for the editingSubmission (fix-a-past-entry) flow below, where
  // jumping back to History afterward is still the right call.
  const [savedFlashSlot, setSavedFlashSlot] = useState<RestroomSlot | null>(null);

  const handleSlotSave = (slot: RestroomSlot, marks: Record<string, string>) => {
    if (!currentUser || !trimmedSection) return;
    const items = allItems.map(i => ({ id: i.id, question: `${i.labelId} (${i.labelEn})`, answer: marks[i.id] }));
    const existing = todaysSlotSubmissions[slot];
    if (existing) {
      resubmitAfterRejection(existing.id, { items, meta: { ...existing.meta, section: trimmedSection, slot } });
    } else {
      addSubmission({
        userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
        siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
        type: 'RESTROOM', status: 'PENDING',
        items,
        meta: {
          formId: 'UN.00.45', section: trimmedSection, slot,
          signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
        },
      });
    }
    // Same sheet, other chip — move straight to the next undone slot
    // instead of leaving them looking at what they just saved, but never
    // "start a new document" for it.
    const nextUndone = RESTROOM_SLOTS.find(s => s !== slot && !todaysSlotSubmissions[s]);
    if (nextUndone) setActiveSlot(nextUndone);
    setSavedFlashSlot(slot);
    setTimeout(() => setSavedFlashSlot(s => s === slot ? null : s), 2000);
  };

  return (
    <div className="space-y-6">
      <OpsHeaderChip
        siteName={currentSiteName}
        formId="UN.00.45"
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        departmentLabel={t('roles.HOUSEKEEPING_JANITOR')}
        siteOptions={availableSites}
        onSiteChange={setWorkingSiteId}
      />

      <div className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.restroom.sectionLabel')}</label>
            <input
              type="text"
              value={section}
              onChange={(e) => handleSectionChange(e.target.value)}
              placeholder={RESTROOM_EXAMPLE_SECTION}
              className="w-full text-center text-xl font-black py-3 bg-psu-bg border-2 border-psu-gray/10 rounded-2xl"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Clock size={12} /> {today}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RESTROOM_SLOTS.map(s => {
                const done = Boolean(todaysSlotSubmissions[s]);
                return (
                  <button key={s} type="button" onClick={() => setActiveSlot(s)}
                    className={cn(
                      "relative py-3 rounded-xl text-xs font-black transition-all",
                      activeSlot === s ? "bg-psu-green text-white shadow-md shadow-psu-green/20" : done ? "bg-psu-green/10 text-psu-green" : "bg-psu-bg text-psu-gray/50"
                    )}
                  >
                    {s}:00
                    {done && activeSlot !== s && <CheckCircle2 size={12} className="absolute top-1 right-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {savedFlashSlot && (
        <div className="flex items-center gap-2 justify-center py-2 text-psu-green font-black text-[10px] uppercase tracking-widest">
          <CheckCircle2 size={14} /> {t('ops.restroom.slotSaved', { slot: `${savedFlashSlot}:00` })}
        </div>
      )}

      {trimmedSection ? (
        <RestroomChecklistBody
          marks={marksBySlot[activeSlot] || {}}
          onMarksChange={(m) => setMarksBySlot(prev => ({ ...prev, [activeSlot]: m }))}
          onSave={(marks) => handleSlotSave(activeSlot, marks)}
          onCancel={onCancel}
          saveLabel={`${t('common.save')} — ${activeSlot}:00`}
          language={language}
        />
      ) : (
        <div className="card text-center py-8 text-xs text-psu-gray/40 font-medium">{t('ops.restroom.sectionRequiredHint')}</div>
      )}
    </div>
  );
}

// Shared checklist body — every point across both groups, each a 3-way
// mark, plus an "All Bersih" bulk-fill (group.marks[0] is always the
// passing mark for both groups: bersih/tersedia) so a clean pass down
// the line is tap-once instead of tap-tap-tap through 9 identical
// button presses, exceptions still handled individually afterward.
function RestroomChecklistBody({
  marks, onMarksChange, onSave, onCancel, saveLabel, language,
}: {
  marks: Record<string, string>;
  onMarksChange: (marks: Record<string, string>) => void;
  onSave: (marks: Record<string, string>) => void;
  onCancel?: () => void;
  saveLabel: string;
  language: string;
}) {
  const { t } = useTranslation();
  const [showValidation, setShowValidation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const allItems = RESTROOM_GROUPS.flatMap(g => g.items);
  const allMarked = allItems.every(i => marks[i.id]);

  const setMark = (id: string, mark: string) => onMarksChange({ ...marks, [id]: mark });
  const markAllBersih = () => {
    const next = { ...marks };
    RESTROOM_GROUPS.forEach(g => g.items.forEach(i => { next[i.id] = g.marks[0]; }));
    onMarksChange(next);
  };

  const handleSave = async () => {
    if (!allMarked) { setShowValidation(true); return; }
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    onSave(marks);
    setIsSaving(false);
  };

  return (
    <>
      <button
        type="button" onClick={markAllBersih}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-psu-green/10 text-psu-green rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
      >
        <Check size={14} /> {t('ops.restroom.allBersih')}
      </button>

      {RESTROOM_GROUPS.map(group => (
        <div key={group.key} className="card space-y-3">
          <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">
            {language === 'id' ? group.titleId : group.titleEn}
          </h4>
          {group.items.map(item => {
            const missing = showValidation && !marks[item.id];
            return (
              <ChecklistRow
                key={item.id}
                missing={missing}
                label={item.labelId}
                sublabel={item.labelEn}
                actions={group.marks.map(mark => (
                  <button
                    key={mark}
                    type="button"
                    onClick={() => setMark(item.id, mark)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                      marks[item.id] === mark
                        ? (mark === 'rusak' || mark === 'tidak' ? "bg-psu-rejected text-white" : "bg-psu-green text-white")
                        : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10"
                    )}
                  >
                    {t(`ops.restroom.mark.${mark}`)}
                  </button>
                ))}
              />
            );
          })}
        </div>
      ))}

      <div className="flex gap-3">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
            {t('common.cancel')}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", allMarked ? "bg-psu-green text-white shadow-psu-green/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >
          {isSaving ? t('common.loading') : saveLabel}
        </button>
      </div>
    </>
  );
}

// The old single-slot edit mode (reopening a REJECTED entry from
// History) — same shape RestroomForm always had, just now sharing
// RestroomChecklistBody with the new today-sheet flow instead of its own
// copy of the checklist rendering.
function RestroomSlotEditor({
  title, siteName, userName, staffCode, availableSites, onSiteChange, section, sectionLocked, slot, marks, onSave, onCancel, resubmitBanner,
}: {
  title: string;
  siteName: string;
  userName: string;
  staffCode?: string;
  availableSites?: { id: string; name: string }[];
  onSiteChange?: (id: string) => void;
  section: string;
  onSectionChange: (v: string) => void;
  sectionLocked?: boolean;
  slot: RestroomSlot;
  onSlotChange: (s: RestroomSlot) => void;
  marks: Record<string, string>;
  onSave: (marks: Record<string, string>) => void;
  onCancel?: () => void;
  savedBadge?: boolean;
  resubmitBanner?: boolean;
}) {
  const { t, language } = useTranslation();
  const [localMarks, setLocalMarks] = useState(marks);

  return (
    <div className="space-y-6">
      {resubmitBanner && <ResubmitNotice />}
      <OpsHeaderChip
        siteName={siteName}
        formId="UN.00.45"
        userName={userName}
        staffCode={staffCode}
        departmentLabel={t('roles.HOUSEKEEPING_JANITOR')}
        siteOptions={availableSites}
        onSiteChange={onSiteChange}
      />

      <div className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.restroom.sectionLabel')}</label>
            <div className={cn("w-full text-center text-xl font-black py-3 bg-psu-bg border-2 border-psu-gray/10 rounded-2xl", sectionLocked && "opacity-60")}>{section}</div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Clock size={12} /> {t('ops.slotLabel')}
            </label>
            <div className="py-3 rounded-xl text-xs font-black text-center bg-psu-green text-white shadow-md shadow-psu-green/20">{slot}:00</div>
          </div>
        </div>
      </div>

      <p className="sr-only">{title}</p>
      <RestroomChecklistBody
        marks={localMarks}
        onMarksChange={setLocalMarks}
        onSave={onSave}
        onCancel={onCancel}
        saveLabel={t('common.submit')}
        language={language}
      />
    </div>
  );
}
