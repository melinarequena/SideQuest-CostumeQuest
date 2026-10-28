"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="fatal-error"><h1>SE NOS ESCAPÓ UN FANTASMA.</h1><p>No pudimos cargar la app. Tu participación guardada sigue en la quest.</p><button className="button button-red" onClick={reset}>Volver a intentar</button></main>;
}
