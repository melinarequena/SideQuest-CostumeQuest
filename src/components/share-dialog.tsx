"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, X } from "lucide-react";

export function ShareDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const value = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setUrl(value);
    try { setLocal(["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname)); }
    catch { setError("Revisá NEXT_PUBLIC_SITE_URL: debe ser una URL completa."); return; }
    let active = true;
    QRCode.toDataURL(value, { width: 600, margin: 3, color: { dark: "#101010", light: "#fff8ed" }, errorCorrectionLevel: "M" }).then((result) => { if (active) setQr(result); }).catch(() => { if (active) setError("No pudimos generar el QR."); });
    return () => { active = false; };
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError("Copiá el enlace que aparece debajo del QR."); }
  }
  return <dialog ref={dialog} className="share-dialog" onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) onClose(); }} aria-labelledby="share-title">
    <button className="close-dialog icon-button" onClick={onClose} aria-label="Cerrar código QR"><X size={22} /></button>
    <h2 id="share-title">Compartir Costume Quest</h2><p>Escaneá, subí tu disfraz y empezá a votar.</p>
    {qr && <img className="qr-image" src={qr} alt="Código QR para abrir Costume Quest" width={240} height={240} />}
    <p className="share-url">{url}</p>
    {local && <p className="local-warning">Vista local: este QR todavía no funciona desde otros dispositivos. Al publicar la app, configurá su URL pública.</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="share-actions"><button className="button button-outline" onClick={() => void copy()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Copiado" : "Copiar enlace"}</button>{qr && <a href={qr} download="sidequest-costume-quest-qr.png" className="button button-red"><Download size={17} /> Descargar QR</a>}</div>
  </dialog>;
}
