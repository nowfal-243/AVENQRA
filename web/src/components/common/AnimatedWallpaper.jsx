import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Palette, Check, Layers } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const WALLPAPER_THEMES = [
  {
    id: 'cyber-aurora',
    name: 'Cyber Aurora',
    desc: 'Bioluminescent electric cyan & indigo drifting aurora orbs',
    colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#0ea5e9'],
    accent: 'from-cyan-500 to-indigo-600',
  },
  {
    id: 'city-matrix',
    name: 'City Constellation',
    desc: 'Living municipal grid nodes with animated connection telemetry',
    colors: ['#0284c7', '#06b6d4', '#10b981', '#38bdf8'],
    accent: 'from-sky-500 to-emerald-500',
  },
  {
    id: 'neon-grid',
    name: 'Command Cybergrid',
    desc: 'Futuristic high-tech perspective wireframe & glowing scan-lines',
    colors: ['#6366f1', '#ec4899', '#06b6d4', '#a855f7'],
    accent: 'from-indigo-500 via-purple-500 to-pink-500',
  },
  {
    id: 'emerald-eco',
    name: 'Emerald Eco-City',
    desc: 'Clean futuristic sustainable city wave flow',
    colors: ['#10b981', '#14b8a6', '#06b6d4', '#059669'],
    accent: 'from-emerald-500 to-teal-500',
  },
];

const THEME_STORAGE_KEY = 'avenqra_animated_wallpaper_theme';

export default function AnimatedWallpaper({ showControls = false }) {
  const { isDark } = useTheme();
  const canvasRef = useRef(null);

  const [activeTheme, setActiveTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'cyber-aurora';
    } catch {
      return 'cyber-aurora';
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const selectTheme = (id) => {
    setActiveTheme(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    setMenuOpen(false);
  };

  // Canvas particle / node animation engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate node particles based on active theme
    const themeConfig = WALLPAPER_THEMES.find((t) => t.id === activeTheme) || WALLPAPER_THEMES[0];
    const particleCount = Math.min(45, Math.floor(width / 35));

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2.5 + 1.2,
      color: themeConfig.colors[Math.floor(Math.random() * themeConfig.colors.length)],
      pulse: Math.random() * Math.PI * 2,
    }));

    let step = 0;

    const render = () => {
      step += 0.015;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw glowing constellation connections
      const maxDist = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isDark ? 0.22 : 0.12);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isDark ? `rgba(6, 182, 212, ${alpha})` : `rgba(2, 132, 199, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 2. Draw nodes
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.pulse += 0.03;
        const currentRadius = p.radius + Math.sin(p.pulse) * 0.8;

        // Outer glow
        const glowAlpha = isDark ? 0.35 : 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (isDark ? '40' : '25');
        ctx.fill();

        // Node core
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = isDark ? p.color : p.color;
        ctx.shadowBlur = isDark ? 8 : 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTheme, isDark]);

  return (
    <>
      {/* Dynamic Animated Wallpaper Background (fixed behind everything) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Cyber Grid Mesh Pattern */}
        <div
          className={`absolute inset-0 opacity-[0.035] dark:opacity-[0.07] ${
            activeTheme === 'neon-grid' ? 'opacity-[0.08] dark:opacity-[0.14]' : ''
          }`}
          style={{
            backgroundImage: `linear-gradient(${isDark ? '#38bdf8' : '#0284c7'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#38bdf8' : '#0284c7'} 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Ambient Aurora Gradient Mesh Orbs */}
        <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-transparent blur-[120px] dark:from-cyan-500/15 dark:via-blue-600/10 animate-pulse" />
        <div className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-bl from-indigo-500/15 via-purple-500/10 to-transparent blur-[140px] dark:from-indigo-600/15 dark:via-purple-600/10 animate-pulse delay-1000" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-tr from-teal-400/15 via-emerald-500/10 to-transparent blur-[130px] dark:from-teal-500/10 dark:via-emerald-600/10 animate-pulse delay-700" />

        {/* Dynamic Canvas Particles & Telemetry Mesh */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Floating Wallpaper Theme Switcher Pill (Interactive) */}
      <div className="fixed bottom-5 left-5 z-40 hidden sm:block">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:border-cyan-500/40 hover:text-cyan-600 dark:border-white/[0.1] dark:bg-navy-900/90 dark:text-slate-200 dark:hover:border-cyan-400/40 active:scale-95"
            title="Switch animated theme wallpaper"
          >
            <Palette className="h-4 w-4 text-cyan-500" />
            <span className="hidden md:inline">Wallpaper:</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">
              {WALLPAPER_THEMES.find((t) => t.id === activeTheme)?.name || 'Theme'}
            </span>
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
          </button>

          {/* Theme Switcher Flyout */}
          {menuOpen && (
            <div className="absolute bottom-12 left-0 w-72 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/[0.1] dark:bg-navy-900/95 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-900 dark:border-white/5 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Animated Wallpapers</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400">60 FPS</span>
              </div>

              <div className="mt-1 space-y-1">
                {WALLPAPER_THEMES.map((theme) => {
                  const active = activeTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => selectTheme(theme.id)}
                      className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs transition ${
                        active
                          ? 'bg-cyan-50 font-bold text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${theme.accent}`} />
                          <span className="font-bold">{theme.name}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400 leading-tight">
                          {theme.desc}
                        </p>
                      </div>
                      {active && <Check className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
