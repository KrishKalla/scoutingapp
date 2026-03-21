import { useMemo, useRef, useState } from "react";

export default function DriversPracticeMobileView({ goHome }) {
  const [autoArtifacts, setAutoArtifacts] = useState(0);
  const [autoMotif, setAutoMotif] = useState(0);
  const [autoLeave, setAutoLeave] = useState(false);

  const [teleopArtifacts, setTeleopArtifacts] = useState(0);
  const [teleopMotif, setTeleopMotif] = useState(0);

  const [endgamePark, setEndgamePark] = useState("none");

  const videoRef = useRef(null);

  const totalArtifacts = useMemo(() => {
    return autoArtifacts + teleopArtifacts;
  }, [autoArtifacts, teleopArtifacts]);

  const totalMotif = useMemo(() => {
    return autoMotif + teleopMotif;
  }, [autoMotif, teleopMotif]);

  const rpArtifacts = totalArtifacts >= 42;
  const rpMotif = totalMotif >= 11;
  const rpLeaveAndPark = autoLeave && endgamePark === "full";
  const rpTotal =
    Number(rpArtifacts) + Number(rpMotif) + Number(rpLeaveAndPark);

  const startTimerVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <div className="mb-5 rounded-3xl border border-blue-400/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
          <div className="grid grid-cols-[40px_1fr] items-center gap-3">
            <button
              type="button"
              onClick={() => goHome && goHome()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M10.28 4.22a.75.75 0 0 1 0 1.06L5.56 10h12.69a.75.75 0 0 1 0 1.5H5.56l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/80">
                  DRIVER PRACTICE
                </p>
                <span className="rounded-full bg-slate-800/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Mobile View
                </span>
              </div>
              <div className="mt-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Practice Match
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <PracticeSection
            title="Autonomous"
            artifactValue={autoArtifacts}
            motifValue={autoMotif}
            onArtifactIncrement={() => setAutoArtifacts((v) => v + 1)}
            onArtifactDecrement={() => setAutoArtifacts((v) => Math.max(0, v - 1))}
            onMotifIncrement={() => setAutoMotif((v) => v + 1)}
            onMotifDecrement={() => setAutoMotif((v) => Math.max(0, v - 1))}
            showLeave
            leaveValue={autoLeave}
            onToggleLeave={() => setAutoLeave((prev) => !prev)}
          />

          <PracticeSection
            title="TeleOp"
            artifactValue={teleopArtifacts}
            motifValue={teleopMotif}
            onArtifactIncrement={() => setTeleopArtifacts((v) => v + 1)}
            onArtifactDecrement={() => setTeleopArtifacts((v) => Math.max(0, v - 1))}
            onMotifIncrement={() => setTeleopMotif((v) => v + 1)}
            onMotifDecrement={() => setTeleopMotif((v) => Math.max(0, v - 1))}
          />

          <EndgamePracticeSection
            value={endgamePark}
            onChange={setEndgamePark}
          />

          <TimerSection videoRef={videoRef} onStart={startTimerVideo} />

          <TotalsSection
            totalArtifacts={totalArtifacts}
            totalMotif={totalMotif}
          />

          <RPCalculatorSection
            rpArtifacts={rpArtifacts}
            rpMotif={rpMotif}
            rpLeaveAndPark={rpLeaveAndPark}
            rpTotal={rpTotal}
          />
        </div>
      </div>
    </div>
  );
}

function PracticeSection({
  title,
  artifactValue,
  motifValue,
  onArtifactIncrement,
  onArtifactDecrement,
  onMotifIncrement,
  onMotifDecrement,
  showLeave = false,
  leaveValue = false,
  onToggleLeave,
}) {
  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
        {title}
      </p>

      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-transparent bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-100">Artifacts</span>
            <span className="text-xs text-slate-400">Counter</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onArtifactDecrement}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950/35 text-lg font-bold text-slate-300 transition hover:bg-white/10 active:scale-[0.98]"
            >
              −
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-slate-950/50 px-4 py-3">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Artifacts
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                  {artifactValue}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onArtifactIncrement}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-2xl font-bold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:bg-blue-500/25 active:scale-[0.98]"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-transparent bg-slate-950/35 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Motif
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMotifDecrement}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80 text-sm font-bold text-slate-300 transition hover:bg-white/10"
              >
                −
              </button>

              <div className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-white">
                {motifValue}
              </div>

              <button
                type="button"
                onClick={onMotifIncrement}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-sm font-bold text-blue-100 transition hover:bg-blue-500/25"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {showLeave ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-slate-950/35 px-3 py-2.5 text-sm text-slate-200">
            <span className="font-medium">Leave</span>
            <button
              type="button"
              onClick={onToggleLeave}
              aria-pressed={leaveValue}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${
                leaveValue
                  ? "bg-blue-500/30"
                  : "bg-slate-800/70"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600 shadow transition-all duration-200 ${
                  leaveValue ? "translate-x-6" : "translate-x-1"
                }`}
              >
                {leaveValue ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M20.285 6.708a1 1 0 0 1 .007 1.414l-9.19 9.3a1 1 0 0 1-1.43.01L3.71 11.47a1 1 0 1 1 1.414-1.414l4.15 4.15 8.48-8.58a1 1 0 0 1 1.53.082Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : null}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EndgamePracticeSection({ value, onChange }) {
  const options = [
    { label: "None", value: "none" },
    { label: "Partial", value: "partial" },
    { label: "Full", value: "full" },
  ];

  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
        Endgame
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                "rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-blue-500/20 text-blue-100"
                  : "bg-slate-950/35 text-slate-300 hover:bg-white/10",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimerSection({ videoRef, onStart }) {
  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
          Match Timer
        </p>
        <div className="rounded-full bg-slate-950/45 px-2.5 py-1 text-[11px] font-medium text-slate-400">
          FTC Video
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-2xl bg-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:bg-blue-500/25 active:scale-[0.99]"
        >
          Start Match Timer
        </button>

        <div className="overflow-hidden rounded-2xl border border-transparent bg-slate-950/50">
          <video
            ref={videoRef}
            controls
            playsInline
            webkit-playsinline="true"
            className="w-full bg-black"
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            >
            <source src="/videos/ftc-match-timer.mp4" type="video/mp4" />
            </video>
        </div>
      </div>
    </div>
  );
}

function TotalsSection({ totalArtifacts, totalMotif }) {
  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
        Totals
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-950/35 p-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Artifacts
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {totalArtifacts}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/35 p-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Motif
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {totalMotif}
          </p>
        </div>
      </div>
    </div>
  );
}

function RPStatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/35 px-3 py-3">
      <p className="text-sm leading-5 text-slate-200">{label}</p>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          value
            ? "bg-emerald-500/15 text-emerald-200"
            : "bg-slate-700/70 text-slate-300"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

function RPCalculatorSection({
  rpArtifacts,
  rpMotif,
  rpLeaveAndPark,
  rpTotal,
}) {
  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
          RP Calculator
        </p>
        <div className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
          {rpTotal + 3} / 6
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <RPStatusRow
          label="ARTIFACT RP"
          value={rpArtifacts}
        />
        <RPStatusRow
          label="MOTIF RP"
          value={rpMotif}
        />
        <RPStatusRow
          label="PARK RP"
          value={rpLeaveAndPark}
        />
      </div>
    </div>
  );
}