import { useState } from 'react';
import { LucideIcon, Menu, X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DesktopNavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

// Remembers whether the sidebar was left expanded or folded, the same
// lightweight localStorage-memory pattern this app already uses elsewhere
// (e.g. RESTROOM_LAST_SECTION_KEY) — so it doesn't snap back to folded on
// every reload once someone's picked a preference. Defaults folded: the
// office portals' pages already show their own title, so the icon-only
// rail is enough until someone actually wants the labels.
const SIDEBAR_EXPANDED_KEY = 'psu_desktop_sidebar_expanded_v1';

// The office/desk portals' (Admin, Manager, Supervisor) persistent left
// nav — replaces the horizontal pill tab bar those portals otherwise
// stretch across a whole monitor. Hidden below md entirely (see
// DesktopShell): mobile keeps that same pill bar exactly as it was.
//
// A folded hamburger rail by default — just the toggle button, one icon
// per nav item, no labels — that expands rightward into a full labeled
// panel on click. Stretches to match the content column's own height
// (DesktopShell's flex row no longer pins it to align-start), so it reads
// as one continuous rail running the full page instead of a short box
// sized to its own nav buttons. Same activeId/onNav contract as the tab
// bar it sits next to — clicking a nav item calls the exact same
// setActiveTab the mobile tabs already call, no new state there.
export function DesktopSidebar({
  navItems, activeId, onNav,
}: {
  navItems: DesktopNavItem[];
  activeId: string;
  onNav: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next));
      } catch {
        // Private-browsing / storage-blocked — folds back to default on
        // next load instead of persisting, same tradeoff as everywhere
        // else in this app that reads/writes localStorage.
      }
      return next;
    });
  };

  return (
    <nav
      className={cn(
        "hidden md:flex md:flex-col shrink-0 gap-1 bg-white border-r border-psu-gray/10 rounded-xl p-2 md:mr-6 transition-[width] duration-200",
        expanded ? "md:w-60" : "md:w-14"
      )}
    >
      <button
        onClick={toggle}
        title={expanded ? 'Collapse menu' : 'Expand menu'}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3 text-psu-gray/40 hover:bg-psu-gray/5 hover:text-psu-gray transition-colors mb-1",
          expanded ? "justify-start" : "justify-center"
        )}
      >
        {expanded ? <X size={20} className="shrink-0" /> : <Menu size={20} className="shrink-0" />}
        {expanded && <span className="text-[11px] font-black uppercase tracking-widest truncate">Menu</span>}
      </button>

      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => onNav(item.id)}
          title={item.label}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-widest transition-colors",
            expanded ? "justify-start" : "justify-center",
            activeId === item.id ? "bg-psu-green/10 text-psu-green" : "text-psu-gray/40 hover:bg-psu-gray/5 hover:text-psu-gray"
          )}
        >
          <item.icon size={20} className="shrink-0" />
          {expanded && <span className="truncate">{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}
