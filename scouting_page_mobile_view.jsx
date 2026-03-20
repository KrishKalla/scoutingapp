import { useMemo, useState } from "react";

export default function TeamListMobileView() {
    const [sortBy, setSortBy] = useState("number");
  const [autoFilterSide, setAutoFilterSide] = useState(null);
  const [autoFilterThreshold, setAutoFilterThreshold] = useState("all");
  const [showAutoFilter, setShowAutoFilter] = useState(false);
  const [teams, setTeams] = useState([
    {
      number: 11211,
      name: "Circuit Breakers",
      opr: 38.4,
      wlt: "8-2-0",
      rp: 22,
      endgamePark: "full",
      autoClose: "12",
      autoFar: "6",
      autoLeave: true,
      teleopCount: 18,
      misc: "Driver communication is calm and efficient. Good alliance coordination.",
    },
    {
      number: 13456,
      name: "Blue Voltage",
      opr: 34.9,
      wlt: "7-3-0",
      rp: 20,
      endgamePark: "partial",
      autoClose: "9",
      autoFar: "3",
      autoLeave: true,
      teleopCount: 14,
      misc: "Worth considering as a dependable elimination partner.",
    },
    {
      number: 14567,
      name: "Titan Torque",
      opr: 29.1,
      wlt: "6-4-0",
      rp: 17,
      endgamePark: "ascent",
      autoClose: "6",
      autoFar: "0",
      autoLeave: false,
      teleopCount: 11,
      misc: "Strong fundamentals. Good pick when consistency matters.",
    },
    {
      number: 16789,
      name: "Polar Gears",
      opr: 41.7,
      wlt: "9-1-0",
      rp: 25,
      endgamePark: "full",
      autoClose: "15",
      autoFar: "9",
      autoLeave: true,
      teleopCount: 24,
      misc: "One of the strongest robots at the event. High strategic value.",
    },
    ]);

  const updateTeamField = (teamNumber, field, value) => {
    setTeams((prevTeams) =>
      prevTeams.map((team) =>
        team.number === teamNumber ? { ...team, [field]: value } : team
      )
    );
  };

  const filteredAndSortedTeams = useMemo(() => {
    const parseAutoValue = (value) => {
      if (value === "21+") return 21;
      return Number(value) || 0;
    };

    const filteredTeams = teams.filter((team) => {
      if (!autoFilterSide || autoFilterThreshold === "all") {
        return true;
      }

      const threshold = parseAutoValue(autoFilterThreshold);

      if (autoFilterSide === "close") {
        return parseAutoValue(team.autoClose) >= threshold;
      }

      if (autoFilterSide === "far") {
        return parseAutoValue(team.autoFar) >= threshold;
      }

      return true;
    });

    return filteredTeams.sort((a, b) => {
      if (sortBy === "opr") return b.opr - a.opr;
      if (sortBy === "rp") return b.rp - a.rp;
      return a.number - b.number;
    });
  }, [teams, sortBy, autoFilterSide, autoFilterThreshold]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <div className="mb-5 rounded-3xl border border-blue-400/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M10.28 4.22a.75.75 0 0 1 0 1.06L5.56 10h12.69a.75.75 0 0 1 0 1.5H5.56l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/80">
                SURFACE SCOUTING
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Team List
              </h1>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-800/70 px-3 py-2 text-right shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Mobile View
              </p>
              <p className="text-sm font-semibold text-blue-100">
                {sortBy === "number" && "Sorted Numerically"}
                {sortBy === "opr" && "Sorted by OPR"}
                {sortBy === "rp" && "Sorted by RP"}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-300/15 bg-slate-800/70 p-2 shadow-lg">
          <p className="px-2 text-xs font-medium text-slate-300">Sort by</p>
          <div className="flex items-center gap-2">
            <SortButton label="Number" value="number" sortBy={sortBy} setSortBy={setSortBy} />
            <SortButton label="OPR" value="opr" sortBy={sortBy} setSortBy={setSortBy} />
            <SortButton label="RP" value="rp" sortBy={sortBy} setSortBy={setSortBy} />
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-blue-300/15 bg-slate-800/70 p-2 shadow-lg">
          <button
            type="button"
            onClick={() => setShowAutoFilter((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
          >
            <div>
              <p className="text-xs font-medium text-slate-300">Autonomous Filter</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {autoFilterSide && autoFilterThreshold !== "all"
                  ? `${autoFilterSide === "close" ? "Close" : "Far"} ${autoFilterThreshold}+`
                  : "Off"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(autoFilterSide && autoFilterThreshold !== "all") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAutoFilterSide(null);
                    setAutoFilterThreshold("all");
                  }}
                  className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Clear
                </button>
              )}
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-transform duration-200 ${showAutoFilter ? "rotate-180 text-blue-200" : ""}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4.5 w-4.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.53 15.78a.75.75 0 0 1-1.06 0l-5.25-5.25a.75.75 0 1 1 1.06-1.06L12 14.19l4.72-4.72a.75.75 0 1 1 1.06 1.06l-5.25 5.25Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </button>

          {showAutoFilter && (
            <div className="mt-2 border-t border-white/10 px-1 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Side</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FilterButton label="Close" value="close" selectedValue={autoFilterSide} onSelect={setAutoFilterSide} />
                    <FilterButton label="Far" value="far" selectedValue={autoFilterSide} onSelect={setAutoFilterSide} />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Threshold</p>
                  <select
                    value={autoFilterThreshold}
                    onChange={(e) => setAutoFilterThreshold(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                  >
                    <option value="all">Any</option>
                    <option value="0">0+</option>
                    <option value="3">3+</option>
                    <option value="6">6+</option>
                    <option value="9">9+</option>
                    <option value="12">12+</option>
                    <option value="15">15+</option>
                    <option value="18">18+</option>
                    <option value="21+">21+</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredAndSortedTeams.map((team) => (
            <details
              key={team.number}
              className="group overflow-hidden rounded-3xl border border-blue-300/15 bg-slate-800/85 shadow-xl transition-all duration-200"
            >
              <summary className="list-none cursor-pointer px-4 py-3.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="shrink-0 rounded-xl bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-200 ring-1 ring-blue-300/20 whitespace-nowrap">
                    {team.number}
                  </div>

                  <div className="flex-1" />

                  <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/5 tabular-nums">
                      <span className="text-slate-400">OPR</span>
                      <span className="font-semibold text-blue-100">{team.opr.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/5 tabular-nums">
                      <span className="text-slate-400">W/L/T</span>
                      <span className="font-semibold text-white">{team.wlt}</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/5 tabular-nums">
                      <span className="text-slate-400">RP</span>
                      <span className="font-semibold text-white">{team.rp.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-transform duration-200 group-open:rotate-180 group-open:text-blue-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4.5 w-4.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.53 15.78a.75.75 0 0 1-1.06 0l-5.25-5.25a.75.75 0 1 1 1.06-1.06L12 14.19l4.72-4.72a.75.75 0 1 1 1.06 1.06l-5.25 5.25Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </summary>

              <div className="border-t border-white/10 bg-slate-900/65 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm font-semibold text-blue-100 truncate">
                    {team.name}
                  </div>
                  <a
                    href={`https://ftcscout.org/teams/${team.number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl border border-blue-300/20 bg-blue-500/15 px-3 py-1.5 text-[11px] font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    FTCScout
                  </a>
                </div>
                <div className="space-y-3">
                  <AutoSection
                    team={team}
                    onChange={updateTeamField}
                  />
                  <TeleOpSection
                    value={team.teleopCount}
                    onIncrement={() => updateTeamField(team.number, "teleopCount", team.teleopCount + 1)}
                    onDecrement={() => updateTeamField(team.number, "teleopCount", Math.max(0, team.teleopCount - 1))}
                  />
                  <EndgameSection
                    value={team.endgamePark}
                    onChange={(value) => updateTeamField(team.number, "endgamePark", value)}
                  />
                  <NoteSection
                    title="Misc"
                    content={team.misc}
                    onChange={(value) => updateTeamField(team.number, "misc", value)}
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function SortButton({ label, value, sortBy, setSortBy }) {
  const active = sortBy === value;

  return (
    <button
      type="button"
      onClick={() => setSortBy(value)}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30"
          : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function FilterButton({ label, value, selectedValue, onSelect }) {
  const active = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => onSelect(active ? null : value)}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30"
          : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function AutoSection({ team, onChange }) {
  const autoOptions = ["0", "3", "6", "9", "12", "15", "18", "21+"];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
        Autonomous
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-100">Close</span>
            <span className="text-xs text-slate-400">Artifacts</span>
          </div>
          <select
            value={team.autoClose}
            onChange={(e) => onChange(team.number, "autoClose", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
          >
            {autoOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-white/8 bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-100">Far</span>
            <span className="text-xs text-slate-400">Artifacts</span>
          </div>
          <select
            value={team.autoFar}
            onChange={(e) => onChange(team.number, "autoFar", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
          >
            {autoOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-slate-950/35 px-3 py-2.5 text-sm text-slate-200">
          <span className="font-medium">Leave</span>
          <button
            type="button"
            onClick={() => onChange(team.number, "autoLeave", !team.autoLeave)}
            aria-pressed={team.autoLeave}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${
              team.autoLeave
                ? "bg-blue-500/30 ring-1 ring-blue-300/30"
                : "bg-slate-800/70 ring-1 ring-white/10"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600 shadow transition-all duration-200 ${
                team.autoLeave ? "translate-x-6" : "translate-x-1"
              }`}
            >
              {team.autoLeave ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M20.285 6.708a1 1 0 0 1 .007 1.414l-9.19 9.3a1 1 0 0 1-1.43.01L3.71 11.47a1 1 0 1 1 1.414-1.414l4.15 4.15 8.48-8.58a1 1 0 0 1 1.53.082Z" clipRule="evenodd" />
                </svg>
              ) : null}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TeleOpSection({ value, onIncrement, onDecrement }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
          TeleOp
        </p>
        <div className="rounded-full bg-slate-950/45 px-2.5 py-1 text-[11px] font-medium text-slate-400">
          Artifact Counter
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          aria-label="Decrease teleop artifact count"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 text-lg font-bold leading-none relative -top-[1px] text-slate-300 transition hover:bg-white/10 active:scale-[0.98]"
        >
          −
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl border border-blue-300/15 bg-slate-950/50 px-4 py-3">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Artifacts
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">
              {value}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onIncrement}
          aria-label="Increase teleop artifact count"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/20 text-2xl font-bold leading-none relative -top-[1px] text-blue-100 shadow-lg shadow-blue-950/30 transition hover:bg-blue-500/25 active:scale-[0.98]"
        >
          +
        </button>
      </div>
    </div>
  );
}

function EndgameSection({ value, onChange }) {
  const options = [
    { label: "Partial", value: "partial" },
    { label: "Full", value: "full" },
    { label: "Ascent", value: "ascent" },
  ];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 shadow-sm">
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
              className={`rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30"
                  : "bg-slate-950/35 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoteSection({ title, content, onChange }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3 shadow-sm">
      <label className="block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
          {title}
        </p>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm leading-6 text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
          placeholder={`Add ${title.toLowerCase()}...`}
        />
      </label>
    </div>
  );
}
