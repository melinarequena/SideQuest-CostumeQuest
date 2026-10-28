"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function VoteQuestion({ onYes, onNo, onClose }: { onYes: () => void; onNo: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return <dialog ref={dialog} className="vote-question" aria-labelledby="vote-question-title" onCancel={onClose}
    onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <button className="close-dialog icon-button" onClick={onClose} aria-label="Cerrar pregunta"><X size={21} /></button>
    <h2 id="vote-question-title">¿YA SUBISTE<br />TU <span className="red">FOTO?</span></h2>
    <div className="question-actions">
      <button className="button button-red" onClick={onYes}>Sí, ya subí</button>
      <button className="button button-outline" onClick={onNo}>No, subir foto</button>
    </div>
  </dialog>;
}
