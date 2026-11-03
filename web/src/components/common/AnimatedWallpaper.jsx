import React, { useEffect, useRef, useState } from 'react';
import { Shield, Check, Sparkles, Layers, Sliders, Cpu, Activity, Flame } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const WALLPAPER_THEMES = [
  {
    id: 'cyber-command',
    name: 'Executive Cyber Grid (Default)',
    desc: 'High-contrast smart-city command telemetry with luminous matrix lines and pulse nodes',
    type: 'grid',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    bgDark: '#050914',
    bgLight: '#f8fafc',
    gridColorDark: 'rgba(14, 165, 233, 0.12)',
    gridColorLight: 'rgba(14, 165, 233, 0.08)',
    accent: 'from-cyan-500 via-blue-600 to-indigo-600',
    nodeColor: '#38bdf8',
  },
  {
    id: 'deep-obsidian',
    name: 'Deep Obsidian High-Contrast',
    desc: 'Pure contrast minimalist dark command center with razor-sharp telemetry',
    type: 'radar',
    primary: '#6366f1',
    secondary: '#3b82f6',
    bgDark: '#020617',
    bgLight: '#f1f5f9',
    gridColorDark: 'rgba(99, 102, 241, 0.10)',
    gridColorLight: 'rgba(99, 102, 241, 0.06)',
    accent: 'from-indigo-500 via-blue-500 to-slate-900',
    nodeColor: '#818cf8',
  },
  {
    id: 'blue-plasma-fire',
    name: 'Cyber Plasma Fire',
    desc: 'Super-heated electric cyan & blue plasma sparks with rising pulses',
    type: 'plasma',
    primary: '#06b6d4',
    secondary: '#3b82f6',
    bgDark: '#040b17',
    bgLight: '#f0f9ff',
    glowGradient: 'from-cyan-500/25 via-blue-600/20 to-transparent',
    emberColors: ['#ffffff', '#cffafe', '#38bdf8', '#0ea5e9', '#2563eb', '#1d4ed8'],
    accent: 'from-cyan-400 via-blue-500 to-indigo-600',
    particleCount: 80,
  },
  {
    id: 'inferno-blaze',
    name: 'Inferno Blaze Fire',
    desc: 'Roaring golden-orange flames with realistic rising spark embers',
    type: 'fire',
    primary: '#ff4500',
    secondary: '#ff8c00',
    bgDark: '#120703',
    bgLight: '#fff7ed',
    glowGradient: 'from-orange-600/25 via-red-600/15 to-transparent',
    emberColors: ['#ffffff', '#fff3b0', '#ffd166', '#ff8c00', '#ff4500', '#dc2626'],
    accent: 'from-amber-500 via-orange-600 to-red-600',
    particleCount: 90,
  },
];

const THEME_STORAGE_KEY = 'avenqra_pro_wallpaper_theme';

export default function AnimatedWallpaper() {
  const { isDark } = useTheme();
  const canvasRef = useRef(null);

  const [activeThemeId, setActiveThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && WALLPAPER_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
      return 'cyber-command';
    } catch {
      return 'cyber-command';
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const currentTheme = WALLPAPER_THEMES.find((t) => t.id === activeThemeId) || WALLPAPER_THEMES[0];

  const selectTheme = (id) => {
    setActiveThemeId(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    setMenuOpen(false);
  };

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

    // Particle nodes for grid/plasma/fire
    const nodeCount = currentTheme.type === 'grid' || currentTheme.type === 'radar' ? 45 : currentTheme.particleCount || 70;
    const particles = [];

    for (let i = 0; i < nodeCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (currentTheme.type === 'grid' ? 0.6 : 1.2),
        vy: currentTheme.type === 'fire' || currentTheme.type === 'plasma'
          ? -1.2 - Math.random() * 2.2
          : (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2.5 + 1.2,
        alpha: Math.random() * 0.6 + 0.3,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulseVal: Math.random() * Math.PI,
      });
    }

    let gridOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Executive Cyber Grid Mode
      if (currentTheme.type === 'grid' || currentTheme.type === 'radar') {
        const gridSize = 48;
        gridOffset = (gridOffset + 0.25) % gridSize;

        ctx.strokeStyle = isDark ? currentTheme.gridColorDark : currentTheme.gridColorLight;
        ctx.lineWidth = 1;

        // Draw vertical grid lines
        for (let x = -gridOffset; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Draw horizontal grid lines
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Interconnecting nodal vectors
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          p.pulseVal += p.pulseSpeed;
          const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulseVal));

          ctx.fillStyle = currentTheme.nodeColor;
          ctx.globalAlpha = currentAlpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Connect adjacent nodes with subtle high-contrast vector lines
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.strokeStyle = currentTheme.nodeColor;
              ctx.globalAlpha = (1 - dist / 130) * 0.25;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1.0;
      }
      // 2. Plasma / Fire Particle Engine
      else {
        const colors = currentTheme.emberColors || ['#ffffff', '#38bdf8', '#0ea5e9'];
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.y += p.vy;
          p.x += p.vx + Math.sin(p.pulseVal) * 0.5;
          p.pulseVal += 0.04;

          if (p.y < -20) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }

          const colIdx = Math.floor(Math.random() * colors.length);
          ctx.fillStyle = colors[colIdx];
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [currentTheme, isDark]);

  return (
    <>
      {/* Background Canvas */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-colors duration-500"
        style={{
          backgroundColor: isDark ? currentTheme.bgDark : currentTheme.bgLight,
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full opacity-90" />
      </div>

      {/* Floating Professional Theme Switcher Pill in Bottom Right */}
      <div className="fixed bottom-4 right-4 z-40">
        {menuOpen && (
          <div className="mb-2 w-72 rounded-2xl border-2 border-slate-300 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                <Sliders className="h-3.5 w-3.5 text-cyan-500" />
                Visual Atmosphere
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 space-y-1.5">
              {WALLPAPER_THEMES.map((theme) => {
                const active = theme.id === activeThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => selectTheme(theme.id)}
                    className={`flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition ${
                      active
                        ? 'border-2 border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/40'
                        : 'border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {theme.name}
                        </span>
                        {active && <Check className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />}
                      </div>
                      <p className="line-clamp-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {theme.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-full border-2 border-slate-300 bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800 shadow-xl backdrop-blur-md hover:border-cyan-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
          title="Toggle Visual Atmosphere"
        >
          <Cpu className="h-3.5 w-3.5 text-cyan-500" />
          <span>{currentTheme.name.split(' ')[0]}</span>
        </button>
      </div>
    </>
  );
}
