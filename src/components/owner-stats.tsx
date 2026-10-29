"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Dashboard } from "@/lib/admin-types";

function Total({ value, animated }: { value: number; animated: boolean }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(animated ? 0 : value);
  const current = useRef(display);
  useEffect(() => {
    if (!animated || reduceMotion) { current.current = value; setDisplay(value); return; }
    const from = current.current;
    const started = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min(1, (now - started) / 850);
      current.current = Math.round(from + (value - from) * (1 - (1 - progress) ** 3));
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value, animated, reduceMotion]);
  return <strong aria-label={String(value)}>{display.toLocaleString("es-AR")}</strong>;
}

export function OwnerStats({ dashboard, animated = false }: { dashboard: Dashboard; animated?: boolean }) {
  return <div className="owner-stats" aria-label="Totales del concurso">
    <div><Total value={dashboard.participants} animated={animated} /><span>Disfraces</span></div>
    <div><Total value={dashboard.votes} animated={animated} /><span>Votos</span></div>
    <div><Total value={dashboard.totalStars} animated={animated} /><span>Estrellas</span></div>
  </div>;
}
