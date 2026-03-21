import { useRef, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://api.ftcscout.org/rest/v1";
const TEST_SEASON = 2025;
const SUPABASE_URL = "https://cxgdcadavykefnpzjcuk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SwP95IDavUGLKADXLMosJA_vwdsTV0b";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const dbFieldMap = {
  autoClose: "auto_close",
  autoFar: "auto_far",
  autoLeave: "auto_leave",
  teleopCount: "teleop_count",
  endgamePark: "endgame_park",
  misc: "notes",
};

function createDefaultScoutingMatch(matchIndex = 1) {
  return {
    matchIndex,
    label: `Match ${matchIndex}`,
    autoClose: "0",
    autoFar: "0",
    autoLeave: false,
    teleopCount: 0,
    endgamePark: "partial",
    misc: "",
  };
}

function normalizeSavedMatchRow(row) {
  const matchIndex = Number(row?.match_index) || 1;
  return {
    matchIndex,
    label: `Match ${matchIndex}`,
    autoClose: row?.auto_close ?? "0",
    autoFar: row?.auto_far ?? "0",
    autoLeave: Boolean(row?.auto_leave),
    teleopCount: Number(row?.teleop_count) || 0,
    endgamePark: row?.endgame_park ?? "partial",
    misc: row?.notes ?? "",
  };
}

function getActiveScoutingMatch(team) {
  const matches = Array.isArray(team?.scoutingMatches) ? team.scoutingMatches : [];
  if (matches.length === 0) return createDefaultScoutingMatch(1);
  return matches.find((match) => match.matchIndex === team.selectedMatchIndex) ?? matches[0];
}

function getSavedEventCode() {
  try {
    if (typeof window === "undefined") return "";
    const saved = window.localStorage.getItem("ftc_settings");
    if (!saved) return "";
    const parsed = JSON.parse(saved);
    return String(parsed?.eventCode ?? "").trim().toUpperCase();
  } catch {
    return "";
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
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") return value.trim() || fallback;
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
  }
  return fallback;
}

function formatNumericStat(value) {
  const resolved = formatDisplayValue(value);
  if (resolved === "—") return 0;
  const numeric = Number(resolved);
  return Number.isFinite(numeric) ? numeric : 0;
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
    number: teamNumber,
    name: entry?.teamName ?? entry?.name ?? `Team ${teamNumber ?? ""}`.trim(),
    opr: formatNumericStat(stats?.opr?.totalPoints),
    rp: formatNumericStat(stats?.rp),
    wlt: formatDisplayValue(record),
    scoutingMatches: [createDefaultScoutingMatch(1)],
    selectedMatchIndex: 1,
  };
}

function mergeScoutingData(team, savedRows) {
  const normalizedMatches = Array.isArray(savedRows)
    ? savedRows.map(normalizeSavedMatchRow).sort((a, b) => a.matchIndex - b.matchIndex)
    : [];

  return {
    ...team,
    scoutingMatches: normalizedMatches.length > 0 ? normalizedMatches : team.scoutingMatches,
    selectedMatchIndex:
      normalizedMatches.length > 0
        ? normalizedMatches[0].matchIndex
        : team.selectedMatchIndex,
  };
}

export default function TeamListMobileView({ goHome, eventCode, initialTeamNumber }) {
  const [sortBy, setSortBy] = useState("number");
  const [autoFilterSide, setAutoFilterSide] = useState(null);
  const [autoFilterThreshold, setAutoFilterThreshold] = useState("all");
  const [showAutoFilter, setShowAutoFilter] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const teamRefs = useRef({});
  const hasAutoScrolled = useRef(false);

  const updateSelectedMatchIndex = (teamNumber, matchIndex) => {
    setTeams((prevTeams) =>
      prevTeams.map((team) =>
        team.number === teamNumber
          ? { ...team, selectedMatchIndex: matchIndex }
          : team
      )
    );
  };

  const addMatchForTeam = async (teamNumber) => {
    let createdMatch = null;

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.number !== teamNumber) return team;

        const nextMatchIndex =
          (team.scoutingMatches?.reduce(
            (maxValue, match) => Math.max(maxValue, Number(match.matchIndex) || 0),
            0
          ) ?? 0) + 1;

        createdMatch = createDefaultScoutingMatch(nextMatchIndex);

        return {
          ...team,
          scoutingMatches: [...(team.scoutingMatches ?? []), createdMatch],
          selectedMatchIndex: nextMatchIndex,
        };
      })
    );

    if (!createdMatch || !resolvedEventCode) return;

    const { error } = await supabase.from("team_match_scouting").upsert(
      {
        event_code: resolvedEventCode,
        team_number: teamNumber,
        match_index: createdMatch.matchIndex,
        auto_close: createdMatch.autoClose,
        auto_far: createdMatch.autoFar,
        auto_leave: createdMatch.autoLeave,
        teleop_count: createdMatch.teleopCount,
        endgame_park: createdMatch.endgamePark,
        notes: createdMatch.misc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_code,team_number,match_index" }
    );

    if (error) {
      console.error("Failed to create scouting match:", error);
      setTeamsError(error.message || "Failed to create scouting match.");
    }
  };

  const resolvedEventCode = useMemo(
    () => String(eventCode ?? getSavedEventCode()).trim().toUpperCase(),
    [eventCode]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      if (!resolvedEventCode) {
        setTeams([]);
        setLoadingTeams(false);
        setTeamsError("No event code set.");
        return;
      }

      setLoadingTeams(true);
      setTeamsError("");

      try {
        const response = await fetch(`${API_BASE}/events/${TEST_SEASON}/${resolvedEventCode}/teams`);

        if (!response.ok) {
          throw new Error(`Could not load teams for ${resolvedEventCode}.`);
        }

        const json = await response.json();
        let scoutingRows = [];

        try {
          const scoutingResponse = await supabase
            .from("team_match_scouting")
            .select("*")
            .eq("event_code", resolvedEventCode);

          if (scoutingResponse.error) {
            console.error("Supabase scouting load failed:", scoutingResponse.error);
            setTeamsError("Scouting sync unavailable right now. Event teams still loaded.");
          } else {
            scoutingRows = scoutingResponse.data ?? [];
          }
        } catch (scoutingLoadError) {
          console.error("Supabase scouting load failed:", scoutingLoadError);
          setTeamsError("Scouting sync unavailable right now. Event teams still loaded.");
        }

        const scoutingMap = scoutingRows.reduce((acc, row) => {
          const teamNumber = Number(row.team_number);
          if (!acc[teamNumber]) acc[teamNumber] = [];
          acc[teamNumber].push(row);
          return acc;
        }, {});

        const teamsList = getArrayPayload(json)
          .map(normalizeTeamStatsEntry)
          .filter((team) => team.number != null)
          .map((team) => mergeScoutingData(team, scoutingMap[team.number]))
          .sort((a, b) => a.number - b.number);

        if (cancelled) return;

        setTeams(teamsList);
      } catch (error) {
        if (!cancelled) {
          setTeams([]);
          setTeamsError(error instanceof Error ? error.message : "Failed to load event teams.");
        }
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    }
    loadTeams();

    return () => {
      cancelled = true;
    };
  }, [resolvedEventCode]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!resolvedEventCode) return;

    const channel = supabase
      .channel(`team_scouting_changes:${resolvedEventCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_match_scouting",
          filter: `event_code=eq.${resolvedEventCode}`,
        },
        (payload) => {
          const row = payload?.new ?? payload?.record ?? payload?.data?.record;
          if (!row) return;

          const normalizedMatch = normalizeSavedMatchRow(row);

          setTeams((prevTeams) =>
            prevTeams.map((team) => {
              if (team.number !== row.team_number) return team;

              const existingMatches = Array.isArray(team.scoutingMatches)
                ? team.scoutingMatches
                : [createDefaultScoutingMatch(1)];
              const existingIndex = existingMatches.findIndex(
                (match) => match.matchIndex === normalizedMatch.matchIndex
              );

              const nextMatches = [...existingMatches];
              if (existingIndex >= 0) {
                nextMatches[existingIndex] = normalizedMatch;
              } else {
                nextMatches.push(normalizedMatch);
                nextMatches.sort((a, b) => a.matchIndex - b.matchIndex);
              }

              return {
                ...team,
                scoutingMatches: nextMatches,
                selectedMatchIndex: team.selectedMatchIndex ?? normalizedMatch.matchIndex,
              };
            })
          );
        }
       )
      .subscribe((status) => {
        setRealtimeStatus(String(status || "unknown").toLowerCase());
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedEventCode]);

  const updateTeamField = async (teamNumber, field, value) => {
    let activeMatchIndex = 1;

    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.number !== teamNumber) return team;

        activeMatchIndex = team.selectedMatchIndex ?? team.scoutingMatches?.[0]?.matchIndex ?? 1;

        return {
          ...team,
          scoutingMatches: (team.scoutingMatches ?? [createDefaultScoutingMatch(1)]).map((match) =>
            match.matchIndex === activeMatchIndex ? { ...match, [field]: value } : match
          ),
        };
      })
    );

    const dbField = dbFieldMap[field];
    if (!dbField || !resolvedEventCode) return;

    const { error } = await supabase.from("team_match_scouting").upsert(
      {
        event_code: resolvedEventCode,
        team_number: teamNumber,
        match_index: activeMatchIndex,
        [dbField]: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_code,team_number,match_index" }
    );

    if (error) {
      console.error("Failed to save scouting data:", error);
      setTeamsError(error.message || "Failed to save scouting data.");
    }
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

  //Auto Scroll to clicked team when coming from homepage
  useEffect(() => {
    if (!initialTeamNumber) return;
    if (!filteredAndSortedTeams?.length) return;
    if (hasAutoScrolled.current) return;

    const targetTeam = Number(initialTeamNumber);
    const exists = filteredAndSortedTeams.some(
      (team) => Number(team.number) === targetTeam
    );
    if (!exists) return;

    const el = teamRefs.current[targetTeam];
    if (!el) return;

    const timeout = setTimeout(() => {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      hasAutoScrolled.current = true;
    }, 250);

    return () => clearTimeout(timeout);
  }, [initialTeamNumber, filteredAndSortedTeams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-md px-4 py-5">
        <div className="mb-5 rounded-3xl border border-blue-400/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
          <div className="grid grid-cols-[40px_1fr] items-center gap-3">
            <button
              type="button"
              onClick={() => goHome && goHome()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M10.28 4.22a.75.75 0 0 1 0 1.06L5.56 10h12.69a.75.75 0 0 1 0 1.5H5.56l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/80">
                  SURFACE SCOUTING
                </p>
                <span className="rounded-full border border-transparent bg-slate-800/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Mobile View
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Team List
                </h1>
                <span className="shrink-0 rounded-xl border border-transparent bg-blue-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-100 shadow-inner">
                  {resolvedEventCode || "No event code"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-transparent bg-slate-800/70 p-2 shadow-lg">
          <p className="px-2 text-xs font-medium text-slate-300">Sort by</p>
          <div className="flex items-center gap-2">
            <SortButton label="Number" value="number" sortBy={sortBy} setSortBy={setSortBy} />
            <SortButton label="OPR" value="opr" sortBy={sortBy} setSortBy={setSortBy} />
            <SortButton label="RP" value="rp" sortBy={sortBy} setSortBy={setSortBy} />
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-transparent bg-slate-800/70 p-2 shadow-lg">
          <div className="flex items-center gap-2 rounded-xl px-2 py-2">
            <button
              type="button"
              onClick={() => setShowAutoFilter((prev) => !prev)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition hover:bg-white/5 rounded-xl px-2 py-2"
            >
              <div>
                <p className="text-xs font-medium text-slate-300">Autonomous Filter</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {autoFilterSide && autoFilterThreshold !== "all"
                    ? `${autoFilterSide === "close" ? "Close" : "Far"} ${autoFilterThreshold}+`
                    : "Off"}
                </p>
              </div>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-transform duration-200 ${showAutoFilter ? "rotate-180 text-blue-200" : ""}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.53 15.78a.75.75 0 0 1-1.06 0l-5.25-5.25a.75.75 0 1 1 1.06-1.06L12 14.19l4.72-4.72a.75.75 0 1 1 1.06 1.06l-5.25 5.25Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </button>

            {autoFilterSide && autoFilterThreshold !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setAutoFilterSide(null);
                  setAutoFilterThreshold("all");
                }}
                className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/10"
              >
                Clear
              </button>
            ) : null}
          </div>

          {showAutoFilter && (
            <div className="mt-2 border-t border-transparent px-1 pt-3">
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
                    className="w-full rounded-xl border border-transparent bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
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

        {teamsError ? (
          <div className="mb-4 rounded-2xl border border-red-300/15 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-lg">
            {teamsError}
          </div>
        ) : null}

        {loadingTeams ? (
          <div className="rounded-2xl border border-transparent bg-slate-800/70 px-4 py-8 text-center text-sm text-slate-300 shadow-lg">
            Loading event teams...
          </div>
        ) : (
        <div className="space-y-4">
          {filteredAndSortedTeams.map((team) => {
            const activeMatch = getActiveScoutingMatch(team);

            return (
            <details
              key={team.number}
              ref={(el) => {
                if (el) teamRefs.current[team.number] = el;
              }}
              open={Number(team.number) === Number(initialTeamNumber)}
              className="group overflow-hidden rounded-3xl border border-blue-300/15 bg-slate-800/85 shadow-xl transition-all duration-200"
            >
              <summary className="list-none cursor-pointer px-4 py-3.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="shrink-0 rounded-xl bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-200 ring-1 ring-blue-300/20 whitespace-nowrap">
                    {team.number}
                  </div>

                  <div className="flex-1" />

                  <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-0 tabular-nums">
                      <span className="text-slate-400">OPR</span>
                      <span className="font-semibold text-blue-100">{team.opr.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-0 tabular-nums">
                      <span className="text-slate-400">W/L/T</span>
                      <span className="font-semibold text-white">{team.wlt}</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 ring-1 ring-0 tabular-nums">
                      <span className="text-slate-400">RP</span>
                      <span className="font-semibold text-white">{team.rp.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-transparent bg-white/5 text-slate-300 transition-transform duration-200 group-open:rotate-180 group-open:text-blue-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4 w-4"
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

              <div className="border-t border-transparent bg-slate-900/65 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm font-semibold text-blue-100 truncate">
                    {team.name}
                  </div>
                  <a
                    href={`https://ftcscout.org/teams/${team.number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl border border-transparent bg-blue-500/15 px-3 py-1.5 text-[11px] font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    FTCScout
                  </a>
                </div>
                <div className="space-y-3">
                  <MatchSelectorSection
                    team={team}
                    activeMatch={activeMatch}
                    onSelectMatch={(matchIndex) => updateSelectedMatchIndex(team.number, matchIndex)}
                    onAddMatch={() => addMatchForTeam(team.number)}
                  />
                  <AutoSection
                    team={team}
                    matchData={activeMatch}
                    onChange={updateTeamField}
                  />
                  <TeleOpSection
                    value={activeMatch.teleopCount}
                    onIncrement={() => updateTeamField(team.number, "teleopCount", activeMatch.teleopCount + 1)}
                    onDecrement={() => updateTeamField(team.number, "teleopCount", Math.max(0, activeMatch.teleopCount - 1))}
                  />
                  <EndgameSection
                    value={activeMatch.endgamePark}
                    onChange={(value) => updateTeamField(team.number, "endgamePark", value)}
                  />
                  <NoteSection
                    title="Notes"
                    content={activeMatch.misc}
                    onChange={(value) => updateTeamField(team.number, "misc", value)}
                  />
                </div>
              </div>
            </details>
                      );
          })}
        </div>
        )}
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
          ? "bg-blue-500/20 text-blue-100 ring-1 ring-0"
          : "bg-white/5 text-slate-300 ring-1 ring-0 hover:bg-white/10"
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
          ? "bg-blue-500/20 text-blue-100 ring-1 ring-0"
          : "bg-white/5 text-slate-300 ring-1 ring-0 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function MatchSelectorSection({ team, activeMatch, onSelectMatch, onAddMatch }) {
  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
          Scouting Match
        </p>
        <button
          type="button"
          onClick={onAddMatch}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-lg font-bold text-blue-100 transition hover:bg-blue-500/25 active:scale-[0.98]"
          aria-label="Add scouting match"
        >
          +
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <select
          value={activeMatch.matchIndex}
          onChange={(e) => onSelectMatch(Number(e.target.value))}
          className="w-full rounded-xl border border-transparent bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
        >
          {(team.scoutingMatches ?? []).map((match) => (
            <option key={match.matchIndex} value={match.matchIndex}>
              {match.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AutoSection({ team, matchData, onChange }) {
  const autoOptions = ["0", "3", "6", "9", "12", "15", "18", "21+"];

  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
        Autonomous
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-transparent bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-100">Close</span>
            <span className="text-xs text-slate-400">Artifacts</span>
          </div>
          <select
            value={matchData.autoClose}
            onChange={(e) => onChange(team.number, "autoClose", e.target.value)}
            className="w-full rounded-xl border border-transparent bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
          >
            {autoOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-transparent bg-slate-950/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-100">Far</span>
            <span className="text-xs text-slate-400">Artifacts</span>
          </div>
          <select
            value={matchData.autoFar}
            onChange={(e) => onChange(team.number, "autoFar", e.target.value)}
            className="w-full rounded-xl border border-transparent bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
          >
            {autoOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-transparent bg-slate-950/35 px-3 py-2.5 text-sm text-slate-200">
          <span className="font-medium">Leave</span>
          <button
            type="button"
            onClick={() => onChange(team.number, "autoLeave", !matchData.autoLeave)}
            aria-pressed={matchData.autoLeave}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${
              matchData.autoLeave ? "bg-blue-500/30 ring-1 ring-0" : "bg-slate-800/70 ring-1 ring-0"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600 shadow transition-all duration-200 ${
                matchData.autoLeave ? "translate-x-6" : "translate-x-1"
              }`}
            >
              {matchData.autoLeave ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
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
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-slate-950/35 text-lg font-bold leading-none relative -top-[1px] text-slate-300 transition hover:bg-white/10 active:scale-[0.98]"
        >
          −
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl border border-transparent bg-slate-950/50 px-4 py-3">
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
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-blue-500/20 text-2xl font-bold leading-none relative -top-[1px] text-blue-100 shadow-lg shadow-blue-950/30 transition hover:bg-blue-500/25 active:scale-[0.98]"
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

function NoteSection({ title, content, onChange }) {
  return (
    <div className="rounded-2xl border border-transparent bg-white/5 p-3 shadow-sm">
      <label className="block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/85">
          {title}
        </p>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-transparent bg-slate-950/60 px-3 py-2.5 text-sm leading-6 text-slate-200 outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-400/20"
          placeholder={`Add ${title.toLowerCase()}...`}
        />
      </label>
    </div>
  );
}
