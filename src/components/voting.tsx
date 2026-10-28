"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowRight, Ghost, Star } from "lucide-react";
import type { Costume } from "@/lib/types";

function CostumeCard({ entry, onSkip, disabled }: { entry: Costume; onSkip: () => void; disabled: boolean }) {
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const rotate = useTransform(x, [-220, 220], reduceMotion ? [0, 0] : [-3, 3]);
  const skipOpacity = useTransform(x, [-120, -35, 35, 120], [1, 0, 0, 1]);
  const [broken, setBroken] = useState(false);
  return <motion.div className="costume-card" style={{ x, rotate, touchAction: "pan-y" }} drag={disabled ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7}
    onDragEnd={(_, info) => { if (!disabled && (Math.abs(info.offset.x) > 95 || Math.abs(info.velocity.x) > 650)) onSkip(); }}>
    {broken ? <div className="photo-fallback"><Ghost size={70} /><span>No pudimos cargar esta foto</span></div> : <img src={entry.photoUrl} alt={`Disfraz de ${entry.name}${entry.costume ? `: ${entry.costume}` : ""}`} draggable={false} onError={() => setBroken(true)} />}
    <motion.span className="skip-stamp" style={{ opacity: skipOpacity }}>OMITIR</motion.span>
    <div className="costume-caption"><h3>{entry.name}</h3>{entry.costume && <p>{entry.costume}</p>}</div>
  </motion.div>;
}

export function Voting({ entries, hasPhotos, onUpload, onVote, onDone }: { entries: Costume[]; hasPhotos: boolean; onUpload: () => void; onVote: (id: string, stars: number) => Promise<void>; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const moving = useRef(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const entry = entries[index];
  const blocked = busy || changing;
  const reduceMotion = useReducedMotion();

  function advance() {
    setStars(0); setHover(0); setError("");
    if (index + 1 >= entries.length) onDone();
    else { moving.current = true; setChanging(true); setIndex((value) => value + 1); }
  }
  function skip() { if (!locked.current && !moving.current) advance(); }
  async function vote(rating: number) {
    if (locked.current || moving.current || !entry) return;
    locked.current = true; setBusy(true); setStars(rating); setError("");
    try { await onVote(entry.id, rating); advance(); }
    catch (err) { setError(err instanceof Error ? err.message : "No pudimos guardar tu voto. Volvé a intentar."); }
    finally { locked.current = false; setBusy(false); }
  }

  if (!entry && !hasPhotos) return <div className="empty-state first-photo-state">
    <p>Nadie subio una foto aun, que esperas para ser el primero?</p>
    <button className="button button-red home-cta" onClick={onUpload}>Subir foto</button>
  </div>;

  if (!entry) return <div className="empty-state"><h2>Estás al día.</h2><p>No hay disfraces pendientes. Volvé más tarde para ver quién se suma.</p><button className="button button-red" onClick={onDone}>Continuar <ArrowRight size={18} /></button></div>;

  return <div className="voting-panel">
    <div className="voting-heading"><span>Disfraces</span><span className="queue-count">{index + 1} / {entries.length}</span></div>
    <div className="card-stack"><AnimatePresence mode="wait"><motion.div key={entry.id}
      variants={{ enter: { opacity: 0, y: reduceMotion ? 0 : 12 }, visible: { opacity: 1, y: 0 }, leave: { opacity: 0, x: reduceMotion ? 0 : -70 } }}
      initial="enter" animate="visible" exit="leave" transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onAnimationComplete={(definition) => { if (definition === "visible") { moving.current = false; setChanging(false); } }}>
      <CostumeCard entry={entry} onSkip={skip} disabled={blocked} /></motion.div></AnimatePresence></div>
    <fieldset className="star-field" disabled={blocked} aria-busy={busy}><legend>Tocá una estrella para votar</legend><div className="star-row" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map((number) => <button type="button" key={number} aria-label={`${number} ${number === 1 ? "estrella" : "estrellas"}`} aria-pressed={stars === number} onMouseEnter={() => setHover(number)} onFocus={() => setHover(number)} onBlur={() => setHover(0)} onClick={() => void vote(number)} className={number <= (hover || stars) ? "star active" : "star"}><Star size={34} strokeWidth={1.4} fill={number <= (hover || stars) ? "currentColor" : "none"} /></button>)}</div><span className="rating-description" aria-live="polite">{busy ? "Guardando voto…" : ""}</span></fieldset>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="voting-bottom"><button className="text-button" disabled={blocked} onClick={skip}>Omitir</button><button className="text-button" disabled={blocked} onClick={onDone}>Terminar de votar</button></div>
  </div>;
}
