import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const parseValue = (val) => {
  if (!val) return null;
  const [datePart, timePart = "00:00:00"] = val.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return { year, month: month - 1, day, hour: hour||0, minute: minute||0, second: second||0 };
};

const formatValue = ({ year, month, day, hour, minute, second }) =>
  `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T` +
  `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:${String(second).padStart(2,"0")}`;

const daysInMonth = (year, month) => new Date(year, month+1, 0).getDate();
const pad = (n) => String(n).padStart(2, "0");

const ITEM_H = 36;

const ScrollColumn = ({ value, max, onChange, label }) => {
  const items = Array.from({ length: max }, (_, i) => i);
  const listRef = useRef(null);
  const isProgScroll = useRef(false);

  useEffect(() => {
    if (listRef.current) {
      isProgScroll.current = true;
      listRef.current.scrollTop = value * ITEM_H;
      requestAnimationFrame(() => { isProgScroll.current = false; });
    }
  }, [value]);

  const handleScroll = useCallback(() => {
    if (isProgScroll.current || !listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, max - 1));
    if (clamped !== value) onChange(clamped);
  }, [value, max, onChange]);

  const btnStyle = { background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", lineHeight: 1 };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <button type="button" style={btnStyle} onClick={() => onChange(Math.max(0, value - 1))}>
        <ChevronUp size={14} />
      </button>
      <div ref={listRef} onScroll={handleScroll} style={{
        height: ITEM_H * 3, overflowY: "scroll", width: 48,
        borderRadius: "var(--radius-md)", background: "var(--bg-raised)",
        border: "1px solid var(--border-default)", scrollbarWidth: "none",
      }}>
        <div style={{ height: ITEM_H }} />
        {items.map((i) => (
          <div key={i} onClick={() => onChange(i)} style={{
            height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "var(--text-sm)", cursor: "pointer",
            fontWeight: i === value ? 700 : 400,
            color: i === value ? "var(--cyan)" : "var(--text-secondary)",
            background: i === value ? "var(--cyan-subtle)" : "transparent",
            transition: "all 0.1s",
            fontFamily: "var(--font-code)",
          }}>{pad(i)}</div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
      <button type="button" style={btnStyle} onClick={() => onChange(Math.min(max - 1, value + 1))}>
        <ChevronDown size={14} />
      </button>
      <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
};

const CalendarGrid = ({ year, month, selected, onSelect, onPrevMonth, onNextMonth }) => {
  const firstDay = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const today = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={onPrevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: "var(--radius-sm)", color: "var(--cyan)" }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
          {MONTHS[month]} {year}
        </span>
        <button type="button" onClick={onNextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: "var(--radius-sm)", color: "var(--cyan)" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>{d}</div>
        ))}
        {cells.map((day, idx) => {
          const isSelected = day && day === selected;
          const isToday = day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={idx} onClick={() => day && onSelect(day)} style={{
              height: 30, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--radius-pill)", fontSize: "var(--text-xs)",
              fontWeight: isSelected ? 700 : 400,
              background: isSelected ? "var(--cyan)" : isToday ? "var(--cyan-subtle)" : "transparent",
              color: isSelected ? "var(--text-inverse)" : isToday ? "var(--cyan)" : day ? "var(--text-primary)" : "transparent",
              border: isToday && !isSelected ? "1px solid var(--border-accent)" : "1px solid transparent",
              cursor: day ? "pointer" : "default",
              transition: "all 0.1s",
              fontFamily: "var(--font-code)",
            }}
              onMouseEnter={(e) => { if (day && !isSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { if (day && !isSelected) e.currentTarget.style.background = isToday ? "var(--cyan-subtle)" : "transparent"; }}
            >{day || ""}</div>
          );
        })}
      </div>
    </div>
  );
};

const DateTimePicker = ({ value, onChange, placeholder = "Pick date & time", required }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const parsed = parseValue(value);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth());

  useEffect(() => {
    if (parsed) { setViewYear(parsed.year); setViewMonth(parsed.month); }
  }, [value]);

  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const update = (patch) => {
    // Default time = now (not midnight) — picking only a date used to silently
    // set 00:00:00, producing wildly wrong contest durations.
    const base = parsed ?? { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour: now.getHours(), minute: now.getMinutes(), second: 0 };
    onChange(formatValue({ ...base, ...patch }));
  };

  const displayText = parsed
    ? `${MONTHS[parsed.month].slice(0,3)} ${String(parsed.day).padStart(2,"0")}, ${parsed.year}  ${pad(parsed.hour)}:${pad(parsed.minute)}:${pad(parsed.second)}`
    : "";

  const prevMonth = () => { if (viewMonth===0) { setViewMonth(11); setViewYear((y)=>y-1); } else setViewMonth((m)=>m-1); };
  const nextMonth = () => { if (viewMonth===11) { setViewMonth(0); setViewYear((y)=>y+1); } else setViewMonth((m)=>m+1); };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", width: "100%" }}>
      <div onClick={() => setOpen((v) => !v)} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "var(--space-2) var(--space-3)",
        border: `1px solid ${open ? "var(--border-accent)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-md)",
        background: "var(--bg-raised)", cursor: "pointer", width: "100%",
        transition: "border-color var(--transition-fast)",
        boxShadow: open ? "0 0 0 3px var(--cyan-glow)" : "none",
      }}>
        <Calendar size={15} color={open ? "var(--cyan)" : "var(--text-muted)"} />
        <span style={{
          flex: 1, fontSize: "var(--text-sm)",
          color: displayText ? "var(--text-primary)" : "var(--text-muted)",
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          userSelect: "none", fontFamily: "var(--font-code)",
        }}>{displayText || placeholder}</span>
        <Clock size={14} color="var(--text-muted)" />
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
          padding: "var(--space-4)", minWidth: 300,
        }}>
          <CalendarGrid
            year={viewYear} month={viewMonth} selected={parsed?.day}
            onSelect={(day) => update({ year: viewYear, month: viewMonth, day })}
            onPrevMonth={prevMonth} onNextMonth={nextMonth}
          />

          <div style={{ height: 1, background: "var(--border-subtle)", margin: "var(--space-4) 0" }} />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <Clock size={13} color="var(--text-muted)" />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Time</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <ScrollColumn label="HR" value={parsed?.hour??0} max={24} onChange={(h)=>update({hour:h})} />
              <span style={{ paddingTop: 38, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-muted)" }}>:</span>
              <ScrollColumn label="MIN" value={parsed?.minute??0} max={60} onChange={(m)=>update({minute:m})} />
              <span style={{ paddingTop: 38, fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-muted)" }}>:</span>
              <ScrollColumn label="SEC" value={parsed?.second??0} max={60} onChange={(s)=>update({second:s})} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-4)" }}>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} style={{
              background: "none", border: "none", fontSize: "var(--text-xs)", color: "var(--text-muted)",
              cursor: "pointer", padding: "4px 8px", borderRadius: "var(--radius-sm)",
            }}>Clear</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary btn-sm">Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
