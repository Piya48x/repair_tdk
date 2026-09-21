import React, { useEffect } from "react";
import { ExternalLink, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import tdkLogo from "../../../assets/2.png";

function DashboardSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  groups,
  theme,
  isDarkTheme,
  title,
  subtitle,
  navigationLabel,
  closeLabel,
  collapseLabel,
  expandLabel,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  const handleItemClick = (item) => {
    onClose();
    item.onClick?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity lg:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        aria-label={navigationLabel}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r ring-1 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${theme.sidebarShell} ${isDarkTheme ? "shadow-[18px_0_45px_rgba(2,6,23,0.5)] ring-slate-800/80" : "shadow-[18px_0_45px_rgba(15,23,42,0.13)] ring-slate-200/60"} ${collapsed ? "lg:w-20" : "lg:w-72"} ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <header className={`relative shrink-0 border-b px-3 py-3 ${theme.sidebarSectionBorder}`}>
          <div className={`flex items-center gap-2 ${collapsed ? "lg:justify-center" : "justify-between"}`}>
            <div className={`flex min-w-0 items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-white p-1.5 shadow-sm ring-4 ${isDarkTheme ? "border-[#5f86d8]/25 shadow-slate-950/40 ring-[#2b59b0]/15" : "border-[#2b59b0]/15 shadow-slate-200/70 ring-[#2b59b0]/5"}`}>
                <img src={tdkLogo} alt="TDK" className="h-full w-full object-contain" />
              </span>
              <span className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
                <span className={`block truncate text-sm font-black ${theme.sidebarHeading}`}>{title}</span>
                <span className={`mt-0.5 block truncate text-[10px] font-semibold ${theme.sidebarVersion}`}>{subtitle}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label={collapsed ? expandLabel : collapseLabel}
                title={collapsed ? expandLabel : collapseLabel}
                className={`hidden items-center justify-center rounded-xl border p-2 transition lg:inline-flex ${isDarkTheme ? "border-slate-700 bg-[#111827] text-slate-300 shadow-sm hover:border-[#5f86d8]/50 hover:bg-[#162136] hover:text-[#dbe7ff]" : "border-slate-200 bg-white text-slate-500 shadow-sm hover:border-[#2b59b0]/30 hover:bg-[#eff4ff] hover:text-[#2b59b0]"} ${collapsed ? "absolute -right-3 top-5 z-10" : ""}`}
              >
                {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl lg:hidden ${theme.sidebarCloseButton}`}
              >
                <X size={17} />
              </button>
            </div>
          </div>
        </header>

        <nav className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-8 pt-2.5 ${isDarkTheme ? "[scrollbar-width:thin] [scrollbar-color:#475569_transparent]" : "[scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"}`}>
          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`dashboard-sidebar-${group.id}`}>
                <h2
                  id={`dashboard-sidebar-${group.id}`}
                  className={`px-3 pt-3.5 text-[10px] font-black uppercase tracking-[0.18em] ${theme.sidebarToolsLabel} ${collapsed ? "lg:sr-only" : ""}`}
                >
                  {group.label}
                </h2>
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.active;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={collapsed ? item.label : undefined}
                        onClick={() => handleItemClick(item)}
                        className={`group relative flex w-full items-center rounded-xl border border-transparent px-3 py-2 text-left text-sm font-semibold transition-all duration-200 ${isActive ? theme.sidebarNavActive : theme.sidebarNavIdle} ${collapsed ? "lg:justify-center lg:px-2.5" : ""}`}
                      >
                        <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
                          <Icon size={17} strokeWidth={2.25} />
                          {item.badgeCount > 0 ? (
                            <span className={`absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow-sm ring-2 ${isDarkTheme ? "ring-[#0f172a]" : "ring-white"}`}>
                              {item.badgeCount > 9 ? "9+" : item.badgeCount}
                            </span>
                          ) : null}
                        </span>
                        <span className={`ml-2.5 min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                        {item.external ? <ExternalLink size={13} className={`shrink-0 opacity-60 ${collapsed ? "lg:hidden" : ""}`} /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}

export default DashboardSidebar;
