import { ReactNode } from 'react';
import { DesktopNavItem, DesktopSidebar } from './DesktopSidebar';

// Wraps an office/desk portal's existing tab content with a persistent
// left sidebar + page title at md+ — see PSU_Desktop_PC_Layout_PRD.md.
// Below md this renders nothing but its own children (the sidebar itself
// is hidden inside DesktopSidebar), so the caller's existing mobile pill
// tab bar — left in place, just wrapped in md:hidden by the caller — is
// exactly what shows on a phone, unchanged.
//
// `children` is the caller's whole existing body (mobile tab bar +
// tab-content switch) — this component only adds the sidebar and a page
// title alongside it, never touches how that content picks what to show.
//
// No `items-start` here (deliberately — it used to pin the sidebar to
// align-start, which left it only as tall as its own nav buttons instead
// of running the full page): the default flex `stretch` lets the sidebar
// match whichever column ends up taller — nav column or content — so it
// always reads as one continuous rail down to the bottom of the page.
export function DesktopShell({
  navItems, activeId, onNav, title, actions, children,
}: {
  navItems: DesktopNavItem[];
  activeId: string;
  onNav: (id: string) => void;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="md:flex">
      <DesktopSidebar navItems={navItems} activeId={activeId} onNav={onNav} />
      <div className="flex-1 min-w-0">
        <div className="hidden md:flex items-center justify-between mb-6 gap-4">
          <h1 className="text-xl lg:text-2xl font-black text-psu-gray truncate">{title}</h1>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
