import React, { useEffect, useRef, useState } from 'react';
import { Flame, Check, Sparkles, Layers, Sliders } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const FIRE_THEMES = [
  {
    id: 'inferno-blaze',
    name: 'Inferno Blaze',
    desc: 'Roaring golden-orange flames with realistic rising spark embers',
    primary: '#ff4500',
    secondary: '#ff8c00',
    heatCore: '#fff7ed',
    glowGradient: 'from-orange-600/30 via-red-600/20 to-transparent',
    emberColors: ['#ffffff', '#fff3b0', '#ffd166', '#ff8c00', '#ff4500', '#dc2626', '#b91c1c'],
    accent: 'from-amber-500 via-orange-600 to-red-600',
    particleCount: 110,
  },
  {
    id: 'volcanic-magma',
    name: 'Volcanic Lava',
    desc: 'Deep molten magma heat with slow rising volcanic ash cinders',
    primary: '#dc2626',
    secondary: '#991b1b',
    heatCore: '#fef08a',
    glowGradient: 'from-red-600/30 via-rose-700/20 to-transparent',
    emberColors: ['#fef08a', '#f97316', '#ef4444', '#b91c1c', '#7f1d1d'],
    accent: 'from-red-600 via-rose-700 to-red-950',
    particleCount: 85,
  },
  {
    id: 'blue-plasma-fire',
    name: 'Blue Plasma Fire',
    desc: 'Super-heated cybernetic blue & cyan flames with electric sparks',
    primary: '#06b6d4',
    secondary: '#3b82f6',
    heatCore: '#ffffff',
    glowGradient: 'from-cyan-500/25 via-blue-600/20 to-transparent',
    emberColors: ['#ffffff', '#cffafe', '#38bdf8', '#0ea5e9', '#2563eb', '#1d4ed8'],
    accent: 'from-cyan-400 via-blue-500 to-indigo-600',
    particleCount: 95,
  },
  {
    id: 'phoenix-firestorm',
    name: 'Phoenix Solar Fire',
    desc: 'Mystic violet, magenta & amber cosmic solar flares',
    primary: '#ec4899',
    secondary: '#f59e0b',
    heatCore: '#fef3c7',
    glowGradient: 'from-pink-600/25 via-purple-600/20 to-transparent',
    emberColors: ['#ffffff', '#fef08a', '#fbbf24', '#f43f5e', '#ec4899', '#9333ea'],
    accent: 'from-amber-400 via-pink-500 to-purple-600',
    particleCount: 100,
  },
];

const THEME_STORAGE_KEY = 'avenqra_fire_wallpaper_theme';

export default function AnimatedWallpaper() {
  const { isDark } = useTheme();
  const canvasRef = useRef(null);

  const [activeThemeId, setActiveThemeId] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'inferno-blaze';
    } catch {
      return 'inferno-blaze';
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const currentTheme = FIRE_THEMES.find((t) => t.id === activeThemeId) || FIRE_THEMES[0];

  const selectTheme = (id) => {
    setActiveThemeId(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    setMenuOpen(false);
  };

  // High-performance canvas realistic fire & ember engine
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

    // Particle pool for embers & rising fire sparks
    const count = Math.min(currentTheme.particleCount, Math.floor(width / 14));
    const embers = [];

    const spawnEmber = () => {
      // Spawn mostly along the bottom width, with slight horizontal spread
      const x = Math.random() * width;
      const y = height + Math.random() * 40;
      const speed = Math.random() * 2.2 + 1.2;
      const size = Math.random() * 3.5 + 1.0;
      const life = 0;
      const maxLife = Math.random() * 180 + 100;
      const wobbleSpeed = Math.random() * 0.04 + 0.015;
      const wobbleAmp = Math.random() * 2.2 + 0.8;
      const seed = Math.random() * Math.PI * 2;

      return {
        x,
        y,
        speed,
        size,
        life,
        maxLife,
        wobbleSpeed,
        wobbleAmp,
        seed,
        // Pick initial color
        colorIndex: Math.floor(Math.random() * currentTheme.emberColors.length),
      };
    };

    // Pre-populate particles across varying vertical positions so fire starts alive
    for (let i = 0; i < count; i++) {
      const p = spawnEmber();
      p.y = Math.random() * height;
      p.life = Math.random() * p.maxLife;
      embers.push(p);
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Enable additive blending for realistic blazing flame heat
      ctx.globalCompositeOperation = 'lighter';

      // 1. Draw Rising Flame Heat Base along the bottom
      const flameGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 1.05,
        20,
        width * 0.5,
        height,
        height * 0.55
      );

      if (currentTheme.id === 'blue-plasma-fire') {
        flameGradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        flameGradient.addColorStop(0.35, 'rgba(37, 99, 235, 0.25)');
        flameGradient.addColorStop(0.7, 'rgba(29, 78, 216, 0.10)');
        flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (currentTheme.id === 'volcanic-magma') {
        flameGradient.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
        flameGradient.addColorStop(0.4, 'rgba(220, 38, 38, 0.3)');
        flameGradient.addColorStop(0.75, 'rgba(153, 27, 27, 0.12)');
        flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (currentTheme.id === 'phoenix-firestorm') {
        flameGradient.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        flameGradient.addColorStop(0.4, 'rgba(236, 72, 153, 0.28)');
        flameGradient.addColorStop(0.8, 'rgba(147, 51, 234, 0.12)');
        flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        // Inferno Blaze default
        flameGradient.addColorStop(0, 'rgba(255, 247, 237, 0.55)');
        flameGradient.addColorStop(0.2, 'rgba(255, 140, 0, 0.45)');
        flameGradient.addColorStop(0.55, 'rgba(220, 38, 38, 0.22)');
        flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = flameGradient;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);

      // 2. Draw Sinuous Flame Wave Tongues at base
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.moveTo(0, height);
        const waveY = height - 25 - w * 15;
        const waveFreq = 0.0035 + w * 0.0015;
        const waveSpeed = time * (1.8 + w * 0.6);

        for (let x = 0; x <= width; x += 15) {
          const dy =
            Math.sin(x * waveFreq + waveSpeed) * (20 + w * 12) +
            Math.cos(x * 0.007 - waveSpeed * 0.8) * 14;
          ctx.lineTo(x, waveY + dy);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const waveAlpha = (0.16 - w * 0.04) * (isDark ? 1 : 0.8);
        ctx.fillStyle =
          w === 0
            ? currentTheme.primary + Math.round(waveAlpha * 255).toString(16).padStart(2, '0')
            : currentTheme.secondary + Math.round(waveAlpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // 3. Render Floating Embers, Sparks & Cinders
      const colors = currentTheme.emberColors;

      for (let i = 0; i < embers.length; i++) {
        const p = embers[i];
        p.life += 1;
        p.y -= p.speed;
        // Natural turbulence drift
        p.x += Math.sin(time * p.wobbleSpeed * 60 + p.seed) * p.wobbleAmp;

        const progress = p.life / p.maxLife;

        // Reset if reached end of life or floated off top
        if (progress >= 1 || p.y < -20) {
          embers[i] = spawnEmber();
          continue;
        }

        // Color transition: hot core (early life) to darker red/ash (end of life)
        const colIdx = Math.min(
          colors.length - 1,
          Math.floor(progress * colors.length)
        );
        const emberColor = colors[colIdx];

        // Opacity curves: fast fade in, steady burn, graceful fade out
        let alpha = 1;
        if (progress < 0.15) {
          alpha = progress / 0.15;
        } else {
          alpha = 1 - (progress - 0.15) / 0.85;
        }

        // Apply dark mode vs light mode brightness multiplier
        alpha *= isDark ? 0.95 : 0.75;

        const radius = Math.max(0.6, p.size * (1 - progress * 0.45));

        // Draw Ember Glow Halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = emberColor;
        ctx.globalAlpha = alpha * 0.35;
        ctx.fill();

        // Draw Ember White-Hot Spark Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = emberColor;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = emberColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeThemeId, isDark, currentTheme]);

  return (
    <>
      {/* Dynamic Animated Fire & Ember Canvas (fixed in background behind cards) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep ambient fire dark background gradient */}
        <div
          className={`absolute inset-0 transition-colors duration-700 ${
            isDark
              ? 'bg-gradient-to-b from-[#06080e] via-[#090b14] to-[#120806]'
              : 'bg-gradient-to-b from-slate-50 via-orange-50/20 to-amber-100/30'
          }`}
        />

        {/* Ambient Fire Flare Orbs */}
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-[1200px] h-[450px] rounded-full bg-gradient-to-t from-orange-600/25 via-red-600/15 to-transparent blur-[110px] pointer-events-none" />
        <div className="absolute bottom-10 -left-20 w-[45vw] h-[350px] rounded-full bg-gradient-to-t from-red-600/20 to-transparent blur-[90px] pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-[45vw] h-[350px] rounded-full bg-gradient-to-t from-amber-500/20 to-transparent blur-[90px] pointer-events-none" />

        {/* HTML5 Canvas Fire & Sparks */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Floating Fire Theme Control Switcher */}
      <div className="fixed bottom-5 left-5 z-40">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-slate-900/90 px-3.5 py-2.5 text-xs font-bold text-white shadow-xl shadow-orange-600/20 backdrop-blur-xl transition-all hover:scale-105 hover:border-orange-500/60 hover:shadow-orange-600/35 active:scale-95"
            title="Switch animated fire effect"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-sm shadow-orange-500/40">
              <Flame className="h-3.5 w-3.5 animate-pulse" />
            </div>
            <span className="font-bold tracking-tight text-slate-100">
              Fire Effect:
            </span>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              {currentTheme.name}
            </span>
            <Sparkles className="h-3 w-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          </button>

          {/* Fire Effect Selection Flyout */}
          {menuOpen && (
            <div className="absolute bottom-14 left-0 w-80 overflow-hidden rounded-2xl border border-orange-500/40 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-2xl ring-1 ring-orange-500/20 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5 text-xs font-bold text-white">
                <span className="flex items-center gap-2 text-orange-400">
                  <Flame className="h-4 w-4" />
                  <span>Animated Fire Themes</span>
                </span>
                <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-orange-300">
                  GPU 60 FPS
                </span>
              </div>

              <div className="mt-1.5 space-y-1">
                {FIRE_THEMES.map((theme) => {
                  const active = activeThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => selectTheme(theme.id)}
                      className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs transition ${
                        active
                          ? 'bg-gradient-to-r from-orange-500/25 to-red-600/20 border border-orange-500/40 font-bold text-orange-200'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${theme.accent} shadow-sm shadow-orange-500/50`}
                          />
                          <span className="font-bold text-white">{theme.name}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400 leading-tight">
                          {theme.desc}
                        </p>
                      </div>
                      {active && (
                        <Check className="h-4 w-4 shrink-0 text-orange-400" />
                      )}
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
