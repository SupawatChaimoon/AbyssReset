import type { ReactNode } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import { EmptyState } from './components/common/EmptyState';
import { DetailPanel } from './components/detail/DetailPanel';
import { IconCalendar, IconDatabase, IconSettings, IconUser, Logo } from './components/icons';
import { EditorDialog } from './components/my-items/EditorDialog';
import { PersonalProvider } from './data/PersonalContext';
import { PublicDataProvider } from './data/PublicDataContext';
import { UIProvider, useUI } from './data/UIContext';
import AboutPage from './pages/AboutPage';
import CalendarPage from './pages/CalendarPage';
import MyItemsPage from './pages/MyItemsPage';
import SettingsPage from './pages/SettingsPage';

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'ปฏิทิน', icon: <IconCalendar size={18} /> },
  { to: '/my-items', label: 'ของฉัน', icon: <IconUser size={18} /> },
  { to: '/settings', label: 'ตั้งค่า', icon: <IconSettings size={18} /> },
  { to: '/about', label: 'แหล่งข้อมูล', icon: <IconDatabase size={18} /> },
];

export default function App() {
  return (
    <PublicDataProvider>
      <PersonalProvider>
        <UIProvider>
          <Shell />
        </UIProvider>
      </PersonalProvider>
    </PublicDataProvider>
  );
}

function Shell() {
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-ink-800 focus:px-3 focus:py-2">
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="AbyssReset หน้าแรก">
            <Logo />
            <span className="text-base font-bold tracking-tight">
              Abyss<span className="text-accent">Reset</span>
            </span>
          </NavLink>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="เมนูหลัก">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${isActive ? 'bg-white/8 text-fg' : 'text-muted hover:text-fg'}`
                }
              >
                {n.icon}
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-3 pt-5 sm:px-4 sm:pt-6">
        <Routes>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/my-items" element={<MyItemsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="*"
            element={
              <div className="panel">
                <EmptyState title="ไม่พบหน้านี้" action={<NavLink to="/" className="btn btn-primary">กลับไปที่ปฏิทิน</NavLink>} />
              </div>
            }
          />
        </Routes>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-ink-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="เมนูหลัก"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex h-15 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-faint'}`
            }
          >
            {n.icon}
            {n.label}
          </NavLink>
        ))}
      </nav>

      <DetailPanel />
      <EditorDialog />
      <Toasts />
    </div>
  );
}

function Toasts() {
  const { toasts } = useUI();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-sheet-up rounded-xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur-xl ${t.tone === 'warn' ? 'border-warn/30 bg-[#2a2310]/95 text-warn' : 'border-line bg-ink-800/95 text-fg'}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
