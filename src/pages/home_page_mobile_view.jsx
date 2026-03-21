import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://api.ftcscout.org/rest/v1";
const TEST_SEASON = 2025;

function getDefaultSettings() {
  return {
    teamNumber: "22345",
    fieldCount: 2,
    eventCode: "USNHCMP",
  };
}

function loadSavedSettings() {
  try {
    if (typeof window === "undefined") return getDefaultSettings();
    const saved = window.localStorage.getItem("ftc_settings");
    if (!saved) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(saved) };
  } catch {
    return getDefaultSettings();
  }
}

function extractTeamNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    return (
      extractTeamNumber(value.number) ??
      extractTeamNumber(value.teamNumber) ??
      extractTeamNumber(value.team?.number) ??
      extractTeamNumber(value.team?.teamNumber)
    );
  }
  return null;
}
function extractAlliance(value) {
  if (!value) return null;
  const raw = String(
    value.alliance ??
      value.station ??
      value.side ??
      value.color ??
      value.name ??
      value.allianceColor ??
      value.team?.alliance ??
      value
  ).toLowerCase();
  if (raw.includes("red")) return "red";
  if (raw.includes("blue")) return "blue";
  return null;
}

function extractTeamsList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(extractTeamNumber).filter((team) => team != null);
  }
  if (typeof value === "object") {
    const arrays = [
      value.teams,
      value.teamNumbers,
      value.partners,
      value.opponents,
      value.allies,
      value.members,
    ];
    for (const arr of arrays) {
      if (Array.isArray(arr)) {
        return arr.map(extractTeamNumber).filter((team) => team != null);
      }
    }
  }
  return [];
}

function formatOprValue(value) {
  const resolved = formatDisplayValue(value);
  if (resolved === "—") return resolved;
  const numeric = Number(resolved);
  if (Number.isFinite(numeric)) {
    return numeric.toFixed(2);
  }
  return resolved;
}

function formatRpValue(value) {
  const resolved = formatDisplayValue(value);
  if (resolved === "—") return resolved;
  const numeric = Number(resolved);
  if (Number.isFinite(numeric)) {
    return numeric.toFixed(2);
  }
  return resolved;
}

function getMatchNumber(match) {
  return (
    Number(match?.matchNumber) ||
    Number(match?.match_number) ||
    Number(match?.number) ||
    Number(match?.matchNum) ||
    Number(match?.tournamentMatchNumber) ||
    Number(match?.scheduleMatchNumber) ||
    Number(match?.id) ||
    Number(match?.match?.matchNumber) ||
    Number(match?.match?.match_number) ||
    Number(match?.match?.number) ||
    Number(match?.match?.matchNum) ||
    Number(match?.match?.id) ||
    0
  );
}

function isPlayedMatch(match) {
  if (typeof match?.hasBeenPlayed === "boolean") return match.hasBeenPlayed;
  if (typeof match?.played === "boolean") return match.played;
  if (typeof match?.isComplete === "boolean") return match.isComplete;
  if (typeof match?.completed === "boolean") return match.completed;
  if (match?.scores && (match.scores.red != null || match.scores.blue != null)) return true;
  if (match?.scoreRed != null || match?.scoreBlue != null) return true;
  return false;
}

function getArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.teams)) return payload.teams;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function formatDisplayValue(value, fallback = "—") {
  if (value == null) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    return value.trim() || fallback;
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    if (typeof value.value === "number" || typeof value.value === "string") {
      return formatDisplayValue(value.value, fallback);
    }
    if (typeof value.opr === "number" || typeof value.opr === "string") {
      return formatDisplayValue(value.opr, fallback);
    }
    if (typeof value.rp === "number" || typeof value.rp === "string") {
      return formatDisplayValue(value.rp, fallback);
    }
    return fallback;
  }
  return fallback;
}
function normalizeTeamStatsEntry(entry) {
  const teamNumber = extractTeamNumber(entry);
  const stats = entry?.stats ?? {};
  const wins = stats.wins;
  const losses = stats.losses;
  const ties = stats.ties ?? 0;

  const record =
    typeof wins === "number" && typeof losses === "number"
      ? `${wins}-${losses}-${ties}`
      : "—";

  return {
    teamNumber,
    opr: formatOprValue(stats?.opr?.totalPointsNp),
    rp: formatRpValue(stats?.rp),
    wlt: formatDisplayValue(record),
    name: entry?.teamName ?? entry?.name ?? `Team ${teamNumber ?? ""}`.trim(),
  };
}

function normalizeMatch(match, ourTeamNumber) {
  const teamEntries = Array.isArray(match?.teams) ? match.teams : [];
  const normalizedTeams = teamEntries
    .map((entry) => ({
      teamNumber: extractTeamNumber(entry),
      alliance: extractAlliance(entry),
    }))
    .filter((entry) => entry.teamNumber != null);

  const redTeams = normalizedTeams
    .filter((entry) => entry.alliance === "red")
    .map((entry) => entry.teamNumber);
  const blueTeams = normalizedTeams
    .filter((entry) => entry.alliance === "blue")
    .map((entry) => entry.teamNumber);

  const ourAllianceColor = redTeams.includes(ourTeamNumber)
    ? "red"
    : blueTeams.includes(ourTeamNumber)
    ? "blue"
    : null;

  if (!ourAllianceColor) return null;

  return {
    raw: match,
    matchNumber: getMatchNumber(match),
    played: isPlayedMatch(match),
    allianceColor: ourAllianceColor,
    partners:
      ourAllianceColor === "red"
        ? redTeams.filter((team) => team !== ourTeamNumber)
        : blueTeams.filter((team) => team !== ourTeamNumber),
    opponents: ourAllianceColor === "red" ? blueTeams : redTeams,
    scheduledStartTime: match?.scheduledStartTime ?? null,
  };
}

function getDisplayMatchLabel(match) {
  const raw = match?.raw ?? {};
  const code = raw?.matchCode || raw?.name || raw?.matchName || raw?.code;

  const parsePlayoffCode = (value) => {
    const str = String(value ?? "").trim();

    // Numeric playoff code like 2N00B, e.g. 21001 -> M - 1
    if (/^2\d00\d$/.test(str)) {
      return "M-" + str[1];
    }

    // Alphanumeric playoff labels
    if (/[a-zA-Z]/.test(str)) {
      const digits = str.match(/\d+/g);
      if (digits && digits.length > 0) {
        return "M-" + digits[0];
      }
    }

    return null;
  };

  const parsedFromCode = parsePlayoffCode(code);
  if (parsedFromCode) return parsedFromCode;

  const parsedFromNumber = parsePlayoffCode(match?.matchNumber);
  if (parsedFromNumber) return parsedFromNumber;

  if (match?.matchNumber) {
    return "#" + match.matchNumber;
  }

  return "—";
}

function normalizeTournamentMatch(match) {
  return {
    raw: match,
    matchNumber: getMatchNumber(match),
    played: isPlayedMatch(match),
    scheduledStartTime: match?.scheduledStartTime ?? null,
  };
}


export default function CompetitionHomeMobileView({ goToScoutingPage, goToPracticePage }) {
  const [searchTeam, setSearchTeam] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(loadSavedSettings);
  const [settingsDraft, setSettingsDraft] = useState(loadSavedSettings);
  const [matches, setMatches] = useState([]);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fix Safari browser UI color (top + bottom bars)
  useEffect(() => {
    let meta = document.querySelector("meta[name='theme-color']");

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", "#020617"); // matches slate-950 background
  }, []);

  useEffect(() => {
    const teamNumber = Number(settings.teamNumber);
    const eventCode = settings.eventCode?.trim().toUpperCase();
    if (!teamNumber || !eventCode) {
      setMatches([]);
      setTournamentMatches([]);
      setStatsMap({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEventData() {
      setLoading(true);
      setError("");
      try {
        const [eventMatchesResponse, teamsResponse] = await Promise.all([
          fetch(`${API_BASE}/events/${TEST_SEASON}/${eventCode}/matches`),
          fetch(`${API_BASE}/events/${TEST_SEASON}/${eventCode}/teams`),
        ]);

        if (!eventMatchesResponse.ok) {
          throw new Error(`Could not load event matches for ${eventCode}.`);
        }
        if (!teamsResponse.ok) {
          throw new Error(`Could not load team stats for ${eventCode}.`);
        }

        const eventMatchesJson = await eventMatchesResponse.json();
        const teamsJson = await teamsResponse.json();

        const eventMatchesList = getArrayPayload(eventMatchesJson);
        const teamsList = getArrayPayload(teamsJson);
        
        if (cancelled) return;

        const normalizedTournamentMatches = eventMatchesList
          .map((match) => normalizeTournamentMatch(match))
          .filter((match) => match.matchNumber > 0)
          .sort((a, b) => a.matchNumber - b.matchNumber);

        const normalizedMatches = eventMatchesList
          .map((match) => normalizeMatch(match, teamNumber))
          .filter((match) => match && match.matchNumber > 0)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        
        const nextStatsMap = {};
        teamsList.forEach((entry) => {
          const normalized = normalizeTeamStatsEntry(entry);
          if (normalized.teamNumber != null) {
            nextStatsMap[normalized.teamNumber] = normalized;
          }
        });
        
        setMatches(normalizedMatches);
        setTournamentMatches(normalizedTournamentMatches);
        setStatsMap(nextStatsMap);
        } catch (err) {
          if (!cancelled) {
            setMatches([]);
            setTournamentMatches([]);
            setStatsMap({});
            setError(err instanceof Error ? err.message : "Failed to load FTCScout data.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      
      // initial load
      loadEventData();

      // 🔁 periodic refresh every 60 seconds
      const interval = setInterval(() => {
        loadEventData();
      }, 60000);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [settings.teamNumber, settings.eventCode]);
      
      const currentMatch = useMemo(() => {
    const sortedMatches = [...tournamentMatches]
      .filter((match) => match.matchNumber > 0)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    if (sortedMatches.length === 0) return null;

    return sortedMatches.find((match) => !match.played) ?? null;
  }, [tournamentMatches]);
      
      const upcomingMatch = useMemo(() => {
    const sortedMatches = [...matches]
      .filter((match) => match.matchNumber > 0)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    if (sortedMatches.length === 0) return null;

    return sortedMatches.find((match) => !match.played) ?? null;
  }, [matches]);
      
      const currentFieldNumber = useMemo(() => {
      const matchNumber = currentMatch?.matchNumber ?? 0;
      if (!matchNumber) return "—";
      const fieldCount = Math.max(1, Number(settings.fieldCount) || 1);
      return ((matchNumber - 1) % fieldCount) + 1;
      }, [settings.fieldCount, currentMatch?.matchNumber]);
      
      const upcomingFieldNumber = useMemo(() => {
      const matchNumber = upcomingMatch?.matchNumber ?? 0;
      if (!matchNumber) return "—";
      const fieldCount = Math.max(1, Number(settings.fieldCount) || 1);
      return ((matchNumber - 1) % fieldCount) + 1;
      }, [settings.fieldCount, upcomingMatch?.matchNumber]);
      
      const quickActions = useMemo(
      () => [
        { label: "Schedule", value: "Full match list" },
        { label: "Notes", value: "Team scouting" },
        { label: "Rankings", value: "Live event view" },
      ],
      []
      );
      
      const ourAllianceTone = upcomingMatch?.allianceColor === "red" ? "red" : "blue";
      const opponentTone = upcomingMatch?.allianceColor === "red" ? "blue" : "red";
      const ourAllianceTeams = upcomingMatch?.partners ?? [];
      
      const openSettings = () => {
      setSettingsDraft({ ...settings });
      setShowSettings(true);
      };
      
      const closeSettings = () => {
      setSettingsDraft({ ...settings });
      setShowSettings(false);
      };
      
      const saveSettings = () => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ftc_settings", JSON.stringify(settingsDraft));
      }
      setSettings({ ...settingsDraft, eventCode: settingsDraft.eventCode.toUpperCase() });
      setShowSettings(false);
      };
      
      const handleSearch = () => {
      const team = searchTeam.trim();
      if (!team) return;
      window.open(
        `https://ftcscout.org/teams/${team}`,
        "_blank",
        "noopener,noreferrer"
      );
      };
      
      const openPracticePage = () => {
        if (typeof goToPracticePage === "function") {
          goToPracticePage();
        }
      };
      
      const statusText = loading
      ? "Loading"
      : currentMatch?.played
      ? "Last Played"
      : currentMatch
      ? "Live / Next"
      : "No Match";
      
      return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5">
          <div className="mb-5 rounded-3xl border border-blue-400/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/80">
                    SURFACE SCOUTING
                  </p>
                  <div className="inline-flex rounded-xl border border-white/10 bg-slate-800/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    Mobile View
                  </div>
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                  Competition Home
                </h1>
              </div>
      
              <button
                type="button"
                onClick={openSettings}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                aria-label="Open settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path
                    fillRule="evenodd"
                    d="M11.28 2.25c-.19 0-.37.072-.51.2l-1.2 1.09a1.5 1.5 0 0 1-1.44.31l-1.56-.52a.75.75 0 0 0-.93.43l-.72 1.66a1.5 1.5 0 0 1-1.1.86l-1.7.34a.75.75 0 0 0-.58.84l.2 1.8a1.5 1.5 0 0 1-.43 1.23l-1.25 1.28a.75.75 0 0 0 0 1.05l1.25 1.28a1.5 1.5 0 0 1 .43 1.22l-.2 1.81a.75.75 0 0 0 .58.84l1.7.34c.47.094.87.406 1.1.86l.72 1.66a.75.75 0 0 0 .93.43l1.56-.52a1.5 1.5 0 0 1 1.44.31l1.2 1.09c.14.128.32.2.51.2s.37-.072.51-.2l1.2-1.09a1.5 1.5 0 0 1 1.44-.31l1.56.52a.75.75 0 0 0 .93-.43l.72-1.66c.23-.454.63-.766 1.1-.86l1.7-.34a.75.75 0 0 0 .58-.84l-.2-1.8a.75.75 0 0 1 .43-1.23l1.25-1.28a.75.75 0 0 0 0-1.05l-1.25-1.28a1.5 1.5 0 0 1-.43-1.22l.2-1.81a.75.75 0 0 0-.58-.84l-1.7-.34a1.5 1.5 0 0 1-1.1-.86l-.72-1.66a.75.75 0 0 0-.93-.43l-1.56.52a1.5 1.5 0 0 1-1.44-.31l-1.2-1.09a.75.75 0 0 0-.51-.2ZM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"
                    clipRule="evenodd"
                  />
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
                  onClick={() => {
                    const eventCode = settings.eventCode;

                    if (item.label === "Notes" && goToScoutingPage) {
                      goToScoutingPage(eventCode);
                    }

                    if (item.label === "Schedule") {
                      window.open(
                        `https://ftcscout.org/events/2025/${eventCode}/matches`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }

                    if (item.label === "Rankings") {
                      window.open(
                        `https://ftcscout.org/events/2025/${eventCode}/rankings`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10"
                >
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">{item.value}</p>
                </button>
              ))}
            </div>
          </div>
      
          {error ? (
            <div className="mb-4 rounded-3xl border border-red-300/15 bg-red-500/10 p-4 text-sm text-red-100 shadow-xl">
              {error}
            </div>
          ) : null}
      
          <div className="mb-4 grid grid-cols-2 gap-3">
            <StatusCard
              eyebrow="Current Match"
              title={currentMatch ? getDisplayMatchLabel(currentMatch) : "—"}
              subtitle={`Field ${currentFieldNumber}`}
              badge={statusText}
              tone="live"
            />
            <StatusCard
              eyebrow="Upcoming Match"
              title={upcomingMatch ? getDisplayMatchLabel(upcomingMatch) : "—"}
              subtitle={`Field ${upcomingFieldNumber}`}
              badge={upcomingMatch ? `${upcomingMatch.allianceColor.toUpperCase()} ALLIANCE` : "Waiting"}
              tone={upcomingMatch?.allianceColor ?? "blue"}
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
                {upcomingMatch ? getDisplayMatchLabel(upcomingMatch) : settings.eventCode || "No Event"}
              </div>
            </div>
      
            <div className="mt-4 grid gap-3">
              <AllianceBlock
                label="With"
                teams={ourAllianceTeams}
                tone={ourAllianceTone}
                icon="plus"
                statsMap={statsMap}
                teamNumber={settings.teamNumber}
                variant="our"
                emptyMessage={loading ? "Loading partner..." : "No upcoming partner found."}
              />
              <AllianceBlock
                label="Against"
                teams={upcomingMatch?.opponents ?? []}
                tone={opponentTone}
                icon="cross"
                statsMap={statsMap}
                variant="opponents"
                emptyMessage={loading ? "Loading opponents..." : "No upcoming opponents found."}
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
      
          {showSettings ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 pb-4 pt-10 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-[2rem] border border-blue-300/15 bg-slate-900/95 p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">Settings</p>
                    <h3 className="mt-1 text-xl font-bold text-white">Competition Config</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeSettings}
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">Team Using App</p>
                      <input
                        value={settingsDraft.teamNumber}
                        onChange={(e) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            teamNumber: e.target.value,
                          }))
                        }
                        inputMode="numeric"
                        placeholder="Enter team number"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </label>
                  </div>
      
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                    <label className="block">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">Number of Fields</p>
                      <input
                        value={settingsDraft.fieldCount}
                        onChange={(e) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            fieldCount: e.target.value,
                          }))
                        }
                        inputMode="numeric"
                        placeholder="Enter number of fields"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Current and upcoming fields are computed from match number modulo available fields.
                    </p>
                  </div>
      
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                    <label className="block">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">Current Event Code</p>
                      <input
                        value={settingsDraft.eventCode}
                        onChange={(e) =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            eventCode: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="Enter event code"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
                      />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      This event code is used for FTCScout API fetches.
                    </p>
                  </div>
      
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={saveSettings}
                      className="w-full rounded-2xl border border-blue-300/20 bg-blue-500/20 py-3 text-sm font-semibold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:bg-blue-500/25 active:scale-[0.98]"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
      
          <div className="mb-4 rounded-3xl border border-blue-300/15 bg-slate-800/80 p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">Practice Matches</p>
                <p className="mt-1 text-sm text-slate-400">Quick Access to Drivers Practice Page</p>
              </div>
              <button
                type="button"
                onClick={openPracticePage}
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
      <div className={`rounded-3xl border p-4 shadow-xl ${toneClasses[tone] ?? toneClasses.blue}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{eyebrow}</p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-3xl font-bold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
          </div>
        </div>
        <div className={`mt-4 inline-flex rounded-xl px-2.5 py-1 text-[10px] font-semibold ring-1 ${badgeClasses[tone] ?? badgeClasses.blue}`}>
          {badge}
        </div>
      </div>
      );
      }
      
      function AllianceBlock({
      label,
      teams,
      tone,
      icon,
      statsMap = {},
      teamNumber,
      variant = "our",
      emptyMessage,
      }) {
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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

          {variant === "our" ? (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <HeaderStatBubble label="OPR" value={formatOprValue(statsMap[Number(teamNumber)]?.opr)} />
              <HeaderStatBubble label="W/L/T" value={formatDisplayValue(statsMap[Number(teamNumber)]?.wlt)} />
              <HeaderStatBubble label="RP" value={formatRpValue(statsMap[Number(teamNumber)]?.rp)} />
            </div>
          ) : null}
        </div>
      
        {teams.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-slate-300">
            {emptyMessage}
          </div>
        ) : (
          <div className={variant === "our" ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
            {teams.map((team) => {
              const stats = statsMap[team] ?? {};
      
              return (
                <div key={team} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3">
                  {variant === "our" ? (
                    <div className="flex min-w-0 items-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Team</p>
                        <p className="mt-1 truncate text-lg font-bold text-white">{team}</p>
                      </div>
      
                      <div className="grid shrink-0 grid-cols-3 gap-2 text-right text-xs text-slate-300">
                        <div className="min-w-[3.5rem] rounded-lg bg-white/5 px-2 py-1.5">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">OPR</p>
                          <p className="mt-0.5 font-semibold text-white">{formatOprValue(stats.opr)}</p>
                        </div>
                        <div className="min-w-[4.5rem] rounded-lg bg-white/5 px-2 py-1.5">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">W/L/T</p>
                          <p className="mt-0.5 font-semibold text-white">{formatDisplayValue(stats.wlt)}</p>
                        </div>
                        <div className="min-w-[3rem] rounded-lg bg-white/5 px-2 py-1.5">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">RP</p>
                          <p className="mt-0.5 font-semibold text-white">{formatRpValue(stats.rp)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Team</p>
                        <p className="mt-1 text-lg font-bold text-white">{team}</p>
                      </div>
      
                      <div className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${chipClasses}`}>
                        OPR {formatOprValue(stats.opr)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      );
      }

function HeaderStatBubble({ label, value }) {
  return (
    <div className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10">
      <span className="text-slate-400">{label}</span>
      <span className="ml-1 text-white">{value}</span>
    </div>
  );
}
