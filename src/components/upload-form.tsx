"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ImagePlus, LoaderCircle, RefreshCw } from "lucide-react";
import { preparePhoto } from "@/lib/image";

type Props = { onSubmit: (name: string, costume: string, photo: Blob) => Promise<void>; busy: boolean };

export function UploadForm({ onSubmit, busy }: Props) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const photoButton = useRef<HTMLButtonElement>(null);
  const selection = useRef(0);

  useEffect(() => {
    if (!photo) { setPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function selectFile(file?: File) {
    if (!file || busy) return;
    const current = ++selection.current;
    setPreparing(true); setError("");
    try {
      const result = await preparePhoto(file);
      if (selection.current === current) setPhoto(result);
    } catch (err) { if (selection.current === current) setError(err instanceof Error ? err.message : "No pudimos abrir esa foto."); }
    finally { if (selection.current === current) setPreparing(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || preparing) return;
    if (name.trim().length < 2) { setError("Escribí tu nombre con al menos 2 caracteres."); return; }
    if (!photo) { setError("Elegí una foto de tu disfraz para participar."); photoButton.current?.focus({ preventScroll: true }); return; }
    setError("");
    try { await onSubmit(name.trim(), "", photo); }
    catch (err) { setError(err instanceof Error ? err.message : "No pudimos subir tu disfraz. Intentá de nuevo."); }
  }

  return <form onSubmit={submit} className="upload-form">
    <input id="costume-photo" ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden tabIndex={-1} disabled={busy} onChange={(e) => { void selectFile(e.target.files?.[0]); e.target.value = ""; }} aria-label="Elegí una foto de tu disfraz" />
    <button ref={photoButton} type="button" className={`upload-zone ${preview ? "has-photo" : ""} ${dragging ? "is-dragging" : ""}`} disabled={busy || preparing}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); void selectFile(e.dataTransfer.files[0]); }}>
      {preview ? <><img src={preview} alt="Vista previa de tu disfraz" /><span className="replace-photo"><RefreshCw size={15} /> Cambiar foto</span></> : <><span className="upload-icon">{preparing ? <LoaderCircle className="spin" size={28} /> : <ImagePlus size={28} />}</span><strong>{preparing ? "Preparando tu foto…" : "Elegir foto"}</strong><span>o arrastrala acá</span><small>JPG, PNG o WebP · hasta 15 MB</small></>}
    </button>
    <div className="field"><label htmlFor="participant-name">Nombre <span>*</span></label><input id="participant-name" name="name" placeholder="Tu nombre o apodo" autoComplete="nickname" minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} required /></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <button className="button button-red" type="submit" disabled={busy || preparing}>{busy ? <><LoaderCircle className="spin" size={19} /> Subiendo tu disfraz…</> : <>Subir foto y votar <ArrowRight size={19} /></>}</button>
    
  </form>;
}
