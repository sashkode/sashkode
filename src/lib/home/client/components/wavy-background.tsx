'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { createNoise3D } from 'simplex-noise';

import { cn } from '~/lib/design-system/shared/utils';

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = 'fast',
  waveOpacity = 0.5,
  ...props
}: {
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: 'slow' | 'fast';
  waveOpacity?: number;
  [key: string]: unknown;
}) => {
  const noise = createNoise3D();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(undefined);
  const ntRef = useRef(0);

  const getSpeed = () => {
    switch (speed) {
      case 'slow':
        return 0.001;
      case 'fast':
        return 0.002;
      default:
        return 0.001;
    }
  };

  const init = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    let w = ctx.canvas.width;
    let h = ctx.canvas.height;

    ctx.filter = `blur(${blur}px)`;
    ntRef.current = 0;

    const waveColors = colors ?? ['#ff6b7a', '#f8fef4', '#bde8ec', '#6fa3c9', '#4a7ba7'];

    const drawWave = (n: number) => {
      ntRef.current += getSpeed();
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth || 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (let x = 0; x < w; x += 5) {
          const y = noise(x / 800, 0.3 * i, ntRef.current) * 100;
          ctx.lineTo(x, y + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background') || 'black';
      ctx.globalAlpha = waveOpacity || 0.5;
      ctx.fillRect(0, 0, w, h);
      drawWave(5);
      animationIdRef.current = requestAnimationFrame(render);
    };

    window.onresize = () => {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
    };

    render();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: depends on props that shouldn't trigger re-initialization
  useEffect(() => {
    init();
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(typeof window !== 'undefined' && navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'));
  }, []);

  return (
    <div className={cn(containerClassName)}>
      <canvas className="-z-1 fade-in absolute inset-0 animate-in duration-5000" ref={canvasRef} id="canvas" style={isSafari ? { filter: `blur(${blur}px)` } : {}} />
      <div className={cn('relative', className)} {...props}>
        {children}
      </div>
    </div>
  );
};
