const KEY = {
  base: {
    width: 6, height: 6, background: "#444", float: "left",
    margin: 1, borderRadius: 2, boxShadow: "0 -2px 0 #222",
    transform: "translateZ(-2px)",
  },
  fn: { width: 6, height: 3, background: "#444", float: "left", margin: 1, borderRadius: 2, boxShadow: "0 -2px 0 #222", transform: "translateZ(-2px)" },
  space: { width: 45, height: 6, background: "#444", float: "left", margin: 1, borderRadius: 2, boxShadow: "0 -2px 0 #222", transform: "translateZ(-2px)" },
};

const MacbookAnimation = () => (
  <div
    className="macbook-container"
    style={{
      width: 150, height: 96,
      position: "absolute",
      left: "50%", top: "50%",
      marginTop: -85, marginLeft: -78,
    }}
  >
    <div
      className="macbook-inner custom-animate-rotate"
      style={{ zIndex: 20, position: "absolute", width: 150, height: 96, left: 0, top: 0 }}
    >
      {/* ── Screen lid ── */}
      <div
        className="macbook-screen custom-animate-lid-screen"
        style={{
          width: 150, height: 96,
          position: "absolute", left: 0, bottom: 0,
          borderRadius: 7,
          background: "#ddd",
          backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 100%)",
          backgroundPosition: "left bottom",
          backgroundSize: "300px 300px",
          boxShadow: "inset 0 3px 7px rgba(255,255,255,0.5)",
        }}
      >
        <div
          className="macbook-screen-face-one"
          style={{
            width: 150, height: 96,
            position: "absolute", left: 0, bottom: 0,
            borderRadius: 7,
            background: "#d3d3d3",
            backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          {/* Camera dot */}
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#000", position: "absolute", left: "50%", top: 4, marginLeft: -1.5 }} />
          {/* Screen bezel */}
          <div style={{ width: 130, height: 74, margin: 10, background: "#000", backgroundSize: "100% 100%", borderRadius: 1, position: "relative", boxShadow: "inset 0 0 2px rgba(0,0,0,1)" }}>
            <div
              className="custom-animate-screen-shade"
              style={{
                position: "absolute", left: 0, top: 0, width: 130, height: 74,
                backgroundImage: "linear-gradient(-135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 47%, rgba(255,255,255,0) 48%)",
                backgroundSize: "300px 200px",
                backgroundPosition: "0px 0px",
              }}
            />
          </div>
          <span style={{ position: "absolute", top: 85, left: 57, fontSize: 6, color: "#666" }}>MacBook Air</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div
        className="macbook-body custom-animate-lid-macbody"
        style={{
          width: 150, height: 96,
          position: "absolute", left: 0, bottom: 0,
          borderRadius: 7,
          background: "#cbcbcb",
          backgroundImage: "linear-gradient(45deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div
          className="macbook-body-face-one custom-animate-lid-keyboard-area"
          style={{
            width: 150, height: 96,
            position: "absolute", left: 0, bottom: 0,
            borderRadius: 7,
            background: "#dfdfdf",
            backgroundImage: "linear-gradient(30deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          {/* Trackpad */}
          <div style={{
            width: 40, height: 31,
            position: "absolute", left: "50%", top: "50%",
            borderRadius: 4, marginTop: -44, marginLeft: -18,
            background: "#cdcdcd",
            backgroundImage: "linear-gradient(30deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 100%)",
            boxShadow: "inset 0 0 3px #888",
          }} />

          {/* Keyboard */}
          <div
            className="macbook-keyboard"
            style={{
              width: 130, height: 45,
              position: "absolute", left: 7, top: 41,
              borderRadius: 4,
              background: "#cdcdcd",
              backgroundImage: "linear-gradient(30deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 100%)",
              boxShadow: "inset 0 0 3px #777",
              paddingLeft: 2,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 58 }).map((_, i) => (
              <div key={`k${i}`} className="macbook-key custom-animate-keys" style={KEY.base} />
            ))}
            <div className="macbook-key custom-animate-keys" style={KEY.space} />
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={`f${i}`} className="macbook-key custom-animate-keys" style={KEY.fn} />
            ))}
          </div>
        </div>

        {/* Corner screws */}
        {[{ left: 20, top: 20 }, { right: 20, top: 20 }, { right: 20, bottom: 20 }, { left: 20, bottom: 20 }].map((pos, i) => (
          <div key={i} style={{ width: 5, height: 5, background: "#333", borderRadius: "50%", position: "absolute", ...pos }} />
        ))}
      </div>
    </div>

    {/* ── Shadow ── */}
    <div
      className="macbook-shadow custom-animate-macbook-shadow"
      style={{ position: "absolute", width: 60, height: 0, left: 40, top: 160 }}
    />
  </div>
);

export default MacbookAnimation;
