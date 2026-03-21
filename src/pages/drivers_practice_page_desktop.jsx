import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cxgdcadavykefnpzjcuk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SwP95IDavUGLKADXLMosJA_vwdsTV0b";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const DEFAULT_VIDEO = "/videos/ftc-match-timer.mp4";
const NOTES_TABLE = "drivers_practice_notes";

function createInitialState() {
  return {
    autoClassified: 0,
    autoOverflow: 0,
    autoLeave: false,
    teleopClassified: 0,
    teleopOverflow: 0,
    endgamePark: "none",
    rampPenalty: 0,
    controlPenalty: 0,
    parkingPenalty: 0,
    shotOutOfZone: 0,
  };
}

function createEmptyMotifRow() {
  return Array.from({ length: 9 }, () => "empty");
}

function getRandomMotifPattern() {
  const patterns = ["PGP", "GPP", "PPG"];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function getExpectedMotifColor(pattern, index) {
  const char = pattern[index % pattern.length];
  return char === "P" ? "purple" : "green";
}

function getMotifScore(row, pattern) {
  return row.reduce((sum, cell, index) => {
    return sum + (cell === getExpectedMotifColor(pattern, index) ? 1 : 0);
  }, 0);
}

function formatPracticeNoteLabel(note, fallbackIndex) {
  const createdAt = note?.created_at ? new Date(note.created_at) : null;
  const dateLabel = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "Unknown";
  const practiceIndex = note?.practice_index ?? fallbackIndex;
  return `${dateLabel}, P${practiceIndex}`;
}

function StatStepper({ label, value, onChange, min = 0, max = 99, accent = false }) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div style={styles.statCard}>
      <div style={styles.statCardTop}>
        <div style={styles.statLabel}>{label}</div>
        <div style={accent ? styles.statBadgeAccent : styles.statBadge}>Count</div>
      </div>
      <div style={styles.stepperRow}>
        <button type="button" style={styles.stepperButton} onClick={decrement}>
          −
        </button>
        <div style={styles.stepperValue}>{value}</div>
        <button type="button" style={styles.stepperButtonAccent} onClick={increment}>
          +
        </button>
      </div>
    </div>
  );
}

function SegmentedOptions({ label, value, onChange, options }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statCardTop}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statBadge}>{String(value).toUpperCase()}</div>
      </div>
      <div style={styles.segmentedRow}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              style={{
                ...styles.segmentButton,
                ...(active ? styles.segmentButtonActive : {}),
              }}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RpCheck({ passed, label }) {
  return (
    <div style={{ ...styles.rpRow, ...(passed ? styles.rpRowPassed : {}) }}>
      <div style={{ ...styles.rpDot, ...(passed ? styles.rpDotPassed : {}) }} />
      <div style={styles.rpLabel}>{label}</div>
      <div style={passed ? styles.rpValuePassed : styles.rpValueFailed}>{passed ? "Met" : "Open"}</div>
    </div>
  );
}

function MotifRow({ label, pattern, cells, onToggle }) {
  return (
    <div style={styles.motifRowCard}>
      <div style={styles.motifRowHeaderTop}>
        <div style={styles.motifRowTitle}>{label}</div>
        <div style={styles.motifRowScore}>{getMotifScore(cells, pattern)} / 9</div>
      </div>

      <div style={styles.motifRowSubtitle}>Pattern: {pattern.repeat(3)}</div>

      <div style={styles.motifInlineRow}>
        <div style={styles.motifRampLabel}>Ramp</div>

        <div style={styles.motifGridInline}>
          {cells.map((cell, index) => {
            const expected = getExpectedMotifColor(pattern, index);
            const isCorrect = cell === expected;
            return (
              <button
                key={`${label}-${index}`}
                type="button"
                style={{
                  ...styles.motifCell,
                  ...(cell === "purple" ? styles.motifCellPurple : {}),
                  ...(cell === "green" ? styles.motifCellGreen : {}),
                  ...(cell === "empty" ? styles.motifCellEmpty : {}),
                  ...(isCorrect ? styles.motifCellCorrect : {}),
                }}
                onClick={() => onToggle(index)}
                title={`Expected: ${expected}`}
              >
                <div style={styles.motifCellIndex}>{index + 1}</div>
                <div style={styles.motifCellStatus}>{isCorrect ? "Yes" : "No"}</div>
              </button>
            );
          })}
        </div>

        <div style={styles.motifSquareIcon} />
      </div>
    </div>
  );
}

export default function DriversPracticeDesktopView({
  goBackToScouting = () => {},
  goHome = () => {},
  videoSrc = DEFAULT_VIDEO,
}) {
  const videoRef = useRef(null);
  const [state, setState] = useState(createInitialState());
  const [motifPattern, setMotifPattern] = useState(getRandomMotifPattern());
  const [autoMotifRow, setAutoMotifRow] = useState(createEmptyMotifRow());
  const [teleopMotifRow, setTeleopMotifRow] = useState(createEmptyMotifRow());
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  const updateField = (field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  const nextPracticeIndex = useMemo(() => {
    return notes.reduce((maxValue, note) => Math.max(maxValue, Number(note.practice_index) || 0), 0) + 1;
  }, [notes]);

  const autoTotal = useMemo(
    () => state.autoClassified + state.autoOverflow,
    [state.autoClassified, state.autoOverflow]
  );

  const teleopTotal = useMemo(
    () => state.teleopClassified + state.teleopOverflow,
    [state.teleopClassified, state.teleopOverflow]
  );

  const totalArtifacts = useMemo(() => autoTotal + teleopTotal, [autoTotal, teleopTotal]);
  const totalClassified = useMemo(
    () => state.autoClassified + state.teleopClassified,
    [state.autoClassified, state.teleopClassified]
  );
  const totalOverflow = useMemo(
    () => state.autoOverflow + state.teleopOverflow,
    [state.autoOverflow, state.teleopOverflow]
  );
  const totalMotifs = useMemo(
    () => getMotifScore(autoMotifRow, motifPattern) + getMotifScore(teleopMotifRow, motifPattern),
    [autoMotifRow, teleopMotifRow, motifPattern]
  );

  const rpChecks = useMemo(
    () => [
      { label: "Artifact (≥ 42 total)", passed: totalArtifacts >= 42 },
      { label: "Motif (≥ 11 total)", passed: totalMotifs >= 11 },
      { label: "Park (Leave + Full)", passed: state.autoLeave && state.endgamePark === "full" },
    ],
    [totalArtifacts, totalMotifs, state.autoLeave, state.endgamePark]
  );

  const completedRpCount = rpChecks.filter((item) => item.passed).length;

  const totalScore = useMemo(() => {
    const parkPoints =
      state.endgamePark === "full" ? 10 : state.endgamePark === "partial" ? 5 : 0;

    return (
      3 * totalClassified +
      totalOverflow +
      2 * totalMotifs +
      (state.autoLeave ? 3 : 0) +
      parkPoints
    );
  }, [totalClassified, totalOverflow, totalMotifs, state.autoLeave, state.endgamePark]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      setNotesLoading(true);
      setNotesError("");

      try {
        const response = await supabase
          .from(NOTES_TABLE)
          .select("*")
          .order("created_at", { ascending: false });

        if (response.error) throw response.error;
        if (cancelled) return;

        const loadedNotes = response.data ?? [];
        setNotes(loadedNotes);

        if (loadedNotes.length > 0) {
          setSelectedNoteId((prev) => prev ?? loadedNotes[0].id);
          setNoteDraft((prev) => (prev ? prev : loadedNotes[0].note_text ?? ""));
        }
      } catch (error) {
        if (!cancelled) {
          setNotesError(error?.message || "Failed to load notes.");
        }
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    }

    loadNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedNote) {
      setNoteDraft(selectedNote.note_text ?? "");
    } else if (!notes.length) {
      setNoteDraft("");
    }
  }, [selectedNote, notes.length]);

  const saveCurrentNote = async () => {
    setNotesError("");

    if (selectedNote) {
      const updatedPayload = {
        ...selectedNote,
        note_text: noteDraft,
        updated_at: new Date().toISOString(),
      };

      setNotes((prev) => prev.map((note) => (note.id === selectedNote.id ? updatedPayload : note)));

      const response = await supabase
        .from(NOTES_TABLE)
        .update({ note_text: noteDraft, updated_at: updatedPayload.updated_at })
        .eq("id", selectedNote.id)
        .select()
        .single();

      if (response.error) {
        setNotesError(response.error.message || "Failed to save note.");
      } else if (response.data) {
        setNotes((prev) => prev.map((note) => (note.id === response.data.id ? response.data : note)));
      }
      return;
    }

    const insertPayload = {
      practice_index: nextPracticeIndex,
      note_text: noteDraft,
    };

    const response = await supabase.from(NOTES_TABLE).insert(insertPayload).select().single();

    if (response.error) {
      setNotesError(response.error.message || "Failed to create note.");
      return;
    }

    if (response.data) {
      setNotes((prev) => [response.data, ...prev]);
      setSelectedNoteId(response.data.id);
      setNoteDraft(response.data.note_text ?? "");
    }
  };

  const createNewNote = () => {
    setSelectedNoteId(null);
    setNoteDraft("");
    setNotesError("");
  };

  const selectPreviousNote = (noteId) => {
    setSelectedNoteId(noteId);
    setNotesError("");
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const handleTimeUpdate = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      setVideoDuration(duration);
      setVideoProgress(duration > 0 ? current / duration : 0);
      setIsPlaying(!video.paused);
    };

    const handleLoadedMetadata = () => {
      setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handleTimeUpdate);
    video.addEventListener("pause", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handleTimeUpdate);
      video.removeEventListener("pause", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // Ignore playback failure.
      }
    } else {
      video.pause();
    }
  };

  const resetSession = () => {
    setState(createInitialState());
    setMotifPattern(getRandomMotifPattern());
    setAutoMotifRow(createEmptyMotifRow());
    setTeleopMotifRow(createEmptyMotifRow());
  };

  const randomizeMotifPattern = () => {
    setMotifPattern(getRandomMotifPattern());
    setAutoMotifRow(createEmptyMotifRow());
    setTeleopMotifRow(createEmptyMotifRow());
  };

  const cycleMotifColor = (rowSetter, index) => {
    rowSetter((prev) => {
      const next = [...prev];
      const current = next[index];
      next[index] = current === "empty" ? "purple" : current === "purple" ? "green" : "empty";
      return next;
    });
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.pause();
    setVideoProgress(0);
    setIsPlaying(false);
  };

  const seekVideo = (event) => {
    const video = videoRef.current;
    if (!video || !videoDuration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    video.currentTime = ratio * videoDuration;
    setVideoProgress(ratio);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.secondaryButton} onClick={goBackToScouting}>
              ← Back
            </button>
            <div>
              <div style={styles.headerEyebrow}>SURFACE SCOUTING</div>
              <div style={styles.headerTitle}>Drivers Practice</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.headerChip}>Desktop Practice</div>
            <button style={styles.secondaryButton} onClick={resetSession}>
              Reset Counters
            </button>
          </div>
        </div>

        <div style={styles.mainGrid}>
          <div style={styles.videoPanel}>
            <div style={styles.videoShell}>
              <video
                ref={videoRef}
                src={videoSrc}
                style={styles.video}
                muted
                playsInline
                controls={false}
                preload="metadata"
              />
              <div style={styles.videoOverlayTop}>
                <div style={styles.videoTag}>Match Timer</div>
                <div style={styles.videoMeta}>{isPlaying ? "Playing" : "Paused"}</div>
              </div>
              <div style={styles.videoOverlayBottom}>
                <div style={styles.progressTrack} onClick={seekVideo}>
                  <div style={{ ...styles.progressFill, width: `${videoProgress * 100}%` }} />
                </div>
                <div style={styles.videoControls}>
                  <div style={styles.videoControlGroup}>
                    <button type="button" style={styles.videoButtonPrimary} onClick={togglePlayback}>
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button type="button" style={styles.videoButton} onClick={restartVideo}>
                      Restart
                    </button>
                    <button type="button" style={styles.videoButton} onClick={toggleMute}>
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                  </div>
                  <div style={styles.videoTimeText}>
                    {Math.floor((videoProgress * videoDuration) || 0)}s / {Math.floor(videoDuration || 0)}s
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <div style={styles.sectionTitle}>Motif Tracker</div>
                <div style={styles.videoControlGroup}>
                  <div style={styles.patternPill}>
                    {motifPattern.split("").map((char, index) => {
                      const isPurple = char === "P";
                      return (
                        <div
                          key={`${motifPattern}-${index}`}
                          style={{
                            ...styles.patternCircle,
                            ...(isPurple ? styles.patternCirclePurple : styles.patternCircleGreen),
                          }}
                        >
                          {char}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" style={styles.videoButton} onClick={randomizeMotifPattern}>
                    Randomize
                  </button>
                </div>
              </div>

              <div style={styles.motifLegend}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendSwatch, ...styles.motifCellPurple }} /> Purple
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendSwatch, ...styles.motifCellGreen }} /> Green
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendSwatch, ...styles.motifCellEmpty }} /> Empty
                </div>
              </div>

              <div style={styles.motifTrackerStack}>
                <MotifRow
                  label="Autonomous"
                  pattern={motifPattern}
                  cells={autoMotifRow}
                  onToggle={(index) => cycleMotifColor(setAutoMotifRow, index)}
                />
                <MotifRow
                  label="TeleOp"
                  pattern={motifPattern}
                  cells={teleopMotifRow}
                  onToggle={(index) => cycleMotifColor(setTeleopMotifRow, index)}
                />
              </div>
            </div>
          </div>

          <div style={styles.rightPanel}>
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <div style={styles.sectionTitle}>Autonomous</div>
                <div style={styles.sectionTotal}>Total {autoTotal}</div>
              </div>
              <div style={styles.autoGrid}>
                <StatStepper
                  label="Classified"
                  value={state.autoClassified}
                  onChange={(value) => updateField("autoClassified", value)}
                  accent
                />
                <StatStepper
                  label="Overflow"
                  value={state.autoOverflow}
                  onChange={(value) => updateField("autoOverflow", value)}
                />
                <div style={styles.leaveContainer}>
                  <div style={styles.leaveLabel}>Leave</div>
                  <button
                    type="button"
                    onClick={() => updateField("autoLeave", !state.autoLeave)}
                    style={{
                      ...styles.smallToggle,
                      ...(state.autoLeave ? styles.smallToggleActive : {}),
                    }}
                  >
                    {state.autoLeave ? "Yes" : "No"}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <div style={styles.sectionTitle}>TeleOp</div>
                <div style={styles.sectionTotal}>Total {teleopTotal}</div>
              </div>
              <div style={styles.teleopGrid}>
                <StatStepper
                  label="Classified"
                  value={state.teleopClassified}
                  onChange={(value) => updateField("teleopClassified", value)}
                  accent
                />
                <StatStepper
                  label="Overflow"
                  value={state.teleopOverflow}
                  onChange={(value) => updateField("teleopOverflow", value)}
                />
                <div style={styles.teleopFullRow}>
                  <SegmentedOptions
                    label="Endgame Park"
                    value={state.endgamePark}
                    onChange={(value) => updateField("endgamePark", value)}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Partial", value: "partial" },
                      { label: "Full", value: "full" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <div style={styles.sectionTitle}>Total</div>
              </div>
              <div style={styles.rpSummaryRowThree}>
                <div style={styles.rpSummaryCard}>
                  <div style={styles.rpSummaryLabel}>Artifacts</div>
                  <div style={styles.rpSummaryValue}>{totalArtifacts}</div>
                </div>
                <div style={styles.rpSummaryCard}>
                  <div style={styles.rpSummaryLabel}>Motifs</div>
                  <div style={styles.rpSummaryValue}>{totalMotifs}</div>
                </div>
                <div style={styles.rpSummaryCard}>
                  <div style={styles.rpSummaryLabel}>Total Score</div>
                  <div style={styles.rpSummaryValue}>{totalScore}</div>
                </div>
              </div>
            </div>

            <div style={styles.bottomDualGrid}>
              <div style={{ ...styles.sectionCard, ...styles.rpCardCompact }}>
                <div style={styles.sectionHeaderRow}>
                  <div style={styles.sectionTitle}>RP Thresholds</div>
                  <div style={styles.sectionTotal}>{completedRpCount} / {rpChecks.length}</div>
                </div>
                <div style={styles.rpListXLarge}>
                  {rpChecks.map((check) => (
                    <RpCheck key={check.label} passed={check.passed} label={check.label} />
                  ))}
                </div>
              </div>

              <div style={{ ...styles.sectionCard, ...styles.notesCard }}>
                <div style={styles.sectionHeaderRow}>
                  <div style={styles.sectionTitle}>Notes</div>
                  <div style={styles.notesHeaderActions}>
                    <select
                      style={styles.notesSelect}
                      value={selectedNoteId ?? "draft"}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "draft") {
                          createNewNote();
                        } else {
                          selectPreviousNote(value);
                        }
                      }}
                    >
                      <option value="draft">Draft, P{nextPracticeIndex}</option>
                      {notes.map((note, index) => (
                        <option key={note.id} value={note.id}>
                          {formatPracticeNoteLabel(note, notes.length - index)}
                        </option>
                      ))}
                    </select>
                    <button type="button" style={styles.videoButtonPrimary} onClick={saveCurrentNote}>
                      Save
                    </button>
                  </div>
                </div>

                {notesLoading ? <div style={styles.notesInlineMessage}>Loading notes...</div> : null}
                {notesError ? <div style={styles.notesError}>{notesError}</div> : null}

                <div style={styles.notesEditorPaneSolo}>
                  <div style={styles.notesEditorMeta}>
                    {selectedNote
                      ? formatPracticeNoteLabel(selectedNote, selectedNote.practice_index)
                      : `Draft, P${nextPracticeIndex}`}
                  </div>
                  <textarea
                    style={styles.notesTextarea}
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="Add match notes here..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "radial-gradient(circle at top left, #1a1a1a 0%, #0f0f10 50%, #070707 100%)",
    color: "#ffffff",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "24px",
    boxSizing: "border-box",
  },
  shell: {
    height: "calc(100vh - 48px)",
    borderRadius: "26px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 70px rgba(0,0,0,0.5)",
    background: "rgba(20,20,22,0.88)",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "16px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  headerEyebrow: {
    fontSize: "12px",
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.58)",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  headerTitle: { fontSize: "28px", fontWeight: 800, color: "#ffffff" },
  headerChip: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(19,176,212,0.28)",
    background: "rgba(19,176,212,0.12)",
    color: "#9feaff",
    fontWeight: 700,
  },
  secondaryButton: {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  mainGrid: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "1.45fr 0.95fr",
    gap: "18px",
    padding: "18px",
  },
  videoPanel: {
    minHeight: 0,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingRight: "4px",
  },
  videoShell: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#000000",
    boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    background: "#000000",
  },
  videoOverlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    background: "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0))",
  },
  videoTag: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.42)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  videoMeta: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.42)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: "12px",
    fontWeight: 700,
  },
  videoOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "16px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.62), rgba(0,0,0,0))",
  },
  progressTrack: {
    height: "8px",
    width: "100%",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.14)",
    overflow: "hidden",
    cursor: "pointer",
    marginBottom: "14px",
  },
  progressFill: {
    height: "100%",
    background: "#13b0d4",
    borderRadius: "999px",
  },
  videoControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  videoControlGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  videoButtonPrimary: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(19,176,212,0.28)",
    background: "rgba(19,176,212,0.16)",
    color: "#9feaff",
    fontWeight: 800,
    cursor: "pointer",
  },
  videoButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  videoTimeText: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.78)",
    fontVariantNumeric: "tabular-nums",
  },
  rightPanel: {
    minHeight: 0,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingRight: "4px",
  },
  bottomDualGrid: {
    display: "grid",
    gridTemplateColumns: "0.95fr 1.05fr",
    gap: "14px",
    alignItems: "stretch",
    flex: 1,
    minHeight: 0,
  },
  sectionCard: {
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: "16px",
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 800,
  },
  sectionTotal: {
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid rgba(19,176,212,0.22)",
    background: "rgba(19,176,212,0.10)",
    color: "#9feaff",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  autoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: "12px",
    alignItems: "stretch",
  },
  teleopGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  teleopFullRow: {
    gridColumn: "span 2",
  },
  statCard: {
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.025)",
    padding: "14px",
    minWidth: 0,
    minHeight: "120px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  statCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    marginBottom: "12px",
  },
  statLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#ffffff",
  },
  statBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.65)",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  statBadgeAccent: {
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(19,176,212,0.12)",
    color: "#9feaff",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  stepperRow: {
    display: "grid",
    gridTemplateColumns: "48px 1fr 48px",
    gap: "10px",
    alignItems: "center",
  },
  stepperButton: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontSize: "22px",
    cursor: "pointer",
  },
  stepperButtonAccent: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid rgba(19,176,212,0.24)",
    background: "rgba(19,176,212,0.14)",
    color: "#9feaff",
    fontSize: "22px",
    cursor: "pointer",
  },
  stepperValue: {
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f0f10",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: "24px",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  segmentedRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  },
  segmentButton: {
    padding: "11px 10px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 700,
    cursor: "pointer",
  },
  segmentButtonActive: {
    border: "1px solid rgba(19,176,212,0.24)",
    background: "rgba(19,176,212,0.14)",
    color: "#9feaff",
  },
  smallToggle: {
    padding: "6px 12px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  smallToggleActive: {
    border: "1px solid rgba(19,176,212,0.3)",
    background: "rgba(19,176,212,0.15)",
    color: "#9feaff",
  },
  leaveContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    minWidth: "70px",
  },
  leaveLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.5)",
    fontWeight: 700,
  },
  rpCard: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
    justifyContent: "space-between",
  },
  rpCardCompact: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    flex: 1,
  },
  notesCard: {
    minHeight: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  notesHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  notesSelect: {
    minWidth: "150px",
    maxWidth: "190px",
    padding: "9px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    outline: "none",
  },
  notesInlineMessage: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    marginBottom: "8px",
  },
  notesEditorPaneSolo: {
    flex: 1,
    minHeight: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  
  
  notesEditorMeta: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#9feaff",
    marginBottom: "10px",
  },
  notesTextarea: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    boxSizing: "border-box",
    resize: "none",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0f0f10",
    color: "#ffffff",
    padding: "14px",
    outline: "none",
    fontSize: "14px",
    lineHeight: 1.5,
    height: "100%",
  },
  notesEmpty: {
    color: "rgba(255,255,255,0.55)",
    fontSize: "13px",
    marginBottom: "8px",
  },
  notesError: {
    color: "#fca5a5",
    fontSize: "13px",
    marginBottom: "8px",
  },
  penaltyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  rpSummaryRowThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },
  rpSummaryCard: {
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.025)",
    padding: "14px",
  },
  rpSummaryLabel: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.58)",
    marginBottom: "6px",
  },
  rpSummaryValue: {
    fontSize: "28px",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  rpList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  rpListLarge: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "auto",
  },
  rpListXLarge: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  rpRow: {
    display: "grid",
    gridTemplateColumns: "12px 1fr auto",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.025)",
    minHeight: "48px",
  },
  rpRowPassed: {
    border: "1px solid rgba(19,176,212,0.22)",
    background: "rgba(19,176,212,0.08)",
  },
  rpDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
  },
  rpDotPassed: {
    background: "#13b0d4",
  },
  rpLabel: {
    fontSize: "14px",
    color: "#ffffff",
    fontWeight: 700,
  },
  rpValuePassed: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#9feaff",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  rpValueFailed: {
    fontSize: "12px",
    fontWeight: 800,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  patternPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  patternCircle: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    border: "1px solid rgba(255,255,255,0.16)",
  },
  patternCirclePurple: {
    background: "rgba(168,85,247,0.28)",
    color: "#f3e8ff",
    border: "1px solid rgba(168,85,247,0.45)",
  },
  patternCircleGreen: {
    background: "rgba(34,197,94,0.24)",
    color: "#dcfce7",
    border: "1px solid rgba(34,197,94,0.42)",
  },
  motifTrackerStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  motifLegend: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "12px",
    color: "rgba(255,255,255,0.72)",
    fontSize: "13px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  legendSwatch: {
    width: "14px",
    height: "14px",
    borderRadius: "4px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  motifRowCard: {
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.025)",
    padding: "14px",
  },
  motifRowHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "6px",
  },
  motifRampLabel: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  },
  motifSquareIcon: {
    width: "14px",
    height: "14px",
    borderRadius: "3px",
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.1)",
  },
  motifRowTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#ffffff",
  },
  motifRowSubtitle: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.58)",
    marginTop: "4px",
    letterSpacing: "0.06em",
  },
  motifRowScore: {
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid rgba(19,176,212,0.22)",
    background: "rgba(19,176,212,0.10)",
    color: "#9feaff",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  motifInlineRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: "12px",
    marginTop: "10px",
  },
  motifGridInline: {
    display: "grid",
    gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
    gap: "8px",
  },
  motifCell: {
    minHeight: "58px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  motifCellEmpty: {
    background: "rgba(255,255,255,0.035)",
  },
  motifCellPurple: {
    background: "rgba(168,85,247,0.32)",
    border: "1px solid rgba(168,85,247,0.5)",
  },
  motifCellGreen: {
    background: "rgba(34,197,94,0.28)",
    border: "1px solid rgba(34,197,94,0.45)",
  },
  motifCellCorrect: {
    boxShadow: "0 0 0 1px rgba(19,176,212,0.35) inset",
  },
  motifCellIndex: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.68)",
    fontWeight: 700,
  },
  motifCellStatus: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 800,
  },
};
