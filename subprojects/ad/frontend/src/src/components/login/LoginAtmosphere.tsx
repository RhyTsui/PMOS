'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hueShift: number;
};

function createParticles(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const originX = width * (0.2 + Math.random() * 0.7);
    const originY = height * (0.18 + Math.random() * 0.64);
    const speed = 0.12 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;

    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed * (0.45 + Math.random()),
      vy: Math.sin(angle) * speed * (0.45 + Math.random()),
      radius: 0.9 + Math.random() * 1.9,
      alpha: 0.18 + Math.random() * 0.6,
      hueShift: (index % 6) / 6,
    };
  });
}

export function LoginAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frameId = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let time = 0;

    const resize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

      width = nextWidth;
      height = nextHeight;

      canvas.width = Math.floor(nextWidth * nextDpr);
      canvas.height = Math.floor(nextHeight * nextDpr);
      canvas.style.width = `${nextWidth}px`;
      canvas.style.height = `${nextHeight}px`;
      context.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
      particles = createParticles(nextWidth, nextHeight, nextWidth < 900 ? 36 : 60);
    };

    const drawGlow = (x: number, y: number, radius: number, color: string, alpha = 1) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color.replace('ALPHA', String(alpha)));
      gradient.addColorStop(1, color.replace('ALPHA', '0'));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };

    const drawBeams = () => {
      const beams = [
        { x: width * 0.12, y: height * 0.18, radius: Math.max(width * 0.34, 360), color: 'rgba(46, 117, 254, ALPHA)' },
        { x: width * 0.78, y: height * 0.26, radius: Math.max(width * 0.28, 320), color: 'rgba(123, 92, 255, ALPHA)' },
        { x: width * 0.58, y: height * 0.82, radius: Math.max(width * 0.32, 360), color: 'rgba(76, 194, 255, ALPHA)' },
      ];

      beams.forEach((beam, index) => {
        const offset = Math.sin(time * 0.0004 + index * 1.7) * 28;
        drawGlow(beam.x + offset, beam.y, beam.radius, beam.color, 0.18);
      });
    };

    const drawRibbon = () => {
      const sweep = Math.sin(time * 0.00055) * 0.5 + 0.5;
      const y = height * (0.2 + sweep * 0.5);
      const gradient = context.createLinearGradient(0, y - 120, width, y + 120);
      gradient.addColorStop(0, 'rgba(46, 117, 254, 0)');
      gradient.addColorStop(0.22, 'rgba(46, 117, 254, 0.08)');
      gradient.addColorStop(0.5, 'rgba(135, 189, 255, 0.22)');
      gradient.addColorStop(0.78, 'rgba(46, 117, 254, 0.08)');
      gradient.addColorStop(1, 'rgba(46, 117, 254, 0)');

      context.save();
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = gradient;
      context.lineWidth = 10;
      context.lineCap = 'round';
      context.beginPath();
      const amplitude = Math.min(height * 0.08, 72);
      context.moveTo(width * -0.05, y);
      context.bezierCurveTo(width * 0.24, y - amplitude, width * 0.58, y + amplitude, width * 1.06, y - amplitude * 0.18);
      context.stroke();
      context.restore();
    };

    const drawParticles = () => {
      context.save();
      context.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -32) p.x = width + 32;
        if (p.x > width + 32) p.x = -32;
        if (p.y < -32) p.y = height + 32;
        if (p.y > height + 32) p.y = -32;

        const pulse = 0.7 + Math.sin(time * 0.0011 + i * 0.72) * 0.25;
        const fill = `rgba(${Math.round(120 + p.hueShift * 60)}, ${Math.round(178 + p.hueShift * 30)}, 255, ${p.alpha * pulse})`;
        context.fillStyle = fill;
        context.beginPath();
        context.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
        context.fill();
      }

      for (let i = 0; i < particles.length; i += 1) {
        const current = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const target = particles[j];
          const dx = current.x - target.x;
          const dy = current.y - target.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = width < 900 ? 118 : 152;

          if (distance >= maxDistance) continue;

          const opacity = ((1 - distance / maxDistance) * 0.22);
          context.strokeStyle = `rgba(125, 184, 255, ${opacity})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(current.x, current.y);
          context.lineTo(target.x, target.y);
          context.stroke();
        }
      }

      context.restore();
    };

    const render = () => {
      time += 1;
      context.clearRect(0, 0, width, height);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, 'rgba(6, 12, 24, 0.98)');
      background.addColorStop(0.55, 'rgba(11, 20, 40, 0.96)');
      background.addColorStop(1, 'rgba(8, 15, 28, 0.98)');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      drawGlow(width * 0.18, height * 0.22, Math.max(width * 0.28, 280), 'rgba(46, 117, 254, ALPHA)', 0.22);
      drawGlow(width * 0.84, height * 0.22, Math.max(width * 0.24, 240), 'rgba(137, 103, 255, ALPHA)', 0.18);
      drawGlow(width * 0.62, height * 0.84, Math.max(width * 0.3, 320), 'rgba(70, 199, 255, ALPHA)', 0.16);

      drawBeams();
      drawRibbon();
      drawParticles();

      if (!reduceMotion) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    resize();

    if (reduceMotion) {
      render();
      return undefined;
    }

    frameId = window.requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(frameId);
    };
  }, [reduceMotion]);

  return (
    <div className="login-atmosphere" aria-hidden="true">
      <motion.div
        className="login-atmosphere-rail login-atmosphere-rail-a"
        animate={{ x: [0, 36, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 9.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="login-atmosphere-rail login-atmosphere-rail-b"
        animate={{ x: [0, -28, 0], opacity: [0.38, 0.78, 0.38] }}
        transition={{ duration: 11.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="login-atmosphere-rail login-atmosphere-rail-c"
        animate={{ y: [0, 22, 0], opacity: [0.3, 0.72, 0.3] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
      <canvas ref={canvasRef} className="login-atmosphere-canvas" />
    </div>
  );
}
