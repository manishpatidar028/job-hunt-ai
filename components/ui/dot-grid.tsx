"use client";

import { useEffect, useRef } from "react";

export function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SPACING = 24;
    const DOT_RADIUS = 1;
    const DOT_COLOR = "#CBD5E1";
    const INFLUENCE = 90;
    const REPEL = 4;
    const SPRING = 0.08;
    const DAMPING = 0.72;
    const IDLE_THRESHOLD = 0.01;

    interface Dot {
      ox: number; oy: number;
      x: number;  y: number;
      vx: number; vy: number;
    }

    let dots: Dot[] = [];
    let mouse = { x: -9999, y: -9999 };
    let raf: number | null = null;
    let isAnimating = false;

    function build() {
      dots = [];
      const cols = Math.ceil(canvas!.width  / SPACING) + 1;
      const rows = Math.ceil(canvas!.height / SPACING) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING;
          const y = r * SPACING;
          dots.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
        }
      }
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const d of dots) {
        ctx!.beginPath();
        ctx!.arc(d.ox, d.oy, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fillStyle = DOT_COLOR;
        ctx!.fill();
      }
    }

    function resize() {
      canvas!.width  = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      build();
      drawStatic();
    }

    function stopAnimation() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      isAnimating = false;
    }

    function startAnimation() {
      if (isAnimating) return;
      isAnimating = true;
      raf = requestAnimationFrame(draw);
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      let anyActive = false;

      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < INFLUENCE && dist > 0) {
          const force = (1 - dist / INFLUENCE) * REPEL;
          d.vx += (dx / dist) * force;
          d.vy += (dy / dist) * force;
        }

        d.vx += (d.ox - d.x) * SPRING;
        d.vy += (d.oy - d.y) * SPRING;
        d.vx *= DAMPING;
        d.vy *= DAMPING;
        d.x += d.vx;
        d.y += d.vy;

        if (
          Math.abs(d.vx) > IDLE_THRESHOLD ||
          Math.abs(d.vy) > IDLE_THRESHOLD ||
          Math.abs(d.x - d.ox) > IDLE_THRESHOLD ||
          Math.abs(d.y - d.oy) > IDLE_THRESHOLD
        ) {
          anyActive = true;
        }

        ctx!.beginPath();
        ctx!.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fillStyle = DOT_COLOR;
        ctx!.fill();
      }

      if (anyActive || mouse.x !== -9999) {
        raf = requestAnimationFrame(draw);
      } else {
        stopAnimation();
        drawStatic();
      }
    }

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const parent = canvas.parentElement!;

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      startAnimation();
    };
    const onLeave = () => {
      mouse = { x: -9999, y: -9999 };
    };

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);

    return () => {
      stopAnimation();
      ro.disconnect();
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
