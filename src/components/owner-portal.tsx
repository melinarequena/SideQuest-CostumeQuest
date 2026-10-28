"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, LogOut, RefreshCw, Star } from "lucide-react";
import type { Dashboard, RankedCostume } from "@/lib/admin-types";

class PortalError extends Error { constructor(public status: number, message: string) { super(message); } }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { ...options, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json", ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new PortalError(response.status, body.error || "No pudimos completar la operación.");
  return body;
}
function imageUrl(entry: RankedCostume) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/costumes/${entry.photoPath.split("/").map(encodeURIComponent).join("/")}`;
}

export function OwnerPortal() {
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
        setDashboard(null); if (!initial) setError("Tu sesión terminó. Volvé a ingresar.");
      } else setError(err instanceof Error ? err.message : "No pudimos actualizar los resultados.");
    } finally { if (current === version.current) { setInitializing(false); setRefreshing(false); } }
  }, []);

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
      setDashboard(null); setPassword(""); setNotice(""); setRefreshing(false);
    } catch { setError("No pudimos cerrar la sesión. Intentá de nuevo."); }
    finally { mutating.current = false; setBusy(false); }
  }

  return <div className={`owner-shell ${dashboard ? "owner-authenticated" : ""}`}>
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
        <div className="owner-title-row"><div><span className="owner-eyebrow">SIDEQUEST · HALLOWEEN PARTY</span><h1>PORTAL DE <span className="red">NACHO.</span></h1></div>
          <button className="text-button owner-refresh" onClick={() => void refresh()} disabled={busy || refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""} /> Actualizar</button>
        </div>
        <section className="owner-control" aria-labelledby="owner-voting-heading">
          <div><span className={`owner-status ${dashboard.votingEnabled ? "is-open" : ""}`}>{dashboard.votingEnabled ? "ABIERTA" : "CERRADA"}</span><h2 id="owner-voting-heading">VOTACIÓN</h2><p>{dashboard.votingEnabled ? "Los invitados pueden repartir estrellas." : "Se pueden subir fotos. Los votos están bloqueados."}</p></div>
          <button className={`button ${dashboard.votingEnabled ? "button-outline" : "button-red"}`} onClick={() => void toggleVoting()} disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : dashboard.votingEnabled ? "Cerrar votación" : "Habilitar votación"}</button>
        </section>
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="owner-notice" role="status">{notice}</p>
        <div className="owner-stats" aria-label="Totales del concurso"><div><strong>{dashboard.participants}</strong><span>Disfraces</span></div><div><strong>{dashboard.votes}</strong><span>Votos</span></div><div><strong>{dashboard.totalStars}</strong><span>Estrellas</span></div></div>
        <section className="owner-results" aria-labelledby="podium-heading"><div className="owner-section-heading"><h2 id="podium-heading">EL <span className="red">PODIO.</span></h2><span>{dashboard.votingEnabled ? "Resultados en vivo · provisorios" : "Resultados actuales"}</span></div>
          {!dashboard.ranking.some((entry) => entry.place !== null) ? <div className="owner-empty">El podio aparece con los primeros votos.</div> : <div className="owner-podium">{[1, 2, 3].map((place) => <div key={place} className={`podium-place place-${place}`}><span className="podium-number">{place}<small>°</small></span>{dashboard.ranking.filter((entry) => entry.place === place).map((entry) => <article key={entry.id} className="podium-card"><img src={imageUrl(entry)} alt={`Disfraz de ${entry.name}`} /><div><h3>{entry.name}</h3><strong><Star size={15} fill="currentColor" /> {entry.totalStars} estrellas</strong><span>{entry.votes} {entry.votes === 1 ? "voto" : "votos"}</span></div></article>)}{!dashboard.ranking.some((entry) => entry.place === place) && <p className="podium-pending">Sin votos todavía</p>}</div>)}</div>}
          <p className="owner-ranking-rule">Por total de estrellas. Los empates comparten puesto.</p>
        </section>
        <section className="owner-ranking" aria-labelledby="ranking-heading"><h2 id="ranking-heading">TODOS LOS DISFRACES</h2>
          {dashboard.ranking.length === 0 ? <p className="owner-empty">Todavía no se subieron fotos.</p> : <div className="owner-table-wrap"><table><thead><tr><th scope="col">Puesto</th><th scope="col">Participante</th><th scope="col">Votos</th><th scope="col">Estrellas</th></tr></thead><tbody>{dashboard.ranking.map((entry) => <tr key={entry.id}><td>{entry.place === null ? "—" : `${entry.place}°`}</td><th scope="row"><img src={imageUrl(entry)} alt="" width={40} height={48} />{entry.name}</th><td>{entry.votes}</td><td><strong>{entry.totalStars}</strong></td></tr>)}</tbody></table></div>}
        </section>
        <p className="owner-updated">Actualizado {updatedAt} · Actualización automática cada 15 s.</p>
      </>}
    </main>
  </div>;
}
