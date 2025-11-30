"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { createNoise3D } from "simplex-noise";

import { cn } from "~/ui/shared/utils";

const WAVE_COLORS = ["#ff6b7a", "#f8fef4", "#bde8ec", "#6fa3c9", "#4a7ba7"];
const WAVE_COUNT = 5;
const WAVE_WIDTH = 30;
const BLUR = 10;
const SPEED = 0.002;
const WAVE_OPACITY = 0.5;

export function WavyBackground({ children, className }: { children?: ReactNode; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    setIsSafari(navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome"));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const noise = createNoise3D();
    let animationId: number;
    let nt = 0;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.filter = `blur(${BLUR}px)`;
    };

    const drawWave = (w: number, h: number) => {
      nt += SPEED;
      for (let i = 0; i < WAVE_COUNT; i++) {
        ctx.beginPath();
        ctx.lineWidth = WAVE_WIDTH;
        ctx.strokeStyle = WAVE_COLORS[i % WAVE_COLORS.length] as string;
        ctx.lineCap = "round";
        for (let x = 0; x < w; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x, y + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--background") || "black";
      ctx.globalAlpha = WAVE_OPACITY;
      ctx.fillRect(0, 0, w, h);
      drawWave(w, h);
      animationId = requestAnimationFrame(render);
    };

    updateCanvasSize();
    render();

    const handleResize = () => updateCanvasSize();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div>
      <div className="fade-in -z-1 absolute inset-0 animate-in duration-5000">
        <canvas className="absolute inset-0" ref={canvasRef} style={isSafari ? { filter: `blur(${BLUR}px)` } : {}} />
      </div>
      <div className={cn("relative", className)}>{children}</div>
    </div>
  );
}
