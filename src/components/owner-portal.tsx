"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import type { Dashboard } from "@/lib/admin-types";
import { OwnerResults } from "./owner-results";
import { OwnerStats } from "./owner-stats";
import { useOwnerPresentation } from "./owner-presentation-context";
import { podiumGroups } from "@/lib/podium";

class PortalError extends Error { constructor(public status: number, message: string) { super(message); } }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { ...options, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new PortalError(response.status, body.error || "No pudimos completar la operación.");
  return body;
}
export function OwnerPortal({ view = "portal" }: { view?: "portal" | "podium" | "results" }) {
  const showPortal = view === "portal";
  const showPodium = view === "podium";
  const showResults = view === "results";
  const router = useRouter();
  const { snapshot, snapshotId, capture, clear } = useOwnerPresentation();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const version = useRef(0);
  const mutating = useRef(false);
  const loggedIn = Boolean(dashboard);

  const refresh = useCallback(async (initial = false) => {
    const current = ++version.current;
    setRefreshing(true);
    try {
      const data = await request<Dashboard>("dashboard");
      if (current !== version.current) return;
      setDashboard(data); setError("");
      setUpdatedAt(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      if (current !== version.current) return;
      if (err instanceof PortalError && (err.status === 401 || err.status === 403)) {
        setDashboard(null); clear(); if (!initial) setError("Tu sesión terminó. Volvé a ingresar.");
      } else setError(err instanceof Error ? err.message : "No pudimos actualizar los resultados.");
    } finally { if (current === version.current) { setInitializing(false); setRefreshing(false); } }
  }, [clear]);

  useEffect(() => { void refresh(true); return () => { version.current++; }; }, [refresh]);
  useEffect(() => {
    if (!loggedIn) return;
    const update = () => { if (!document.hidden && !mutating.current) void refresh(); };
    const timer = window.setInterval(update, 15000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [loggedIn, refresh]);

  async function login(event: FormEvent) {
    event.preventDefault(); if (mutating.current) return;
    mutating.current = true; setBusy(true); setError(""); setNotice(""); version.current++;
    try {
      await request("login", { method: "POST", body: JSON.stringify({ password }) });
      setPassword(""); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No pudimos ingresar."); }
    finally { mutating.current = false; setBusy(false); }
  }
  async function toggleVoting() {
    if (!dashboard || mutating.current) return;
    const enabled = !dashboard.votingEnabled;
    mutating.current = true; setBusy(true); setError(""); setNotice(""); version.current++;
    try {
      await request("voting", { method: "POST", body: JSON.stringify({ enabled }) });
      await refresh();
      setNotice(enabled ? "Votación habilitada. Los invitados ya pueden votar." : "Votación cerrada. Los votos guardados se conservan.");
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : "No pudimos cambiar la votación.");
    } finally { mutating.current = false; setBusy(false); }
  }
  async function logout() {
    if (mutating.current) return;
    mutating.current = true; setBusy(true); setError(""); version.current++;
    try {
      await request("logout", { method: "POST", body: "{}" });
      setDashboard(null); clear(); setPassword(""); setNotice(""); setRefreshing(false);
    } catch { setError("No pudimos cerrar la sesión. Intentá de nuevo."); }
    finally { mutating.current = false; setBusy(false); }
  }

  async function startPresentation() {
    if (mutating.current) return;
    mutating.current = true; setBusy(true); setError(""); version.current++;
    try {
      const results = await request<Dashboard>("dashboard");
      setDashboard(results);
      if (!podiumGroups(results.ranking).length) throw new Error("Todavía no hay votos para revelar.");
      capture(results);
      router.push("/nacho/podio/resultados");
    } catch (err) {
      if (err instanceof PortalError && (err.status === 401 || err.status === 403)) { setDashboard(null); clear(); }
      setError(err instanceof Error ? err.message : "No pudimos preparar los resultados.");
    } finally { mutating.current = false; setBusy(false); setRefreshing(false); }
  }

  return <div className={`owner-shell ${dashboard ? "owner-authenticated" : ""} ${showResults && dashboard ? "owner-results-screen" : ""}`}>
    <header className="owner-header">
      <a className="brand" href="/" aria-label="Ir al inicio de Costume Quest"><img src="/brand/sidequest-logo.png" alt="SideQuest" width={54} height={40} /><span>Costume Quest</span></a>
      {dashboard ? <button className="text-button" onClick={() => void logout()} disabled={busy}><LogOut size={16} /> Salir</button> : <LockKeyhole size={18} aria-label="Acceso privado" />}
    </header>
    <main className="owner-main">
      {initializing ? <p className="owner-loading" role="status">Cargando portal…</p> : !dashboard ? <section className="owner-login">
        <span className="owner-eyebrow">SOLO PARA NACHO</span>
        <h1>BACK<span className="red">STAGE.</span></h1>
        <form onSubmit={(event) => void login(event)}>
          <div className="field"><label htmlFor="owner-password">Contraseña</label><input id="owner-password" name="password" type="password" autoComplete="current-password" maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></div>
          <button className="button button-red" disabled={busy}>{busy ? "Ingresando…" : "Entrar al portal"}<ArrowRight size={18} /></button>
        </form>
        {error && <p className="error-message" role="alert">{error}</p>}
      </section> : <>
        {showPodium && <Link href="/nacho" className="text-button owner-back"><ArrowLeft size={16} /> Volver al portal</Link>}
        {!showResults && <>
        <div className="owner-title-row"><div><span className="owner-eyebrow">SIDEQUEST · HALLOWEEN PARTY</span><h1>{showPodium ? <>EL <span className="red">PODIO.</span></> : <>PORTAL DE <span className="red">NACHO.</span></>}</h1></div>
          <button className="text-button owner-refresh" onClick={() => void refresh()} disabled={busy || refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""} /> Actualizar</button>
        </div>
        </>}
        {showPortal && <section className="owner-control" aria-labelledby="owner-voting-heading">
          <div><span className={`owner-status ${dashboard.votingEnabled ? "is-open" : ""}`}>{dashboard.votingEnabled ? "ABIERTA" : "CERRADA"}</span><h2 id="owner-voting-heading">VOTACIÓN</h2><p>{dashboard.votingEnabled ? "Los invitados pueden repartir estrellas." : "Se pueden subir fotos. Los votos están bloqueados."}</p></div>
          <button type="button" role="switch" aria-checked={dashboard.votingEnabled} aria-label="Habilitar votación" className="owner-voting-toggle" onClick={() => void toggleVoting()} disabled={busy} aria-busy={busy}>
            <span className="owner-toggle-label" aria-hidden="true">{busy ? "Guardando…" : "Habilitar votación"}</span>
            <span className="owner-switch-track" aria-hidden="true"><span className="owner-switch-thumb" /></span>
          </button>
        </section>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {showPortal && <><p className="owner-notice" role="status">{notice}</p>
        <OwnerStats dashboard={dashboard} />
        <section className="owner-control owner-podium-access" aria-labelledby="owner-podium-access-heading">
          <div><h2 id="owner-podium-access-heading">PODIO</h2><p>Los disfraces más votados.</p></div>
          <Link href="/nacho/podio" className="button button-red owner-podium-link">Acceder al podio <ArrowRight size={18} /></Link>
        </section>
        </>}
        {showPodium && <section className="podium-lobby" aria-label="Estadísticas y presentación del podio">
          <OwnerStats dashboard={dashboard} animated />
          <div className="podium-launch">
            <button className="button button-red" onClick={() => void startPresentation()} disabled={busy || refreshing || !podiumGroups(dashboard.ranking).length} aria-busy={busy}>{busy ? "Preparando…" : "Ver resultados"}<ArrowRight size={18} /></button>
            {!podiumGroups(dashboard.ranking).length && <p>Todavía no hay votos para revelar.</p>}
            {dashboard.votingEnabled && <p>La votación sigue abierta. Resultados provisorios.</p>}
          </div>
        </section>}
        {showResults && <OwnerResults key={snapshotId} dashboard={snapshot ?? dashboard} />}
        {!showResults && <p className="owner-updated">Actualizado {updatedAt} · Actualización automática cada 15 s.</p>}
      </>}
    </main>
  </div>;
}
