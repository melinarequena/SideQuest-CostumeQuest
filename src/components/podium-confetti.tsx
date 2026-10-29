"use client";

import { useEffect, useRef } from "react";

export function PodiumConfetti() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = width * ratio; element.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);
    const count = width < 700 ? 90 : 160;
    const pieces = Array.from({ length: count }, (_, index) => ({
      x: width * (index % 2 ? .17 : .83), y: height * .42,
      vx: (Math.random() - .5) * 620, vy: -250 - Math.random() * 500,
      rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 10,
      size: 4 + Math.random() * 6, delay: Math.random() * .45,
      color: ["#f81020", "#f4f1eb", "#ffffff"][index % 3],
    }));
    const started = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const elapsed = (now - started) / 1000;
      context.clearRect(0, 0, width, height);
      for (const piece of pieces) {
        const time = elapsed - piece.delay;
        if (time < 0) continue;
        const x = piece.x + piece.vx * (1 - Math.exp(-time * .65)) / .65;
        const y = piece.y + piece.vy * time + 160 * time * time;
        if (y > height + 30) continue;
        context.save(); context.globalAlpha = Math.max(0, Math.min(1, 5.5 - elapsed));
        context.translate(x, y); context.rotate(piece.rotation + piece.spin * time);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 2, piece.size * Math.cos(time * 5), piece.size * .6);
        context.restore();
      }
      if (elapsed < 5.5) frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); context.clearRect(0, 0, width, height); };
  }, []);
  return <canvas ref={canvas} className="podium-confetti" aria-hidden="true" />;
}
