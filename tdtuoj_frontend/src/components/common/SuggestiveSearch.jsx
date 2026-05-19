import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";

// ─── TypewriterEffect ──────────────────────────────────────────────────────────
const TypewriterEffect = ({
  text, isActive, allowDelete = true,
  typeDurationMs, deleteDurationMs, pauseAfterTypeMs,
  prefersReducedMotion, onDeleteComplete,
}) => {
  const [phase, setPhase] = useState("typing");
  const timers = useRef([]);

  useEffect(() => {
    setPhase("typing");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [text, isActive, allowDelete]);

  useEffect(() => {
    if (!isActive) {
      setPhase("typing");
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !prefersReducedMotion || !allowDelete) return;
    const t = window.setTimeout(() => onDeleteComplete?.(), Math.max(200, pauseAfterTypeMs));
    timers.current.push(t);
    return () => timers.current.forEach(clearTimeout);
  }, [isActive, prefersReducedMotion, allowDelete, pauseAfterTypeMs, onDeleteComplete]);

  if (!isActive) return null;

  if (prefersReducedMotion) {
    return (
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", userSelect: "none" }}>
        {text}
      </span>
    );
  }

  return (
    <div style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap" }}>
      <motion.div
        key={text}
        initial={{ width: "0%" }}
        animate={
          phase === "typing"   ? { width: "100%" } :
          phase === "deleting" ? { width: "0%" }   : { width: "100%" }
        }
        transition={
          phase === "typing"   ? { duration: typeDurationMs   / 1000, ease: "linear" } :
          phase === "deleting" ? { duration: deleteDurationMs / 1000, ease: "linear" } : {}
        }
        onAnimationComplete={() => {
          if (phase === "typing") {
            setPhase("paused");
            if (allowDelete) {
              const t = window.setTimeout(() => setPhase("deleting"), pauseAfterTypeMs);
              timers.current.push(t);
            }
          } else if (phase === "deleting") {
            onDeleteComplete?.();
          }
        }}
        style={{ display: "inline-flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap" }}
      >
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", userSelect: "none" }}>
          {text}
        </span>

        {/* Blinking cursor */}
        <motion.span
          aria-hidden
          style={{
            display: "inline-block",
            width: 1,
            marginLeft: 3,
            height: "1.1em",
            verticalAlign: "middle",
            background: "var(--text-muted)",
          }}
          animate={
            phase === "typing" || phase === "paused"
              ? { opacity: [0, 1, 0] }
              : { opacity: 0 }
          }
          transition={
            phase === "typing" || phase === "paused"
              ? { repeat: Infinity, duration: 0.9, ease: "linear" }
              : { duration: 0.1 }
          }
        />
      </motion.div>
    </div>
  );
};

// ─── FadeEffect ────────────────────────────────────────────────────────────────
const FadeEffect = ({
  text, isActive, allowDelete = true,
  typeDurationMs, deleteDurationMs, pauseAfterTypeMs,
  prefersReducedMotion, onDeleteComplete,
}) => {
  const [phase, setPhase] = useState("fadeIn");
  const timers = useRef([]);

  useEffect(() => {
    setPhase("fadeIn");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [text, isActive, allowDelete]);

  useEffect(() => {
    if (!isActive) { setPhase("fadeIn"); timers.current.forEach(clearTimeout); timers.current = []; }
  }, [isActive]);

  // reduced motion fallback (no conditional hook — always declared)
  useEffect(() => {
    if (!isActive || !prefersReducedMotion || !allowDelete) return;
    const t = window.setTimeout(() => onDeleteComplete?.(), Math.max(200, pauseAfterTypeMs));
    timers.current.push(t);
    return () => timers.current.forEach(clearTimeout);
  }, [isActive, prefersReducedMotion, allowDelete, pauseAfterTypeMs, onDeleteComplete]);

  if (!isActive) return null;
  if (prefersReducedMotion) {
    return <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", userSelect: "none" }}>{text}</span>;
  }

  return (
    <div style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap" }}>
      <motion.div
        key={text}
        initial={{ opacity: 0 }}
        animate={phase === "fadeIn" ? { opacity: 1 } : phase === "fadeOut" ? { opacity: 0 } : { opacity: 1 }}
        transition={phase === "fadeIn" ? { duration: typeDurationMs / 1000 } : { duration: deleteDurationMs / 1000 }}
        onAnimationComplete={() => {
          if (phase === "fadeIn") {
            setPhase("hold");
            if (allowDelete) {
              const t = window.setTimeout(() => setPhase("fadeOut"), pauseAfterTypeMs);
              timers.current.push(t);
            }
          } else if (phase === "fadeOut") {
            onDeleteComplete?.();
          }
        }}
        style={{ display: "inline-block" }}
      >
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", userSelect: "none" }}>{text}</span>
      </motion.div>
    </div>
  );
};

const BUILTIN_EFFECTS = { typewriter: TypewriterEffect, fade: FadeEffect, none: () => null };

// ─── SuggestiveSearch ──────────────────────────────────────────────────────────
export default function SuggestiveSearch({
  value,
  onChange,
  suggestions = ["Search..."],
  effect = "typewriter",
  EffectComponent,
  typeDurationMs = 480,
  deleteDurationMs = 280,
  pauseAfterTypeMs = 1600,
  animateMode = "infinite",
  style,
  className,
  onKeyDown,
}) {
  const [internal, setInternal] = useState(value ?? "");
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);

  // sync controlled value
  useEffect(() => { if (value !== undefined) setInternal(value); }, [value]);

  const current = useMemo(() => suggestions[index] ?? "", [suggestions, index]);

  const wrapperRef  = useRef(null);
  const leadingRef  = useRef(null);
  const overlayRef  = useRef(null);
  const inputRef    = useRef(null);

  const [leftOffsetPx,  setLeftOffsetPx]  = useState(null);
  const [rightOffsetPx, setRightOffsetPx] = useState(null);
  const [measuredPx,    setMeasuredPx]    = useState(null);
  const [availablePx,   setAvailablePx]   = useState(null);

  const longestSuggestion = useMemo(
    () => suggestions.reduce((a, b) => (a.length > b.length ? a : b), ""),
    [suggestions]
  );

  // measure leading offset + available width
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const lead    = leadingRef.current;
    if (!wrapper) return;
    const update = () => {
      const cs      = getComputedStyle(wrapper);
      const padL    = parseFloat(cs.paddingLeft  || "0");
      const padR    = parseFloat(cs.paddingRight || "0");
      const leadW   = lead?.getBoundingClientRect().width ?? 0;
      const left    = padL + leadW + 8;
      setLeftOffsetPx(left);
      setRightOffsetPx(padR);
      const wW      = wrapper.getBoundingClientRect().width;
      setAvailablePx(Math.max(0, wW - left - padR));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    if (lead) ro.observe(lead);
    return () => ro.disconnect();
  }, []);

  // measure longest suggestion text width
  useEffect(() => {
    if (!longestSuggestion) { setMeasuredPx(null); return; }
    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d");
    if (!ctx)    { setMeasuredPx(null); return; }
    const el     = inputRef.current ?? wrapperRef.current;
    if (el) {
      const cs   = getComputedStyle(el);
      ctx.font   = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    } else {
      ctx.font   = `400 14px var(--font-body)`;
    }
    setMeasuredPx(Math.ceil(ctx.measureText(longestSuggestion).width) + 12);
  }, [longestSuggestion]);

  const ChosenEffect   = EffectComponent ?? BUILTIN_EFFECTS[effect] ?? TypewriterEffect;
  const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const minWidthPx     = measuredPx != null && availablePx != null
    ? Math.min(measuredPx, availablePx) : (measuredPx ?? undefined);
  const overlayActive  = !internal && !focused;
  const allowDelete    = animateMode === "infinite" || index < suggestions.length - 1;

  const handleChange = (val) => {
    setInternal(val);
    onChange?.(val);
  };

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-4)",
        border: focused
          ? "1px solid var(--primary)"
          : "1px solid var(--border-default)",
        borderRadius: "var(--radius-pill)",
        background: "var(--bg-raised)",
        boxShadow: focused ? "0 0 0 3px var(--primary-glow)" : "none",
        transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
        maxWidth: "100%",
        ...style,
      }}
    >
      {/* Search icon */}
      <div ref={leadingRef} style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <Search size={15} color="var(--text-muted)" strokeWidth={2} />
      </div>

      {/* Real input */}
      <input
        ref={inputRef}
        type="text"
        value={internal}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder=""
        aria-label="search"
        style={{
          background: "transparent",
          outline: "none",
          border: "none",
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
          width: "100%",
          minWidth: minWidthPx != null ? `${minWidthPx}px` : undefined,
        }}
      />

      {/* Animated suggestion overlay */}
      {overlayActive && (
        <div
          ref={overlayRef}
          aria-hidden
          style={{
            position: "absolute",
            left:   leftOffsetPx  != null ? `${leftOffsetPx}px`  : "calc(var(--space-4) + 1.5rem + 8px)",
            right:  rightOffsetPx != null ? `${rightOffsetPx}px` : "var(--space-4)",
            top: 0, bottom: 0,
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <ChosenEffect
            text={current}
            isActive={overlayActive}
            allowDelete={allowDelete}
            typeDurationMs={typeDurationMs}
            deleteDurationMs={deleteDurationMs}
            pauseAfterTypeMs={pauseAfterTypeMs}
            prefersReducedMotion={prefersReduced}
            onDeleteComplete={() => setIndex((i) => (i + 1) % suggestions.length)}
            containerRef={overlayRef}
          />
        </div>
      )}
    </div>
  );
}
