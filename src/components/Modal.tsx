import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

// Every popup in this app shared (used to duplicate, one copy-paste per
// file) this same shape: a full-screen backdrop plus a centered white
// box, hardcoded to max-w-sm (384px). That's the whole screen anyway on
// a phone — the mobile view was already right — but on a wide desktop
// monitor it's a tiny card floating in a sea of backdrop.
//
// `size` only adds width from the `sm:` breakpoint (640px) upward — the
// base `max-w-sm` is never touched, so mobile is pixel-identical to
// before. Rounding, padding, overflow, and flex layout stay fully
// caller-controlled via `boxClassName` (they vary — a plain padded box
// vs. a flex-col with a scrolling body and fixed footer), since only the
// width was ever the actual problem.
const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm sm:max-w-md md:max-w-lg',
  md: 'max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl',
  lg: 'max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl',
};

export function Modal({
  children,
  size = 'md',
  boxClassName,
  backdropClassName,
}: {
  children: ReactNode;
  // sm: simple yes/no dialogs (confirm, reject-reason). md: most detail/
  // form popups (the default). lg: the denser forms (Add Staff, Edit
  // User) and submission-detail popups with photos/item lists.
  size?: 'sm' | 'md' | 'lg';
  boxClassName?: string;
  // Only the two existing outliers need this: OpsLogsTab's print:
  // overrides, and SupervisorPortal's black/blur-sm backdrop.
  backdropClassName?: string;
}) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md", backdropClassName)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn("bg-white w-full shadow-2xl", SIZE_CLASS[size], boxClassName)}
      >
        {children}
      </motion.div>
    </div>
  );
}
