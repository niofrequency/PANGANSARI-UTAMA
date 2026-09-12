import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// Every uploaded photo (Ops Logs checklist items, Field Reports, Admin's
// Activity tab) was a plain `object-cover` thumbnail with no way to see
// it full-size — a Supervisor/Manager reviewing a submission couldn't
// actually inspect the photo they were signing off on. This is the one
// shared full-screen viewer for all of them.
//
// Mount it unconditionally (`<Lightbox src={openUrl} onClose={...} />`,
// not `{openUrl && <Lightbox .../>}`) so AnimatePresence gets a stable
// parent to animate the exit against — `src` toggling between a url and
// null/undefined is what shows/hides it. z-[100] sits above Modal's
// z-50, so a photo inside a popup can still open its own lightbox on top.
export function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null | undefined;
  alt?: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={20} />
          </button>
          <motion.img
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            src={src}
            alt={alt ?? ''}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
