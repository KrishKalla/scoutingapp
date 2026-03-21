import { useState } from "react";

export default function CompetitionHomeDesktopView({ goToScoutingPage = (code) => console.log("Begin scouting:", code) }) {
  const [eventCode, setEventCode] = useState("");

  const handleSubmit = () => {
    // use placeholder as default if empty
    const cleaned = (eventCode.trim() || "USNHCMP").toUpperCase();
    goToScoutingPage(cleaned);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.left}>
          <h1 style={styles.title}>
            Welcome to <br />
            <span style={styles.highlight}>SURFACE</span> SCOUTING
          </h1>
        </div>

        <div style={styles.right}>
          <div style={styles.form}>
            <div style={styles.formHeader}>
              <div style={styles.formTitle}>Open Event</div>
              <div style={styles.formSubtitle}>Enter your FTC event code</div>
            </div>

            <input
              type="text"
              value={eventCode}
              placeholder="USNHCMP"
              onChange={(e) => setEventCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              style={styles.input}
              autoFocus
            />

            <button
              onClick={handleSubmit}
              style={styles.button}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#13b0d4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
              }}
            >
              Begin Scouting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top left, #1a1a1a 0%, #0f0f10 50%, #070707 100%)",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "1200px",
    height: "700px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    borderRadius: "26px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 70px rgba(0,0,0,0.5)",
    background: "rgba(20,20,22,0.85)",
    backdropFilter: "blur(12px)",
  },

  left: {
    padding: "70px 60px",
    display: "flex",
    alignItems: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  },

  title: {
    fontSize: "72px",
    fontWeight: 800,
    lineHeight: 1.05,
    color: "#ffffff",
  },

  highlight: {
    color: "#13b0d4",
    textShadow: "0 0 18px rgba(19,176,212,0.25)",
  },

  right: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))",
    borderLeft: "1px solid rgba(255,255,255,0.06)",
  },

  form: {
    width: "100%",
    maxWidth: "360px",
  },

  formHeader: {
    marginBottom: "18px",
  },

  formTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },

  formSubtitle: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.6)",
  },

  input: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f0f10",
    color: "#ffffff",
    fontSize: "16px",
    marginBottom: "14px",
    outline: "none",
    caretColor: "#13b0d4",
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#ffffff",
    color: "#000000",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};
