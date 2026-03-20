import { useMemo, useState } from "react";

export default function CompetitionHomeMobileView() {
  const [searchTeam, setSearchTeam] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    teamNumber: "12345",
    fieldCount: 2,
    eventCode: "",
  });

  const currentMatch = {
    matchNumber: 21,
    status: "Live Now",
  };

  const upcomingMatch = {
    matchNumber: 23,
    allianceColor: "red",
    partners: [11211, 14567],
    opponents: [16789, 13456],
    
  };

  const currentFieldNumber = useMemo(() => {
    const fieldCount = Math.max(1, Number(settings.fieldCount) || 1);
    return ((currentMatch.matchNumber - 1) % fieldCount) + 1;
  }, [currentMatch.matchNumber, settings.fieldCount]);

  const upcomingFieldNumber = useMemo(() => {
    const fieldCount = Math.max(1, Number(settings.fieldCount) || 1);
    return ((upcomingMatch.matchNumber - 1) % fieldCount) + 1;
  }, [upcomingMatch.matchNumber, settings.fieldCount]);

  const quickActions = useMemo(
    () => [
      { label: "Schedule", value: "Full match list" },
      { label: "Notes", value: "Team scouting" },
      { label: "Rankings", value: "Live event view" },
    ],
    []
  );

  const ourAllianceTone = upcomingMatch.allianceColor === "red" ? "red" : "blue";
  const opponentTone = upcomingMatch.allianceColor === "red" ? "blue" : "red";

  const handleSearch = () => {
    const team = searchTeam.trim();
    if (!team) return;
    window.open(`https://ftcscout.org/teams/${team}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5">
        <div className="mb-5 rounded-3xl border border-blue-400/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/80">
                SURFACE SCOUTING
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Competition Home
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              aria-label="Open settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M11.28 2.25c-.19 0-.37.072-.51.2l-1.2 1.09a1.5 1.5 0 0 1-1.44.31l-1.56-.52a.75.75 0 0 0-.93.43l-.72 1.66a1.5 1.5 0 0 1-1.1.86l-1.7.34a.75.75 0 0 0-.58.84l.2 1.8a1.5 1.5 0 0 1-.43 1.23l-1.25 1.28a.75.75 0 0 0 0 1.05l1.25 1.28a1.5 1.5 0 0 1 .43 1.22l-.2 1.81a.75.75 0 0 0 .58.84l1.7.34c.47.094.87.406 1.1.86l.72 1.66a.75.75 0 0 0 .93.43l1.56-.52a1.5 1.5 0 0 1 1.44.31l1.2 1.09c.14.128.32.2.51.2s.37-.072.51-.2l1.2-1.09a1.5 1.5 0 0 1 1.44-.31l1.56.52a.75.75 0 0 0 .93-.43l.72-1.66c.23-.454.63-.766 1.1-.86l1.7-.34a.75.75 0 0 0 .58-.84l-.2-1.8a1.5 1.5 0 0 1 .43-1.23l1.25-1.28a.75.75 0 0 0 0-1.05l-1.25-1.28a1.5 1.5 0 0 1-.43-1.22l.2-1.81a.75.75 0 0 0-.58-.84l-1.7-.34a1.5 1.5 0 0 1-1.1-.86l-.72-1.66a.75.75 0 0 0-.93-.43l-1.56.52a1.5 1.5 0 0 1-1.44-.31l-1.2-1.09a.75.75 0 0 0-.51-.2ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-4 overflow-hidden rounded-[1.75rem] border border-blue-300/15 bg-gradient-to-br from-blue-500/15 via-slate-800/95 to-slate-900/95 shadow-xl">
          <div className="grid grid-cols-3 gap-2 px-4 py-4">
            {quickActions.map((item) => (
              <button
                key={item.label}
                type="button"
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10"
              >
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">{item.value}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatusCard
            eyebrow="Current Match"
            title={`#${currentMatch.matchNumber}`}
            subtitle={`Field ${currentFieldNumber}`}
            badge={currentMatch.status}
            tone="live"
          />
          <StatusCard
            eyebrow="Upcoming Match"
            title={`#${upcomingMatch.matchNumber}`}
            subtitle={`Field ${upcomingFieldNumber}`}
            badge={`${upcomingMatch.allianceColor.toUpperCase()} ALLIANCE`}
            tone={upcomingMatch.allianceColor}
          />
        </div>

        <div className="mb-4 rounded-3xl border border-blue-300/15 bg-slate-800/80 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                Match Breakdown
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">Upcoming Alliances</h3>
            </div>
            <div className="rounded-xl border border-blue-300/20 bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-100 ring-1 ring-blue-300/20">
              Match {upcomingMatch.matchNumber}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <AllianceBlock
              label="Our Alliance"
              teams={upcomingMatch.partners}
              tone={ourAllianceTone}
              icon="plus"
            />
            <AllianceBlock
              label="Against"
              teams={upcomingMatch.opponents}
              tone={opponentTone}
              icon="cross"
            />
          </div>
        </div>

        <div className="mb-4 rounded-3xl border border-blue-300/15 bg-slate-800/80 p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                Team Search
              </p>
              
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
              Quick Access
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-500">
                <path fillRule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 4.573 13.446l4.24 4.24a.75.75 0 1 0 1.06-1.06l-4.24-4.24A7.5 7.5 0 0 0 10.5 3Zm-6 7.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" clipRule="evenodd" />
              </svg>
              <input
                value={searchTeam}
                onChange={(e) => setSearchTeam(e.target.value)}
                inputMode="numeric"
                placeholder="Enter team number"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="flex h-12 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/20 px-4 text-sm font-semibold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:bg-blue-500/25 active:scale-[0.98]"
            >
              Go
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 pb-4 pt-10 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[2rem] border border-blue-300/15 bg-slate-900/95 p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                    Settings
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">Competition Config</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                  aria-label="Close settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                  <label className="block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                      Team Using App
                    </p>
                    <input
                      value={settings.teamNumber}
                      onChange={(e) => setSettings((prev) => ({ ...prev, teamNumber: e.target.value }))}
                      inputMode="numeric"
                      placeholder="Enter team number"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                  <label className="block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                      Number of Fields
                    </p>
                    <input
                      value={settings.fieldCount}
                      onChange={(e) => setSettings((prev) => ({ ...prev, fieldCount: e.target.value }))}
                      inputMode="numeric"
                      placeholder="Enter number of fields"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </label>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Current match field is computed by match number modulo available fields.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                  <label className="block">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                      Current Event Code
                    </p>
                    <input
                      value={settings.eventCode}
                      onChange={(e) => setSettings((prev) => ({ ...prev, eventCode: e.target.value.toUpperCase() }))}
                      placeholder="Enter event code"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </label>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    This will be used to fetch FTCScout API data for the current event.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 rounded-3xl border border-blue-300/15 bg-slate-800/80 p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
                Practice Matches
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Quick Access to Drivers Practice Page
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://ftcscout.org/practice', '_blank')}
              className="rounded-2xl border border-emerald-300/20 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500/25 active:scale-[0.98]"
            >
              Open
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatusCard({ eyebrow, title, subtitle, badge, tone }) {
  const toneClasses = {
    live: "border-emerald-300/20 bg-emerald-500/10",
    blue: "border-blue-300/20 bg-blue-500/10",
    red: "border-red-300/20 bg-red-500/10",
  };

  const badgeClasses = {
    live: "bg-emerald-500/15 text-emerald-100 ring-emerald-300/20",
    blue: "bg-blue-500/15 text-blue-100 ring-blue-300/20",
    red: "bg-red-500/15 text-red-100 ring-red-300/20",
  };

  return (
    <div className={`rounded-3xl border p-4 shadow-xl ${toneClasses[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
        {eyebrow}
      </p>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-3xl font-bold text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        </div>
      </div>
      <div className={`mt-4 inline-flex rounded-xl px-2.5 py-1 text-[11px] font-semibold ring-1 ${badgeClasses[tone]}`}>
        {badge}
      </div>
    </div>
  );
}

function AllianceBlock({ label, teams, tone, icon }) {
  const wrapperClasses =
    tone === "red"
      ? "border-red-300/15 bg-red-500/10"
      : "border-blue-300/15 bg-blue-500/10";

  const chipClasses =
    tone === "red"
      ? "bg-red-500/15 text-red-100 ring-red-300/20"
      : "bg-blue-500/15 text-blue-100 ring-blue-300/20";

  return (
    <div className={`rounded-2xl border p-3 ${wrapperClasses}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${chipClasses}`}>
          {icon === "cross" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 0 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <p className="text-sm font-semibold text-white">{label}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => (
          <div
            key={team}
            className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-center"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Team</p>
            <p className="mt-1 text-lg font-bold text-white">#{team}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
