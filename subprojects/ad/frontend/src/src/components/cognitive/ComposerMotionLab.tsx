'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Bot, Mic, Paperclip, Sparkles, WandSparkles } from 'lucide-react';

type ComposerVariant = {
  id: string;
  name: string;
  kicker: string;
  summary: string;
  sample: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  panel: string;
  panelEdge: string;
  panelGlow: string;
  text: string;
  muted: string;
  chipBg: string;
  chipBorder: string;
  layout: 'wide' | 'rail' | 'mono';
  tags: string[];
};

type GridNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

const VARIANTS: ComposerVariant[] = [
  {
    id: 'glass-flow',
    name: '静奢玻璃',
    kicker: '轻盈、干净、克制',
    summary: '把输入区做成悬浮在内容上的玻璃层，适合高频对话和连续追问。',
    sample: '帮我把今天的投放异常按媒体和计划拆开分析一下。',
    accent: '#2E75FE',
    accentSoft: 'rgba(46, 117, 254, 0.10)',
    accentGlow: 'rgba(214, 225, 255, 0.92)',
    panel: 'rgba(255,255,255,0.82)',
    panelEdge: 'rgba(255,255,255,0.46)',
    panelGlow: 'rgba(46,117,254,0.14)',
    text: '#10233f',
    muted: '#6B7C93',
    chipBg: 'rgba(255,255,255,0.64)',
    chipBorder: 'rgba(46,117,254,0.14)',
    layout: 'wide',
    tags: ['附件', '追问', '回车发送'],
  },
  {
    id: 'signal-rail',
    name: '光轨停靠',
    kicker: '更像一条信号轨道',
    summary: '把发送动作压成一条右侧轨道，强调连续输入、语音切换和快速发送。',
    sample: '把这周的结果整理成可以直接发给业务方的摘要。',
    accent: '#4F7CFF',
    accentSoft: 'rgba(79, 124, 255, 0.10)',
    accentGlow: 'rgba(174, 193, 255, 0.88)',
    panel: 'rgba(10,18,32,0.82)',
    panelEdge: 'rgba(133,160,255,0.20)',
    panelGlow: 'rgba(79,124,255,0.16)',
    text: '#F5F7FB',
    muted: 'rgba(226,232,240,0.72)',
    chipBg: 'rgba(255,255,255,0.06)',
    chipBorder: 'rgba(133,160,255,0.16)',
    layout: 'rail',
    tags: ['语音', '短句', '连续输入'],
  },
  {
    id: 'mono-capsule',
    name: '深舱胶囊',
    kicker: '更紧凑，更像专业工具',
    summary: '压缩上下留白，把输入、附件、发送收束到一个更利落的胶囊里。',
    sample: '生成一版更适合业务审阅的标题和首段。',
    accent: '#1F7AFF',
    accentSoft: 'rgba(31, 122, 255, 0.10)',
    accentGlow: 'rgba(209, 224, 255, 0.9)',
    panel: 'rgba(255,255,255,0.88)',
    panelEdge: 'rgba(31,122,255,0.16)',
    panelGlow: 'rgba(31,122,255,0.14)',
    text: '#0F172A',
    muted: '#64748B',
    chipBg: 'rgba(255,255,255,0.76)',
    chipBorder: 'rgba(31,122,255,0.14)',
    layout: 'mono',
    tags: ['模板', '附件', '快捷短语'],
  },
];

function PremiumBackdrop({ accent }: { accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let width = 0;
    let height = 0;
    let frame = 0;
    const nodes: GridNode[] = Array.from({ length: 28 }).map((_, index) => ({
      x: (index % 7) / 6,
      y: Math.floor(index / 7) / 3,
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00012,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, 'rgba(7, 12, 22, 0.96)');
      background.addColorStop(0.45, 'rgba(8, 16, 30, 0.98)');
      background.addColorStop(1, 'rgba(7, 11, 20, 0.98)');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const gridGap = 36;
      ctx.save();
      ctx.globalAlpha = 0.24;
      for (let x = 0; x <= width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x + (time * 0.01) % gridGap, 0);
        ctx.lineTo(x + (time * 0.01) % gridGap, height);
        ctx.strokeStyle = 'rgba(255,255,255,0.035)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y + (time * 0.008) % gridGap);
        ctx.lineTo(width, y + (time * 0.008) % gridGap);
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const beam = ctx.createLinearGradient(width * -0.2, height * 0.12, width * 1.1, height * 0.88);
      beam.addColorStop(0, 'rgba(255,255,255,0)');
      beam.addColorStop(0.48, `${accent}24`);
      beam.addColorStop(0.5, 'rgba(255,255,255,0.06)');
      beam.addColorStop(0.52, `${accent}1C`);
      beam.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = beam;
      ctx.translate((time * 0.028) % (width * 1.3) - width * 0.2, 0);
      ctx.fillRect(0, height * 0.06, width * 0.34, height * 0.86);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      nodes.forEach((node, index) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -0.05) node.x = 1.05;
        if (node.x > 1.05) node.x = -0.05;
        if (node.y < -0.05) node.y = 1.05;
        if (node.y > 1.05) node.y = -0.05;

        const px = node.x * width;
        const py = node.y * height;
        const pulse = 0.55 + Math.sin(time / 1400 + node.phase) * 0.15;

        if (index % 7 !== 6) {
          const right = nodes[index + 1];
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(right.x * width, right.y * height);
          ctx.strokeStyle = `rgba(255,255,255,${0.03 + pulse * 0.04})`;
          ctx.stroke();
        }
        if (index < nodes.length - 7) {
          const down = nodes[index + 7];
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(down.x * width, down.y * height);
          ctx.strokeStyle = `rgba(255,255,255,${0.025 + pulse * 0.035})`;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(px, py, 1.1 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.10 + pulse * 0.10})`;
        ctx.fill();
      });
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(0, height * 0.73, width, 1);
      ctx.restore();

      if (!prefersReducedMotion) {
        frame = window.requestAnimationFrame(paint);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement as Element);

    if (prefersReducedMotion) {
      paint(0);
    } else {
      frame = window.requestAnimationFrame(paint);
    }

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [accent, prefersReducedMotion]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function VariantBadge({ children, active, tone = 'default' }: { children: React.ReactNode; active?: boolean; tone?: 'default' | 'muted' }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
      style={{
        background: active ? 'rgba(255,255,255,0.10)' : tone === 'muted' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.82)',
      }}
    >
      {children}
    </span>
  );
}

function ComposerCard({ variant, active, onClick }: { variant: ComposerVariant; active: boolean; onClick: () => void }) {
  const isDark = variant.layout === 'rail';

  return (
    <motion.section
      layout
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-[30px] border cursor-pointer"
      style={{
        borderColor: active ? variant.accent : variant.panelEdge,
        background: variant.panel,
        boxShadow: active ? `0 28px 72px rgba(0, 0, 0, 0.34), 0 0 0 1px ${variant.panelGlow}` : '0 20px 50px rgba(0, 0, 0, 0.22)',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <PremiumBackdrop accent={variant.accent} />
      </div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        <motion.div
          className="absolute left-[-32%] top-0 h-full w-[32%]"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)`,
            filter: 'blur(2px)',
          }}
          animate={{ x: ['0%', '420%'] }}
          transition={{ duration: 5.8, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      <div className="relative z-10 flex h-full min-h-[440px] flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <VariantBadge active>{variant.kicker}</VariantBadge>
            <h3
              className="mt-3 text-[21px] font-semibold tracking-tight"
              style={{ color: isDark ? '#F8FAFC' : variant.text }}
            >
              {variant.name}
            </h3>
            <p
              className="mt-2 max-w-[30rem] text-[13px] leading-6"
              style={{ color: isDark ? 'rgba(226,232,240,0.78)' : variant.muted }}
            >
              {variant.summary}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <VariantBadge tone="muted">
              <WandSparkles size={12} className="mr-1" />
              Motion
            </VariantBadge>
            <VariantBadge tone="muted">
              <Sparkles size={12} className="mr-1" />
              Canvas
            </VariantBadge>
          </div>
        </div>

        <div
          className="mt-5 rounded-[28px] p-4 backdrop-blur-2xl"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.42)',
            border: `1px solid ${variant.panelEdge}`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {variant.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: variant.chipBg,
                  border: `1px solid ${variant.chipBorder}`,
                  color: isDark ? 'rgba(248,250,252,0.82)' : variant.text,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div
            className="mt-4 rounded-[24px] p-4"
            style={{
              background: isDark ? 'rgba(8,15,28,0.82)' : 'rgba(255,255,255,0.82)',
              border: `1px solid ${variant.panelEdge}`,
            }}
          >
            {variant.layout === 'wide' && (
              <div className="flex items-end gap-3">
                <IconButton accent={variant.accent} tone="soft" icon={<Paperclip size={16} />} />
                <ComposerBody variant={variant} />
                <div className="flex items-center gap-2">
                  <IconButton accent={variant.accent} tone="soft" icon={<Mic size={15} />} />
                  <SendButton accent={variant.accent} soft={variant.accentSoft} />
                </div>
              </div>
            )}

            {variant.layout === 'rail' && (
              <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                <ComposerBody variant={variant} compact />
                <div className="flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <IconButton accent={variant.accent} tone="dark" icon={<Paperclip size={16} />} />
                    <IconButton accent={variant.accent} tone="dark" icon={<Mic size={15} />} />
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-3 text-[12px] leading-6 text-white/[0.74]">
                    右侧轨道聚焦发送动作，适合连续追问和高频确认。
                  </div>
                  <SendButton accent={variant.accent} soft={variant.accentSoft} />
                </div>
              </div>
            )}

            {variant.layout === 'mono' && (
              <div className="flex flex-col gap-3">
                <ComposerBody variant={variant} compact />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <IconButton accent={variant.accent} tone="soft" icon={<Paperclip size={16} />} />
                    <IconButton accent={variant.accent} tone="soft" icon={<Mic size={15} />} />
                  </div>
                  <SendButton accent={variant.accent} soft={variant.accentSoft} />
                </div>
              </div>
            )}
          </div>

          {active && (
            <div
              className="mt-3 rounded-[20px] px-4 py-3 text-[12px] leading-6"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(46,117,254,0.05)',
                color: isDark ? 'rgba(226,232,240,0.72)' : variant.muted,
              }}
            >
              激活态会收紧层次，聚焦输入、附件、发送三个动作位。你可以直接看这个版本的手感是否更像高端产品，而不是炫技页面。
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function ComposerBody({ variant, compact }: { variant: ComposerVariant; compact?: boolean }) {
  const isDark = variant.layout === 'rail';

  return (
    <div className={compact ? 'min-w-0 flex-1' : 'min-w-0 flex-1'}>
      <div
        className="rounded-[22px] border px-4 py-3"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.88)',
          borderColor: variant.accent,
          boxShadow: compact ? 'none' : `0 0 0 4px ${variant.accentSoft}`,
        }}
      >
        <div
          className="text-[13px] leading-6"
          style={{
            color: isDark ? 'rgba(248,250,252,0.82)' : variant.text,
          }}
        >
          {variant.sample}
        </div>
        <div
          className="mt-2 text-[11px]"
          style={{
            color: isDark ? 'rgba(226,232,240,0.52)' : variant.muted,
          }}
        >
          支持附件、追问、语音和快捷发送，视觉层次更克制。
        </div>
      </div>
    </div>
  );
}

function IconButton({
  icon,
  accent,
  tone,
}: {
  icon: React.ReactNode;
  accent: string;
  tone: 'soft' | 'dark';
}) {
  const dark = tone === 'dark';

  return (
    <button
      type="button"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5"
      style={{
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${dark ? 'rgba(133,160,255,0.18)' : 'rgba(46,117,254,0.14)'}`,
        color: accent,
        boxShadow: dark ? 'none' : `0 10px 22px ${accent}1F`,
      }}
    >
      {icon}
    </button>
  );
}

function SendButton({ accent, soft }: { accent: string; soft: string }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex h-12 w-12 items-center justify-center rounded-full"
      style={{
        background: accent,
        color: '#fff',
        boxShadow: `0 12px 28px ${accent}44, 0 0 0 5px ${soft}`,
      }}
    >
      <ArrowUp size={17} />
    </motion.button>
  );
}

export default function ComposerMotionLab() {
  const [activeId, setActiveId] = useState(VARIANTS[0].id);
  const activeVariant = useMemo(() => VARIANTS.find((item) => item.id === activeId) || VARIANTS[0], [activeId]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050816_0%,#050a13_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1640px] flex-col px-5 py-5 lg:px-8">
        <header
          className="flex flex-col gap-4 rounded-[30px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-2xl lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[12px] text-white/[0.78]">
              <WandSparkles size={13} />
              对话输入视觉实验
            </div>
            <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
              看几个更高级、更克制的输入框方案
            </h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/[0.68]">
              这页只做风格预览，不接真实逻辑。重点看玻璃层次、发送动作、附件位置、以及整体的高级感是否成立。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {VARIANTS.map((variant) => {
              const isActive = variant.id === activeId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setActiveId(variant.id)}
                  className="rounded-full px-4 py-2 text-[12px] font-medium transition-all"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)'}`,
                    color: '#fff',
                  }}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </header>

        <section className="mt-5 grid flex-1 gap-5 xl:grid-cols-12">
          {VARIANTS.map((variant) => {
            const isActive = variant.id === activeId;
            return (
              <motion.div
                key={variant.id}
                layout
                className={isActive ? 'xl:col-span-6' : 'xl:col-span-3'}
              >
                <ComposerCard
                  variant={variant}
                  active={isActive}
                  onClick={() => setActiveId(variant.id)}
                />
              </motion.div>
            );
          })}
        </section>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-[12px] text-white/[0.60] backdrop-blur-xl">
          <div className="inline-flex items-center gap-2">
            <Bot size={14} />
            当前聚焦：{activeVariant.name}
          </div>
          <div className="inline-flex items-center gap-2">
            <Sparkles size={14} />
            目标是“高端、专业、克制”，不是炫技
          </div>
        </footer>
      </div>
    </main>
  );
}
