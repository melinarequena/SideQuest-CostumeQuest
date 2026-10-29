"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, RotateCcw, SkipForward, Star } from "lucide-react";
import type { Dashboard, RankedCostume } from "@/lib/admin-types";
import { costumeImageUrl, placeLabel, previouslyRevealed, revealSteps } from "@/lib/podium";
import { OwnerPodium } from "./owner-podium";
import { PodiumConfetti } from "./podium-confetti";

function RevealPhoto({ entry }: { entry: RankedCostume }) {
  const [broken, setBroken] = useState(false);
  return <div className="reveal-photo">{broken ? <div className="reveal-photo-fallback">{entry.name}</div> : <img src={costumeImageUrl(entry.photoPath)} alt={`Disfraz de ${entry.name}`} onError={() => setBroken(true)} />}</div>;
}

export function OwnerResults({ dashboard }: { dashboard: Dashboard }) {
  // Never replace the announced winners with a later polling response.
  const [results] = useState(() => structuredClone(dashboard));
  const steps = useMemo(() => revealSteps(results.ranking), [results]);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const reduceMotion = useReducedMotion();
  const finalTitle = useRef<HTMLHeadingElement>(null);
  const advancing = useRef(false);
  const step = steps[index];
  const finished = Boolean(reduceMotion) || index >= steps.length;
  const previousWinners = previouslyRevealed(steps, index);
  const firstReveal = steps.findIndex((item) => item.place === 1 && item.phase === "reveal");
  const celebrating = !reduceMotion && firstReveal >= 0 && index >= firstReveal;

  useEffect(() => {
    const paths = new Set(steps.flatMap((item) => item.entries.map((entry) => entry.photoPath)));
    for (const path of paths) { const image = new Image(); image.src = costumeImageUrl(path); }
  }, [steps]);

  useEffect(() => {
    if (!step || step.phase !== "suspense" || reduceMotion) return;
    let remaining = step.duration;
    let started = 0;
    let timer: number | undefined;
    const schedule = () => {
      started = performance.now();
      timer = window.setTimeout(() => setIndex((value) => value + 1), remaining);
    };
    const visibility = () => {
      if (document.hidden) {
        if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; remaining = Math.max(0, remaining - (performance.now() - started)); }
      } else if (timer === undefined) schedule();
    };
    if (!document.hidden) schedule();
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [step, reduceMotion, run]);

  useEffect(() => { if (step?.phase === "reveal") advancing.current = false; }, [step]);

  useEffect(() => {
    if (finished) finalTitle.current?.focus({ preventScroll: true });
  }, [finished]);

  function replay() { advancing.current = false; setIndex(0); setRun((value) => value + 1); }
  function advance() {
    if (advancing.current || step?.phase !== "reveal") return;
    advancing.current = true;
    setIndex((value) => value + 1);
  }

  if (!steps.length) return <section className="reveal-empty"><h1>TODAVÍA <span className="red">NO HAY PODIO.</span></h1><p>Los ganadores aparecen con los primeros votos.</p><Link className="button button-red" href="/nacho/podio">Volver al podio</Link></section>;

  return <section className={`reveal-experience ${finished ? "is-finished" : ""}`} aria-label="Presentación de ganadores">
    <div className="reveal-toolbar"><Link href="/nacho/podio" className="text-button"><ArrowLeft size={16} /> Volver al podio</Link>{!finished && <button className="text-button" onClick={() => setIndex(steps.length)}>Saltar presentación <SkipForward size={15} /></button>}</div>
    {celebrating && <PodiumConfetti key={run} />}
    <p className="reveal-announcement" role="status" aria-live="polite">{finished ? "Podio completo." : step.phase === "suspense" ? `A continuación: ${placeLabel(step.place).toLowerCase()}.` : `${placeLabel(step.place)}: ${step.entries.map((entry) => entry.name).join(", ")}.`}</p>
    <div className={`reveal-layout ${!finished && previousWinners.length ? "has-history" : ""}`}>
    <AnimatePresence mode="wait">
      {finished ? <motion.div key={`final-${run}`} initial={{ opacity: reduceMotion ? 1 : 0 }} animate={{ opacity: 1 }} onAnimationComplete={() => finalTitle.current?.focus({ preventScroll: true })} className="reveal-final">
        <span className="owner-eyebrow">SIDEQUEST · COSTUME QUEST</span>
        <h1 ref={finalTitle} tabIndex={-1}><span className="red">GANADORES.</span></h1>
        {results.votingEnabled && <p className="reveal-provisional">Resultados provisorios al iniciar la presentación.</p>}
        <OwnerPodium dashboard={results} presentation />
        <div className="reveal-final-actions">{!reduceMotion && <button className="button button-red" onClick={replay}><RotateCcw size={17} /> Repetir presentación</button>}<Link className="text-button" href="/nacho">Volver al portal</Link></div>
      </motion.div> : <motion.div key={`${run}-${index}`} className={`reveal-stage ${step.phase === "suspense" ? "is-suspense" : "is-revealed"} ${step.place === 1 ? "is-winner" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .22 }}>
        <div className="reveal-aura" aria-hidden="true" />
        {step.phase === "suspense" ? <div className="reveal-suspense" aria-hidden="true"><span className="reveal-place-caption">{placeLabel(step.place)}</span><motion.div className="reveal-count" initial={{ scale: .88, filter: "blur(18px)" }} animate={{ scale: 1.05, filter: "blur(0px)" }} transition={{ duration: step.duration / 1000, ease: "easeOut" }}>{step.place}<span>°</span></motion.div><div className="reveal-progress"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: step.duration / 1000, ease: "linear" }} /></div></div> : <div className="reveal-winners">
          <div className="reveal-place-caption">{step.place === 1 ? step.entries.length > 1 ? "PRIMER PUESTO · EMPATE" : "PRIMER PUESTO" : `${placeLabel(step.place)}${step.entries.length > 1 ? " · EMPATE" : ""}`}</div>
          <div className={`reveal-entries ${step.entries.length > 1 ? "has-ties" : ""}`}>{step.entries.map((entry) => <motion.article key={entry.id} className="reveal-contestant" initial={{ y: 25, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: .55, ease: [.22, 1, .36, 1] }}>
            <RevealPhoto entry={entry} /><div className="reveal-contestant-info"><span className="reveal-contestant-place" aria-hidden="true">{step.place}°</span><h2>{entry.name}</h2><strong><Star size={22} fill="currentColor" /> {entry.totalStars} estrellas</strong><span>{entry.votes} {entry.votes === 1 ? "voto" : "votos"}</span></div>
          </motion.article>)}</div>
          <div className="reveal-next-action"><button className="button button-red" onClick={advance}>{steps[index + 1] ? `Revelar ${placeLabel(steps[index + 1].place).toLowerCase()}` : "Ver podio completo"}</button></div>
        </div>}
      </motion.div>}
    </AnimatePresence>
    {!finished && previousWinners.length > 0 && <aside className="reveal-history" aria-label="Puestos ya revelados">
      <span className="reveal-history-title">YA REVELADOS</span>
      <div className="reveal-history-entries">{previousWinners.map((group) => group.entries.map((entry) => <motion.article key={entry.id} className="reveal-history-card" initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .35 }}>
        <RevealPhoto entry={entry} />
        <div className="reveal-history-info"><span className="reveal-history-place">{group.place}° <span>{group.entries.length > 1 ? "· Empate" : "puesto"}</span></span><h2>{entry.name}</h2><strong><Star size={12} fill="currentColor" /> {entry.totalStars} <span>estrellas</span></strong></div>
      </motion.article>))}</div>
    </aside>}
    </div>
  </section>;
}
