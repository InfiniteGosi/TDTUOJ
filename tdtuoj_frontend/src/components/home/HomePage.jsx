import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Trophy, Bot, BarChart2, Network, BookOpen,
  FileCode2, Users, Activity,
} from "lucide-react";
import ApiService from "../../services/ApiService";

// ─── Matrix rain config ───────────────────────────────────────────────────────

const CHAR_POOL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
  "{}[]()<>/\\|;:.,=+-*&^%$#@!?~_`'\"";

const PALETTES = [
  { name: "matrix",  bright: "#00FF41" },
  { name: "gold",    bright: "#FFD060" },
  { name: "cyber",   bright: "#00EEFF" },
  { name: "crimson", bright: "#FF6070" },
  { name: "violet",  bright: "#D09EFF" },
  { name: "arctic",  bright: "#90D8FF" },
];

// ─── Matrix canvas component ──────────────────────────────────────────────────

function MatrixRain({ palette }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const FS = 16;   // font size
    const COL_W = 26; // wider columns = more breathing room between chars
    let animId;
    let drops = [];
    let speeds = [];
    let cols = 0;
    let dpr = 1;

    const ROW_H = 22; // vertical step between chars — larger than FS prevents overlap

    let lastRow  = [];  // last row index each column drew at
    let headChar = [];  // current head char per column

    const setup = () => {
      const w = canvas.parentElement?.offsetWidth || window.innerWidth;
      const h = canvas.parentElement?.offsetHeight || 600;
      dpr = window.devicePixelRatio || 1;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(dpr, dpr);
      cols     = Math.floor(w / COL_W);
      drops    = Array.from({ length: cols }, () => -(Math.random() * 40));
      speeds   = Array.from({ length: cols }, () => 0.08 + Math.random() * 0.20);
      lastRow  = Array(cols).fill(-999);
      headChar = Array(cols).fill("");
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, w, h);
    };

    const draw = () => {
      const w = canvas.width  / dpr;
      const h = canvas.height / dpr;

      // Fade trail
      ctx.fillStyle = "rgba(6, 9, 26, 0.04)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FS}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < cols; i++) {
        const row = Math.floor(drops[i]);
        const x   = i * COL_W;
        const y   = row * ROW_H;

        // New row reached — pick a new head char
        if (row !== lastRow[i]) {
          headChar[i] = CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
          lastRow[i]  = row;
        }

        // Repaint head every frame so fade doesn't dim it
        if (headChar[i] && y > 0) {
          ctx.fillStyle  = "#FFFFFF";
          ctx.shadowColor = palette.bright;
          ctx.shadowBlur  = 10;
          ctx.fillText(headChar[i], x, y);
          ctx.shadowBlur  = 0;
        }

        drops[i] += speeds[i];
        if (drops[i] * ROW_H > h && Math.random() > 0.975) {
          drops[i]    = -(Math.random() * 15);
          headChar[i] = "";
          lastRow[i]  = -999;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    setup();
    draw();

    const onResize = () => {
      cancelAnimationFrame(animId);
      setup();
      draw();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [palette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  { Icon: Zap,       title: "Real-Time Judging",    desc: "Submit code and get instant verdicts powered by Judge0. Supports C, C++, Java, and Python." },
  { Icon: Trophy,    title: "Competitive Contests", desc: "ICPC and IOI-style contests with live leaderboards, penalty tracking, and monitoring dashboards." },
  { Icon: Bot,       title: "AI-Powered Hints",     desc: "Stuck? Get guided hints from Gemini AI — directional nudges only, no spoilers." },
  { Icon: BarChart2, title: "Progress Tracking",    desc: "Heatmaps, rating history, language breakdowns — know exactly where you stand." },
  { Icon: Network,   title: "Visualizer",           desc: "Watch your code execute step-by-step with live data structure visualization." },
  { Icon: BookOpen,  title: "Lab Assignments",      desc: "Organizations can create structured labs and track student progress end-to-end." },
];

// ─── HomePage ─────────────────────────────────────────────────────────────────

const HomePage = () => {
  const navigate = useNavigate();
  const palette = useMemo(
    () => PALETTES[Math.floor(Math.random() * PALETTES.length)],
    []
  );
  const [stats, setStats] = useState({ problems: "—", users: "—", submissions: "—" });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [problemsRes, usersRes] = await Promise.all([
          ApiService.getAllProblems({ limit: 1, offset: 0 }).catch(() => null),
          ApiService.getAllUsers({ limit: 1, offset: 0 }).catch(() => null),
        ]);
        setStats((prev) => ({
          ...prev,
          problems:
            problemsRes?.data?.page?.totalElements != null
              ? problemsRes.data.page.totalElements.toLocaleString()
              : "500+",
          users:
            usersRes?.data?.page?.totalElements != null
              ? usersRes.data.page.totalElements.toLocaleString()
              : "1000+",
        }));
      } catch {
        setStats({ problems: "500+", users: "1000+", submissions: "50k+" });
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          padding: "clamp(64px, 12vw, 140px) 24px clamp(80px, 10vw, 130px)",
          overflow: "hidden",
          borderBottom: "1px solid var(--border-subtle)",
          background: "#0A0A0A",
        }}
      >
        {/* Matrix canvas */}
        <MatrixRain palette={palette} />

        {/* Radial read-zone overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 90% at 50% 40%, rgba(6,9,26,0.60) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Bottom fade into next section */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: "120px",
            background: "linear-gradient(to bottom, transparent 0%, #0A0A0A 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Content */}
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 3,
          }}
        >
          {/* Eyebrow */}
          <div
            className="animate-fade-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(6,9,26,0.7)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 16px",
              marginBottom: "32px",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                width: "6px", height: "6px",
                borderRadius: "50%",
                background: "var(--primary)",
                display: "inline-block",
                boxShadow: "var(--glow-primary)",
              }}
            />
            <span className="font-code text-xs uppercase tracking-wider" style={{ color: "var(--primary)" }}>
              TDTU Online Judge
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up delay-1 font-display"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: "0.01em",
              color: "#E8EEF8",
              margin: "0 0 24px",
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            }}
          >
            PROVE YOUR{" "}
            <span
              style={{
                color: "var(--primary)",
                textShadow: "var(--glow-primary)",
              }}
            >
              LOGIC
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="animate-fade-up delay-2"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              lineHeight: 1.7,
              maxWidth: "560px",
              margin: "0 auto 40px",
              color: "rgba(232,238,248,0.75)",
              textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            }}
          >
            The competitive programming arena for Ton Duc Thang University.
            Sharpen your skills, climb the leaderboard, and compete in
            university-grade contests.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up delay-3 flex justify-center flex-wrap gap-3">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate("/problems")}
              style={{ minWidth: "180px" }}
            >
              Start Solving →
            </button>
            <button
              className="btn btn-lg"
              onClick={() => navigate("/contests")}
              style={{
                minWidth: "180px",
                background: "rgba(6,9,26,0.6)",
                border: "1px solid var(--border-strong)",
                color: "#E8EEF8",
                backdropFilter: "blur(8px)",
              }}
            >
              View Contests →
            </button>
          </div>
        </div>
      </section>

      {/* ── STAT BAR ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--bg-raised)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            background: "var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          {[
            { label: "Problems",    value: stats.problems,    Icon: FileCode2 },
            { label: "Members",     value: stats.users,       Icon: Users },
            { label: "Submissions", value: stats.submissions, Icon: Activity },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              style={{
                background: "var(--bg-raised)",
                padding: "28px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                <Icon size={20} color="var(--primary)" strokeWidth={1.75} />
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  fontWeight: 700,
                  color: "var(--primary)",
                  lineHeight: 1,
                  letterSpacing: "0.01em",
                }}
              >
                {value}
              </div>
              <div
                className="text-xs uppercase tracking-wider text-muted"
                style={{ marginTop: "8px", fontWeight: 600 }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p
              className="font-code text-xs uppercase tracking-wider"
              style={{ marginBottom: "12px", color: "var(--primary)" }}
            >
              Platform Features
            </p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 700,
                letterSpacing: "0.01em",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Everything you need to compete
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="card" style={{ cursor: "default" }}>
                <div
                  style={{
                    width: 40, height: 40,
                    borderRadius: "var(--radius-md)",
                    background: "var(--primary-subtle)",
                    border: "1px solid var(--border-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color="var(--primary)" strokeWidth={1.75} />
                </div>
                <h3
                  className="font-display"
                  style={{
                    fontSize: "var(--text-lg)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "0 0 8px",
                    letterSpacing: "0.01em",
                  }}
                >
                  {title}
                </h3>
                <p className="text-sm text-secondary" style={{ margin: 0, lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "80px 24px",
          textAlign: "center",
          background: "var(--bg-raised)",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 700,
              letterSpacing: "0.01em",
              color: "var(--text-primary)",
              margin: "0 0 16px",
            }}
          >
            Ready to climb the rankings?
          </h2>
          <p className="text-secondary text-sm" style={{ marginBottom: "32px", lineHeight: 1.7 }}>
            Join hundreds of students already practicing on TDTUOJ. Create an
            account and start solving today.
          </p>
          <div className="flex justify-center flex-wrap gap-3">
            {ApiService.isAuthenticated() ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate("/problems")}>
                Browse Problems →
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate("/register")}>
                  Create Account
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => navigate("/login")}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
