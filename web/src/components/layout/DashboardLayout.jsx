import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import DemoBanner from '../common/DemoBanner';
import ErrorBoundary from '../common/ErrorBoundary';
import AIAssistant from '../assistant/AIAssistant';
import AnimatedWallpaper from '../common/AnimatedWallpaper';

const SIDEBAR_KEY = 'avenqra_sidebar_collapsed';

/**
 * DashboardLayout — responsive application shell: collapsible sidebar,
 * sticky header, demo disclosure banner and animated route content.
 */
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  /* Close the mobile drawer on navigation and reset scroll */
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  /* Close drawer when resizing to desktop */
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-slate-50/70 dark:bg-navy-950/85 overflow-x-hidden">
      <AnimatedWallpaper />
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <Header onOpenMobile={() => setMobileOpen(true)} />

        <main id="main-content" className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-6">
          <div key={location.pathname} className="mx-auto max-w-[1600px] animate-fade-in">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        <AIAssistant />

        <footer className="border-t border-slate-200 px-5 py-3.5 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          AVENQRA — AI-Driven Civic Intelligence, Response &amp; Resolution Platform · SLA
          escalations enforced server-side
        </footer>
      </div>
    </div>
  );
}