import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DesktopNavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

// The office/desk portals' (Admin, Manager, Supervisor) persistent left
// nav — replaces the horizontal pill tab bar those portals otherwise
// stretch across a whole monitor. Hidden below md entirely (see
// DesktopShell): mobile keeps that same pill bar exactly as it was.
//
// Icon-only rail at md (≈72px, matches PSU_Desktop_PC_Layout_PRD.md's
// breakpoint contract), icon + label at lg (≈240px). Same activeId/onNav
// contract as the tab bar it sits next to — clicking a nav item calls the
// exact same setActiveTab the mobile tabs already call, no new state.
export function DesktopSidebar({
  navItems, activeId, onNav,
}: {
  navItems: DesktopNavItem[];
  activeId: string;
  onNav: (id: string) => void;
}) {
  return (
    <nav className="hidden md:flex md:flex-col md:w-[72px] lg:w-60 shrink-0 gap-1 bg-white border-r border-psu-gray/10 rounded-xl lg:rounded-2xl p-2 lg:p-3 md:mr-6">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => onNav(item.id)}
          title={item.label}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-widest transition-colors justify-center lg:justify-start",
            activeId === item.id ? "bg-psu-green/10 text-psu-green" : "text-psu-gray/40 hover:bg-psu-gray/5 hover:text-psu-gray"
          )}
        >
          <item.icon size={20} className="shrink-0" />
          <span className="hidden lg:inline truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
