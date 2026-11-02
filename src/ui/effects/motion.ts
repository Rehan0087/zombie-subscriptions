import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Animates a number towards `target` (the savings tally). Jumps straight there with reduced motion. */
export function useCountUp(target: number, durationMs = 700): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const value = Math.round(origin + (target - origin) * eased);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return shown;
}
