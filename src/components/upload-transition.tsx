"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export const ZITRA_TRANSITION_IMAGE = "/brand/zitra-upload-transition.png";

type Props = {
  leaving: boolean;
  onEntered: () => void;
  onFinished: () => void;
};

export function UploadTransition({ leaving, onEntered, onFinished }: Props) {
  const reduceMotion = useReducedMotion();
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [arrived, setArrived] = useState(false);
  const phase = leaving ? "leave" : arrived ? "hold" : "approach";

  return <motion.div className="upload-transition" role="status" aria-live="polite"
    aria-label="Subiendo tu foto y preparando la votación" data-phase={phase}
    initial="hidden" animate={leaving ? "leave" : "visible"} exit="hidden"
    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 }, leave: { opacity: 0 } }}
    transition={{ duration: reduceMotion ? 0.12 : leaving ? 0.28 : 0.14 }}
    onAnimationComplete={(animation) => { if (animation === "leave") onFinished(); }}>
    <motion.div className="upload-transition-figure" aria-hidden="true"
      initial="hidden" animate={imageReady ? phase : "hidden"}
      variants={{
        hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.22, rotate: reduceMotion ? 0 : -9, y: reduceMotion ? 0 : 65, filter: reduceMotion ? "blur(0px)" : "blur(9px)" },
        approach: { opacity: 1, scale: reduceMotion ? 1 : 1.12, rotate: 0, y: 0, filter: "blur(0px)", transition: { duration: reduceMotion ? 0.12 : 0.8, ease: [0.32, 0.02, 0.65, 1] } },
        hold: reduceMotion ? { scale: 1, y: 0, rotate: 0 } : { scale: 1.12, y: [0, -8, 0], rotate: [0, 1, 0], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
        leave: { opacity: 0, scale: reduceMotion ? 1 : 3.4, y: reduceMotion ? 0 : -45, filter: reduceMotion ? "blur(0px)" : "blur(12px)", transition: { duration: reduceMotion ? 0.12 : 0.28, ease: "easeIn" } },
      }}
      onAnimationComplete={(animation) => {
        if (animation === "approach") { setArrived(true); onEntered(); }
      }}>
      <img src={ZITRA_TRANSITION_IMAGE} alt="" width={1142} height={1378} draggable={false}
        hidden={imageFailed} onLoad={() => setImageReady(true)}
        onError={() => { setImageFailed(true); setImageReady(true); }} />
      {imageFailed && <LoaderCircle className="spin upload-transition-fallback" size={34} />}
    </motion.div>
  </motion.div>;
}
