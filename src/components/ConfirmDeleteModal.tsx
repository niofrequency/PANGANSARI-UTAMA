// Same "type DELETE to confirm" fail-safe AdminPortal.tsx already uses
// for deleting a user profile, made reusable for anywhere else a single
// tap on a trash icon would otherwise destroy real, already-entered work
// with zero confirmation. First applied to the checklist forms' per-row
// delete (LaundryShopForm, StaffReadyForm, ThawingForm,
// DailyFoodHandlerForm) — each of those let a stray tap on the trash icon
// silently wipe out a whole row's worth of entered data (garment counts,
// a staff member's full readiness checklist, a thaw batch, a food
// handler's criteria) with no way back, since the row was never
// submitted anywhere to recover it from.
//
// Deliberately controlled by the caller (open/onCancel/onConfirm) rather
// than owning its own "what to delete" state — each caller already has
// its own row-id state to act on once confirmed.

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Modal } from './Modal';

const CONFIRM_WORD = 'DELETE';

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: React.ReactNode;
  body?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ open, title, body, onCancel, onConfirm }: ConfirmDeleteModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');

  // Reset the typed text every time this closes, so it's never
  // pre-filled (accidentally still "DELETE") the next time it opens for
  // a different row.
  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <Modal size="sm" boxClassName="rounded-[32px] p-8">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 bg-psu-rejected/10 rounded-2xl flex items-center justify-center text-psu-rejected mb-4">
                <Trash2 size={28} />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-psu-gray">{title || t('confirmDelete.defaultTitle')}</h3>
              <p className="text-xs text-psu-gray/60 font-medium mt-2 leading-relaxed">
                {body || t('confirmDelete.defaultBody')}
              </p>
            </div>

            <label className="block text-[10px] font-black text-psu-gray/40 uppercase mb-2 tracking-widest">
              {t('confirmDelete.typeToConfirm')}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t('confirmDelete.inputPlaceholder')}
              className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-psu-rejected/20 transition-all mb-6"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={confirmText !== CONFIRM_WORD}
                onClick={onConfirm}
                className="flex-[2] py-4 bg-psu-rejected text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-rejected/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('confirmDelete.removeButton')}
              </button>
            </div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
