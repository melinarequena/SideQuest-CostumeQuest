"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, QrCode, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { UploadForm } from "./upload-form";
import { UploadTransition, ZITRA_TRANSITION_IMAGE } from "./upload-transition";
import { Voting } from "./voting";
import { ShareDialog } from "./share-dialog";
import { VoteQuestion } from "./vote-question";
import { configured, demoMode } from "@/lib/supabase";
import { fetchCostumes, fetchState, submitParticipant, submitVote } from "@/lib/api";
import { demoCostumes, demoState, demoUpload, demoVote } from "@/lib/demo";
import type { Costume, Participation, Stage } from "@/lib/types";

export function QuestApp() {
  const [stage, setStage] = useState<Stage>("home");
  const [participant, setParticipant] = useState<Participation | null>(null);
  const [entries, setEntries] = useState<Costume[]>([]);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [votes, setVotes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [share, setShare] = useState(false);
  const [question, setQuestion] = useState(false);
  const [uploadCover, setUploadCover] = useState<"covering" | "leaving" | null>(null);
  const [voteProblem, setVoteProblem] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const [retry, setRetry] = useState(0);
  const transition = useRef(false);
  const main = useRef<HTMLElement>(null);
  const uploadEntered = useRef<(() => void) | null>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (stage === "upload") {
      const image = new Image();
      image.src = ZITRA_TRANSITION_IMAGE;
    }
  }, [stage]);

  useEffect(() => {
    if (!uploadCover && restoreFocus.current) {
      restoreFocus.current = false;
      main.current?.focus({ preventScroll: true });
    }
  }, [uploadCover]);

  useEffect(() => {
    let active = true;
    setReady(false); setError("");
    (async () => {
      if (!demoMode && !configured) throw new Error("Falta conectar Supabase. Configurá .env.local para abrir la inscripción.");
      const state = demoMode ? demoState() : await fetchState();
      if (active) { setParticipant(state.participant); setVotes(state.votes); }
    })().catch((err) => { if (active) setError(err instanceof Error ? err.message : "No pudimos conectar. Intentá de nuevo."); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [retry]);

  async function startVoting() {
    if (transition.current) return;
    transition.current = true;
    setBusy(true); setError(""); setVoteProblem(null); setEntries([]); setStage("voting");
    try {
      const state = demoMode ? demoState() : await fetchState();
      setParticipant(state.participant); setVotes(state.votes);
      const pending = demoMode ? demoCostumes() : await fetchCostumes();
      setEntries(pending);
      // Every existing costume is pending, belongs to this visitor, or has their vote.
      // Votes are deleted with their costume, so a current vote also proves a photo exists.
      setHasPhotos(pending.length > 0 || Boolean(state.participant) || state.votes > 0);
    } catch (err) {
      setVoteProblem(err instanceof Error ? err.message : "No pudimos cargar los disfraces.");
    } finally { transition.current = false; setBusy(false); }
  }
  async function upload(name: string, costume: string, photo: Blob) {
    if (transition.current) return;
    transition.current = true;
    const entered = new Promise<void>((resolve) => { uploadEntered.current = resolve; });
    setBusy(true); setError(""); setVoteProblem(null); setUploadCover("covering");
    try {
      let result: Participation;
      try { result = demoMode ? await demoUpload(name, costume, photo) : await submitParticipant(name, costume, photo); }
      catch (err) {
        // Recover a successful upload if the response was interrupted by the connection.
        const restored = demoMode ? demoState() : await fetchState().catch(() => null);
        if (!restored?.participant) throw err;
        result = restored.participant;
      }
      let pending: Costume[] | null = null;
      try { pending = demoMode ? demoCostumes() : await fetchCostumes(); }
      catch { /* Keep the saved photo and offer the existing retry action. */ }
      // A fast upload still shows the approach; a slow upload holds Zitra until ready.
      await entered;
      setParticipant(result); setHasPhotos(true);
      if (pending !== null) { setEntries(pending); setBusy(false); setStage("voting"); }
      else {
        setError("Tu foto ya está guardada. No pudimos cargar la votación; tocá ‘Seguir votando’ para reintentar.");
        setUploadCover("leaving");
      }
    } catch (err) {
      uploadEntered.current = null;
      setUploadCover(null); setBusy(false); transition.current = false;
      throw err;
    }
  }

  function finishUploadTransition() {
    restoreFocus.current = true;
    uploadEntered.current = null;
    setUploadCover(null); setBusy(false); transition.current = false;
  }
  async function vote(id: string, stars: number) {
    if (demoMode) demoVote(id); else await submitVote(id, stars);
    setVotes((number) => number + 1);
  }


  return <MotionConfig reducedMotion="user">
    <div className={`quest-shell ${stage === "home" ? "is-home" : stage === "upload" ? "is-upload" : ""}`}>
      <a className="skip-link" href="#main">Ir al contenido</a>
      {demoMode && <div className="demo-banner">Demo · Fotos y votos guardados solo en este navegador.</div>}

      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
        <motion.div key={stage} className="screen-frame" inert={Boolean(uploadCover)} aria-busy={Boolean(uploadCover)}
          variants={{
            enter: { opacity: 0, y: reduceMotion ? 0 : 22 },
            visible: { opacity: 1, y: 0 },
            leave: { opacity: 0, y: reduceMotion ? 0 : -16 },
          }}
          initial="enter" animate="visible" exit="leave"
          transition={{ duration: reduceMotion || uploadCover ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={(definition) => {
            if (definition === "visible") {
              if (stage === "voting" && uploadCover === "covering") setUploadCover("leaving");
              else if (!uploadCover) main.current?.focus({ preventScroll: true });
            }
          }}>
      {stage !== "home" && <header className="site-header">
        <a className="brand" href="/" aria-label="Side Quest - Costume Quest, inicio">
          <img src="/brand/sidequest-logo.png" alt="Side Quest" width={64} height={48} />
          <span>Costume Quest</span>
        </a>
        <button className="qr-button" onClick={() => setShare(true)} aria-label="Compartir app y ver código QR">
          <QrCode size={18} />
        </button>
      </header>}

      <main id="main" ref={main} tabIndex={-1} className={`main-content stage-${stage}`}>
        {stage === "home" && <section className="home-screen" aria-label="Inicio de Costume Quest">
          <div className="home-artwork">
            <img src="/brand/sidequest-halloween-hero.png" alt="Ghostface y un personaje con orejas de conejo en la ambientación roja de SideQuest Halloween" width={1141} height={1378} fetchPriority="high" />
          </div>
          <div className="home-content">
          <img className="home-logo" src="/brand/sidequest-logo.png" alt="Side Quest - La Anti Hackathon" width={338} height={252} />
          <h1 className="home-title">COSTUME <span className="red">QUEST.</span></h1>
          <div className="home-actions">
            <button className="button button-red home-cta" onClick={() => setStage("upload")}>Subir foto</button>
            <button className="button button-outline home-cta" onClick={() => setQuestion(true)}>Ir a votar</button>
          </div>
          </div>
        </section>}

        {stage === "upload" && <section className="upload-screen" aria-label="Inscripción al concurso">
          <div className="upload-heading"><button className="text-button" onClick={() => setStage("home")}>Volver</button><h1>SUBÍ TU FOTO<span className="red">.</span></h1></div>
          <div className="quest-panel">
            {!ready ? <div className="loading-state" role="status">
              <LoaderCircle className="spin" size={24} /><p>Cargando…</p>
            </div> : participant ? <div className="welcome-back">
              <h2>YA ESTÁS PARTICIPANDO<span className="red">.</span></h2>
              <img className="own-photo" src={participant.photoUrl} alt={`Tu disfraz${participant.costume ? `: ${participant.costume}` : ""}`} />
              <button className="button button-red" disabled={busy} onClick={() => void startVoting()}>
                {busy && <LoaderCircle className="spin" size={18} />} Seguir votando <ArrowRight size={17} />
              </button>
            </div> : error ? <div className="empty-state">
              <h2>No pudimos conectar.</h2><p>{error}</p>
              <button className="button button-outline" onClick={() => setRetry((n) => n + 1)}>Reintentar</button>
            </div> : <UploadForm onSubmit={upload} busy={busy} />}
            {error && participant && <p className="error-message" role="alert">{error}</p>}
          </div>
        </section>}

        {stage === "voting" && <section className="vote-layout" aria-label="Votación de disfraces">
          {(busy || voteProblem || hasPhotos) && <div className="vote-intro">
            <h1>VOTÁ TUS <span className="red">FAVORITOS.</span></h1>
            <p>Deslizá para omitir.</p>
          </div>}
          {busy ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={25} /><p>Cargando disfraces…</p></div>
            : voteProblem ? <div className="empty-state vote-problem">
              <h2>NO PUDIMOS CARGAR.</h2>
              <p role="alert">{voteProblem}</p>
              <button className="button button-red" onClick={() => void startVoting()}>Reintentar</button>
              <button className="text-button" onClick={() => setStage("home")}>Volver al inicio</button>
            </div>
            : <Voting entries={entries} hasPhotos={hasPhotos} onUpload={() => setStage("upload")} onVote={vote} onDone={() => setStage("thanks")} />}

        </section>}

        {stage === "thanks" && <section className="thanks-section">
          <h1>¡GRACIAS<span className="red">!</span></h1>
          <p className="thanks-description">{participant ? `Gracias por subir tu foto${votes > 0 ? " y por votar" : ""}.` : votes > 0 ? "Gracias por votar." : "Gracias por participar."}</p>
          <button className="button button-red thanks-cta" disabled={busy} onClick={() => void startVoting()}>
            {busy ? <LoaderCircle size={18} className="spin" /> : <RotateCcw size={17} />} Volver a votar
          </button>
          {error && <p className="error-message" role="alert">{error}</p>}
        </section>}
      </main>

      {stage !== "home" && <footer className="site-footer"><span>SideQuest - La anti Hackaton</span><span>Halloween Party</span></footer>}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {uploadCover && <UploadTransition leaving={uploadCover === "leaving"}
          onEntered={() => { uploadEntered.current?.(); uploadEntered.current = null; }}
          onFinished={finishUploadTransition} />}
      </AnimatePresence>
      {share && <ShareDialog onClose={() => setShare(false)} />}
      {question && <VoteQuestion
        onYes={() => { setQuestion(false); void startVoting(); }}
        onNo={() => { setQuestion(false); setStage("upload"); }}
        onClose={() => setQuestion(false)} />}

    </div>
  </MotionConfig>;
}
