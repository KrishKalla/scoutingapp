import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://api.ftcscout.org/rest/v1";
const TEST_SEASON = 2025;
const SUPABASE_URL = "https://cxgdcadavykefnpzjcuk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SwP95IDavUGLKADXLMosJA_vwdsTV0b";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const PARK_ORDER = ["none", "partial", "full"];
const AUTO_OPTIONS = ["0", "3", "6", "9", "12", "15", "18", "21+"];
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

function createDefaultScoutingMatch(matchIndex = 1) {
  return {
    match_index: matchIndex,
    auto_close: "0",
    auto_far: "0",
    auto_leave: false,
    teleop_count: 0,
    endgame_park: "partial",
    notes: "",
    updated_at: new Date().toISOString(),
  };
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

function getSavedTeamNumber() {
  try {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("ftc_settings");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    const value = Number(parsed?.teamNumber);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
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

function extractAlliance(value) {
  if (!value) return null;
  const raw = String(
    value.alliance ?? value.station ?? value.side ?? value.color ?? value.name ?? value.allianceColor ?? value.team?.alliance ?? value
  ).toLowerCase();
  if (raw.includes("red")) return "red";
  if (raw.includes("blue")) return "blue";
  return null;
}

function getMatchNumber(match) {
  return Number(match?.matchNumber) || Number(match?.match_number) || Number(match?.number) || Number(match?.matchNum) || Number(match?.id) || 0;
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

function normalizeMatch(match, ourTeamNumber) {
  const teamEntries = Array.isArray(match?.teams) ? match.teams : [];
  const normalizedTeams = teamEntries
    .map((entry) => ({ teamNumber: extractTeamNumber(entry), alliance: extractAlliance(entry) }))
    .filter((entry) => entry.teamNumber != null);

  const redTeams = normalizedTeams.filter((entry) => entry.alliance === "red").map((entry) => entry.teamNumber);
  const blueTeams = normalizedTeams.filter((entry) => entry.alliance === "blue").map((entry) => entry.teamNumber);

  const ourAllianceColor = redTeams.includes(ourTeamNumber) ? "red" : blueTeams.includes(ourTeamNumber) ? "blue" : null;
  if (!ourAllianceColor) return null;

  return {
    raw: match,
    matchNumber: getMatchNumber(match),
    played: isPlayedMatch(match),
    allianceColor: ourAllianceColor,
    partners: ourAllianceColor === "red" ? redTeams.filter((team) => team !== ourTeamNumber) : blueTeams.filter((team) => team !== ourTeamNumber),
    opponents: ourAllianceColor === "red" ? blueTeams : redTeams,
  };
}

function normalizeTournamentMatch(match) {
  return {
    raw: match,
    matchNumber: getMatchNumber(match),
    played: isPlayedMatch(match),
  };
}

function getDisplayMatchLabel(match) {
  if (match?.matchNumber) return `#${match.matchNumber}`;
  return "—";
}

function extractTeamNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9]/g, ""));
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
    teamNumber,
    opr: formatNumericStat(stats?.opr?.totalPoints),
    rp: formatNumericStat(stats?.rp),
    wlt: formatDisplayValue(record),
    rank: formatDisplayValue(entry?.rank ?? entry?.stats?.rank),
  };
}

function toNumber(value) {
  if (typeof value === "string" && value.trim() === "21+") return 21;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function titlePark(value) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function bucketizeAuto(value) {
  const rounded = Math.round(value / 3) * 3;
  if (rounded >= 21) return "21+";
  return String(Math.max(0, rounded));
}

export default function MainScoutingPageDesktop({
  goHome = () => console.log("Go home"),
  goToPracticePage = () => console.log("Go to practice"),
  eventCode = "USNHCMP",
}) {
  const [search, setSearch] = useState("");
  const [ftcScoutSearch, setFtcScoutSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMetadata, setTeamMetadata] = useState({});
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState("");
  const [teamMatches, setTeamMatches] = useState([]);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [ourTeamNumber, setOurTeamNumber] = useState(getSavedTeamNumber());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(loadSavedSettings());
  const [sortField, setSortField] = useState("team");
  const [sortDirection, setSortDirection] = useState("asc");
  const [parkFilter, setParkFilter] = useState("all");

  const resolvedEventCode = useMemo(
    () => String(eventCode ?? getSavedEventCode()).trim().toUpperCase(),
    [eventCode]
  );

  useEffect(() => {
    setOurTeamNumber(getSavedTeamNumber());
    setSettingsDraft(loadSavedSettings());
  }, [resolvedEventCode, ourTeamNumber]);


  const fieldCount = useMemo(() => {
    const parsed = Number(settingsDraft.fieldCount ?? loadSavedSettings().fieldCount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [settingsDraft.fieldCount]);  

  const currentMatch = useMemo(() => {
    const sortedMatches = [...tournamentMatches]
      .filter((match) => match.matchNumber > 0)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    return sortedMatches.find((match) => !match.played) ?? null;
  }, [tournamentMatches]);

  const upcomingMatch = useMemo(() => {
    const sortedMatches = [...teamMatches]
      .filter((match) => match && match.matchNumber > 0)
      .sort((a, b) => a.matchNumber - b.matchNumber);
    return sortedMatches.find((match) => !match.played) ?? null;
  }, [teamMatches]);

  const currentFieldNumber = useMemo(() => {
    const matchNumber = currentMatch?.matchNumber ?? 0;
    if (!matchNumber) return "—";
    return ((matchNumber - 1) % fieldCount) + 1;
  }, [currentMatch, fieldCount]);

  const upcomingFieldNumber = useMemo(() => {
    const matchNumber = upcomingMatch?.matchNumber ?? 0;
    if (!matchNumber) return "—";
    return ((matchNumber - 1) % fieldCount) + 1;
  }, [upcomingMatch, fieldCount]);

  const saveSettings = () => {
    const nextSettings = {
      ...loadSavedSettings(),
      teamNumber: String(settingsDraft.teamNumber ?? "").trim(),
      fieldCount: Number(settingsDraft.fieldCount) || 1,
      eventCode: String(settingsDraft.eventCode ?? resolvedEventCode).trim().toUpperCase(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ftc_settings", JSON.stringify(nextSettings));
    }
    setOurTeamNumber(Number(nextSettings.teamNumber) || null);
    setSettingsDraft(nextSettings);
    setSettingsOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadTeamsAndScouting() {
      if (!resolvedEventCode) {
        setRows([]);
        setTeamMetadata({});
        setLoadingTeams(false);
        setTeamsError("No event code set.");
        return;
      }

      setLoadingTeams(true);
      setTeamsError("");

      try {
        const [response, matchesResponse] = await Promise.all([
          fetch(`${API_BASE}/events/${TEST_SEASON}/${resolvedEventCode}/teams`),
          fetch(`${API_BASE}/events/${TEST_SEASON}/${resolvedEventCode}/matches`),
        ]);
        if (!response.ok) throw new Error(`Could not load teams for ${resolvedEventCode}.`);
        if (!matchesResponse.ok) throw new Error(`Could not load matches for ${resolvedEventCode}.`);

        const json = await response.json();
        const matchesJson = await matchesResponse.json();
        const teamsList = getArrayPayload(json)
          .map(normalizeTeamStatsEntry)
          .filter((team) => team.teamNumber != null);

        const eventMatchesList = getArrayPayload(matchesJson);
        const normalizedTournamentMatches = eventMatchesList
          .map((match) => normalizeTournamentMatch(match))
          .filter((match) => match.matchNumber > 0)
          .sort((a, b) => a.matchNumber - b.matchNumber);

        const normalizedTeamMatches = ourTeamNumber
          ? eventMatchesList
              .map((match) => normalizeMatch(match, ourTeamNumber))
              .filter((match) => match && match.matchNumber > 0)
              .sort((a, b) => a.matchNumber - b.matchNumber)
          : [];

        const metadataMap = teamsList.reduce((acc, team) => {
          acc[team.teamNumber] = {
            opr: team.opr,
            wlt: team.wlt,
            rp: team.rp,
            rank: team.rank,
          };
          return acc;
        }, {});

        const scoutingResponse = await supabase
          .from("team_match_scouting")
          .select("*")
          .eq("event_code", resolvedEventCode);

        if (scoutingResponse.error) {
          throw new Error(scoutingResponse.error.message || "Failed to load scouting rows.");
        }

        const scoutingRows = scoutingResponse.data ?? [];
        const existing = new Set(
          scoutingRows.map((row) => `${row.event_code}:${row.team_number}:${row.match_index}`)
        );

        const mergedRows = [...scoutingRows];
        teamsList.forEach((team) => {
          const key = `${resolvedEventCode}:${team.teamNumber}:1`;
          if (!existing.has(key)) {
            mergedRows.push({
              event_code: resolvedEventCode,
              team_number: team.teamNumber,
              ...createDefaultScoutingMatch(1),
            });
          }
        });

        if (cancelled) return;
        setTeamMetadata(metadataMap);
        setRows(mergedRows);
        setTournamentMatches(normalizedTournamentMatches);
        setTeamMatches(normalizedTeamMatches);
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setTeamMetadata({});
          setTournamentMatches([]);
          setTeamMatches([]);
          setTeamsError(error instanceof Error ? error.message : "Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    }

    loadTeamsAndScouting();
    return () => {
      cancelled = true;
    };
  }, [resolvedEventCode]);

  useEffect(() => {
    if (!resolvedEventCode) return;

    const channel = supabase
      .channel(`desktop_team_scouting_changes:${resolvedEventCode}`)
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

          setTeamsError("");
    setRows((prev) => {
            const existingIndex = prev.findIndex(
              (item) =>
                item.event_code === row.event_code &&
                Number(item.team_number) === Number(row.team_number) &&
                Number(item.match_index) === Number(row.match_index)
            );

            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = row;
              return next;
            }
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedEventCode]);

  const eventRows = useMemo(
    () => rows.filter((row) => row.event_code === resolvedEventCode),
    [rows, resolvedEventCode]
  );

  const teamSummaries = useMemo(() => {
    const grouped = new Map();
    eventRows.forEach((row) => {
      const key = Number(row.team_number);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    const summaries = Array.from(grouped.entries()).map(([teamNumber, teamRows]) => {
      const matchCount = teamRows.length;
      const totalClose = teamRows.reduce((sum, row) => sum + toNumber(row.auto_close), 0);
      const totalFar = teamRows.reduce((sum, row) => sum + toNumber(row.auto_far), 0);
      const totalTeleop = teamRows.reduce((sum, row) => sum + toNumber(row.teleop_count), 0);
      const leaves = teamRows.reduce((sum, row) => sum + (row.auto_leave ? 1 : 0), 0);

      const parkCounts = teamRows.reduce(
        (acc, row) => {
          const key = row.endgame_park || "none";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        { none: 0, partial: 0, full: 0 }
      );

      const dominantPark = PARK_ORDER.reduce((best, current) => {
        if ((parkCounts[current] || 0) > (parkCounts[best] || 0)) return current;
        return best;
      }, "none");

      const metadata = teamMetadata[teamNumber] || {
        opr: "—",
        wlt: "—",
        rp: "—",
        rank: "—",
      };

      return {
        teamNumber,
        opr: metadata.opr,
        wlt: metadata.wlt,
        rp: metadata.rp,
        rank: metadata.rank,
        matchCount,
        hasAutoClose: totalClose > 0,
        hasAutoFar: totalFar > 0,
        closeBucket: bucketizeAuto(totalClose / matchCount),
        farBucket: bucketizeAuto(totalFar / matchCount),
        avgAutoClose: (totalClose / matchCount).toFixed(1),
        avgAutoFar: (totalFar / matchCount).toFixed(1),
        avgTeleop: (totalTeleop / matchCount).toFixed(1),
        leaveRate: Math.round((leaves / matchCount) * 100),
        dominantPark,
        notes: teamRows.map((row) => row.notes).filter(Boolean),
        rawRows: [...teamRows].sort((a, b) => a.match_index - b.match_index),
      };
    });

    summaries.sort((a, b) => a.teamNumber - b.teamNumber);
    return summaries;
  }, [eventRows, teamMetadata]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = teamSummaries.filter((team) => {
      const allNotes = team.notes.join(" ").toLowerCase();
      const matchesSearch =
        !query ||
        String(team.teamNumber).includes(query) ||
        allNotes.includes(query);
      const matchesPark = parkFilter === "all" || team.dominantPark === parkFilter;
      return matchesSearch && matchesPark;
    });

    const getSortValue = (team) => {
      switch (sortField) {
        case "team":
          return team.teamNumber;
        case "rank":
          return Number(team.rank) || Number.MAX_SAFE_INTEGER;
        case "opr":
          return Number(team.opr) || 0;
        case "rp":
          return Number(team.rp) || 0;
        case "close":
          return toNumber(team.closeBucket);
        case "far":
          return toNumber(team.farBucket);
        case "teleop":
          return Number(team.avgTeleop) || 0;
        default:
          return team.teamNumber;
      }
    };

    filtered.sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      if (typeof aValue === "string" || typeof bValue === "string") {
        const result = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
        return sortDirection === "asc" ? result : -result;
      }

      const result = aValue - bValue;
      return sortDirection === "asc" ? result : -result;
    });

    return filtered;
  }, [teamSummaries, search, sortField, sortDirection, parkFilter]);

  const selectedSummary =
    selectedTeam !== null
      ? teamSummaries.find((team) => team.teamNumber === selectedTeam) || null
      : null;

  const selectedRows = selectedSummary?.rawRows || [];
  const combinedNotes = selectedSummary?.notes || [];

  const scoutOverview = useMemo(() => {
    if (!selectedSummary) {
      return {
        matches: 0,
        avgAutoClose: "0.0",
        avgAutoFar: "0.0",
        avgTeleop: "0.0",
        leaveRate: 0,
        dominantPark: "—",
      };
    }
    return {
      matches: selectedSummary.matchCount,
      avgAutoClose: selectedSummary.avgAutoClose,
      avgAutoFar: selectedSummary.avgAutoFar,
      avgTeleop: selectedSummary.avgTeleop,
      leaveRate: selectedSummary.leaveRate,
      dominantPark: titlePark(selectedSummary.dominantPark),
    };
  }, [selectedSummary]);

  const openFtcScoutTeam = () => {
    const cleaned = ftcScoutSearch.trim();
    if (!cleaned) return;
    if (typeof window !== "undefined") {
      window.open(`https://ftcscout.org/teams/${cleaned}`, "_blank", "noopener,noreferrer");
    }
  };

  const clearTeamsError = () => setTeamsError("");

  const updateSelectedRow = async (matchIndex, field, value) => {
    const normalizedValue =
      field === "teleop_count"
        ? Math.max(0, Number(value) || 0)
        : field === "auto_leave"
          ? Boolean(value)
          : value;

    setRows((prev) =>
      prev.map((row) => {
        if (
          row.event_code !== resolvedEventCode ||
          Number(row.team_number) !== Number(selectedTeam) ||
          Number(row.match_index) !== Number(matchIndex)
        ) {
          return row;
        }
        return {
          ...row,
          [field]: normalizedValue,
          updated_at: new Date().toISOString(),
        };
      })
    );

    if (!resolvedEventCode || selectedTeam == null) return;
    const { error } = await supabase.from("team_match_scouting").upsert(
      {
        event_code: resolvedEventCode,
        team_number: selectedTeam,
        match_index: matchIndex,
        [field]: normalizedValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_code,team_number,match_index" }
    );

    if (error) {
      console.error("Failed to save scouting row:", error);
      setTeamsError(error.message || "Failed to save scouting data.");
    }
  };

  const addMatchForSelectedTeam = async () => {
    if (!resolvedEventCode || selectedTeam == null) return;

    const teamRows = rows.filter(
      (row) => row.event_code === resolvedEventCode && Number(row.team_number) === Number(selectedTeam)
    );
    const nextMatchIndex =
      teamRows.reduce((maxValue, row) => Math.max(maxValue, Number(row.match_index) || 0), 0) + 1;

    const newRow = {
      event_code: resolvedEventCode,
      team_number: selectedTeam,
      ...createDefaultScoutingMatch(nextMatchIndex),
    };

    setTeamsError("");
    setRows((prev) => [...prev, newRow]);

    const { error } = await supabase.from("team_match_scouting").upsert(newRow, {
      onConflict: "event_code,team_number,match_index",
    });

    if (error) {
      console.error("Failed to add scouting row:", error);
      setTeamsError(error.message || "Failed to add scouting match.");
    }
  };

  const deleteMatchForSelectedTeam = async (matchIndex) => {
    if (!resolvedEventCode || selectedTeam == null) return;

    const teamRows = rows.filter(
      (row) => row.event_code === resolvedEventCode && Number(row.team_number) === Number(selectedTeam)
    );
    if (teamRows.length <= 1) {
      setTeamsError("Each team must keep at least one scouting match.");
      return;
    }

    setTeamsError("");
    const previousRows = rows;
    setRows((prev) =>
      prev.filter(
        (row) =>
          !(
            row.event_code === resolvedEventCode &&
            Number(row.team_number) === Number(selectedTeam) &&
            Number(row.match_index) === Number(matchIndex)
          )
      )
    );

    const { error } = await supabase
      .from("team_match_scouting")
      .delete()
      .eq("event_code", resolvedEventCode)
      .eq("team_number", selectedTeam)
      .eq("match_index", matchIndex);

    if (error) {
      console.error("Failed to delete scouting row:", error);
      setRows(previousRows);
      setTeamsError(error.message || "Failed to delete scouting match.");
    }
  };

  const renderCurrentMatchCard = () => (
    <div style={styles.panel}>
      <div style={styles.nextMatchHeaderRow}>
        <div>
          <div style={styles.panelTitle}>Current Match</div>
          <div style={styles.panelSubtitle}>Field {currentFieldNumber}</div>
        </div>
        <div style={styles.currentMatchNumberRight}>{getDisplayMatchLabel(currentMatch)}</div>
      </div>
    </div>
  );

  const renderNextMatchCard = () => (
    <div style={styles.panel}>
      <div style={styles.nextMatchHeaderRow}>
        <div>
          <div style={styles.panelTitle}>Next Match</div>
          <div style={styles.panelSubtitle}>Field {upcomingFieldNumber}</div>
        </div>
        <div style={styles.currentMatchNumberRight}>{getDisplayMatchLabel(upcomingMatch)}</div>
      </div>
    </div>
  );

  const renderUpcomingAlliancesCard = () => {
    const ourStats = ourTeamNumber != null ? teamMetadata[ourTeamNumber] || {} : {};
    const partnerNumbers = upcomingMatch?.partners ?? [];
    const opponentNumbers = upcomingMatch?.opponents ?? [];
    const ourAllianceColor = upcomingMatch?.allianceColor === "red" ? "red" : "blue";

    const buildTeamEntry = (teamNumber, alliance) => {
      const stats = teamMetadata[teamNumber] || {};
      return {
        teamNumber,
        alliance,
        opr: formatOprValue(stats.opr),
        wlt: formatDisplayValue(stats.wlt),
        rp: formatRpValue(stats.rp),
        rank: formatDisplayValue(stats.rank),
      };
    };

    const blueTeams = upcomingMatch
      ? (ourAllianceColor === "blue"
          ? [ourTeamNumber, ...partnerNumbers]
          : opponentNumbers
        ).filter((team) => team != null).slice(0, 2).map((team) => buildTeamEntry(team, "Blue"))
      : [];

    const redTeams = upcomingMatch
      ? (ourAllianceColor === "red"
          ? [ourTeamNumber, ...partnerNumbers]
          : opponentNumbers
        ).filter((team) => team != null).slice(0, 2).map((team) => buildTeamEntry(team, "Red"))
      : [];

    return (
      <div style={styles.panel}>
        <div style={styles.panelTitle}>Upcoming Alliances</div>
        <div style={styles.nextAlliancesWrap}>
          <div style={styles.blueAlliancePanel}>
            <div style={styles.allianceSectionHeader}>
              <span style={styles.blueAllianceTitle}>Blue Alliance</span>
              {upcomingMatch?.allianceColor === "blue" && <span style={styles.weAreHereBadge}>We Are Here</span>}
            </div>
            <div style={styles.nextMatchTeamList}>
              {blueTeams.length ? blueTeams.map((team) => {
                const isUs = Number(team.teamNumber) === Number(ourTeamNumber);
                return (
                  <button
                    key={`blue-${team.teamNumber}`}
                    style={{
                      ...styles.nextMatchTeamCard,
                      ...styles.nextMatchTeamCardBlue,
                      ...(isUs ? styles.nextMatchTeamCardUs : {}),
                    }}
                    onClick={() => setSelectedTeam(team.teamNumber)}
                  >
                    <div style={styles.nextMatchTopRow}>
                      <div style={styles.nextMatchTeamNumber}>{team.teamNumber}</div>
                      <div style={{ ...styles.allianceMiniBadge, ...styles.blueBadge }}>#{team.rank}</div>
                    </div>
                    <div style={styles.nextMatchMetaRow}>
                      <span style={styles.metaPill}>OPR {team.opr}</span>
                      <span style={styles.metaPill}>{team.wlt}</span>
                      <span style={styles.metaPill}>RP {team.rp}</span>
                    </div>
                  </button>
                );
              }) : <div style={styles.emptyAllianceText}>No upcoming blue alliance data.</div>}
            </div>
          </div>
          <div style={styles.redAlliancePanel}>
            <div style={styles.allianceSectionHeader}>
              <span style={styles.redAllianceTitle}>Red Alliance</span>
              {upcomingMatch?.allianceColor === "red" && <span style={styles.weAreHereBadge}>We Are Here</span>}
            </div>
            <div style={styles.nextMatchTeamList}>
              {redTeams.length ? redTeams.map((team) => {
                const isUs = Number(team.teamNumber) === Number(ourTeamNumber);
                return (
                  <button
                    key={`red-${team.teamNumber}`}
                    style={{
                      ...styles.nextMatchTeamCard,
                      ...styles.nextMatchTeamCardRed,
                      ...(isUs ? styles.nextMatchTeamCardUs : {}),
                    }}
                    onClick={() => setSelectedTeam(team.teamNumber)}
                  >
                    <div style={styles.nextMatchTopRow}>
                      <div style={styles.nextMatchTeamNumber}>{team.teamNumber}</div>
                      <div style={{ ...styles.allianceMiniBadge, ...styles.redBadge }}>#{team.rank}</div>
                    </div>
                    <div style={styles.nextMatchMetaRow}>
                      <span style={styles.metaPill}>OPR {team.opr}</span>
                      <span style={styles.metaPill}>{team.wlt}</span>
                      <span style={styles.metaPill}>RP {team.rp}</span>
                    </div>
                  </button>
                );
              }) : <div style={styles.emptyAllianceText}>No upcoming red alliance data.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.secondaryButton} onClick={goHome}>← Back</button>
            <div>
              <div style={styles.headerEyebrow}>SURFACE SCOUTING</div>
              <div style={styles.headerTitle}>Competition Dashboard</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.eventChip}>Event: {resolvedEventCode || "No event code"}</div>
            <button style={styles.secondaryButton} onClick={() => setSettingsOpen(true)}>Settings</button>
            <div style={styles.headerSearchGroup}>
              <input
                style={styles.headerSearchInput}
                value={ftcScoutSearch}
                onChange={(e) => setFtcScoutSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openFtcScoutTeam();
                }}
                placeholder="Open team in FTC Scout"
              />
            </div>
          </div>
        </div>

        {settingsOpen ? (
          <div style={styles.settingsOverlay}>
            <div style={styles.settingsModal}>
              <div style={styles.settingsHeader}>
                <div>
                  <div style={styles.headerEyebrow}>SETTINGS</div>
                  <div style={styles.settingsTitle}>Competition Config</div>
                </div>
                <button style={styles.secondaryButton} onClick={() => setSettingsOpen(false)}>Close</button>
              </div>
              <div style={styles.settingsBody}>
                <label style={styles.settingsLabel}>
                  <span style={styles.settingsLabelText}>Team Number</span>
                  <input
                    style={styles.settingsInput}
                    value={settingsDraft.teamNumber}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, teamNumber: e.target.value }))}
                    placeholder="Enter team number"
                  />
                </label>
                <label style={styles.settingsLabel}>
                  <span style={styles.settingsLabelText}>Field Count</span>
                  <input
                    style={styles.settingsInput}
                    value={settingsDraft.fieldCount}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, fieldCount: e.target.value }))}
                    placeholder="Enter field count"
                  />
                </label>
              </div>
              <div style={styles.settingsActions}>
                <button style={styles.successButton} onClick={saveSettings}>Save Settings</button>
              </div>
            </div>
          </div>
        ) : null}

        <div style={styles.mainGrid}>
          <div style={styles.sidebar}>
            {renderCurrentMatchCard()}
            {renderNextMatchCard()}
            {renderUpcomingAlliancesCard()}
            <div style={styles.sidebarFooter}>
              <div style={styles.practiceCard}>
                <div>
                  <div style={styles.practiceTitle}>Drivers Practice</div>
                  <div style={styles.practiceDesc}>Access to Desktop Drivers Practice Portal</div>
                </div>
                <button style={styles.successButton} onClick={goToPracticePage}>Open</button>
              </div>
            </div>
          </div>

          <div style={styles.sheetArea}>
            {teamsError ? (
              <div style={styles.errorBannerWrap}>
                <div style={styles.errorBanner}>{teamsError}</div>
                <button type="button" style={styles.errorDismissButton} onClick={clearTeamsError}>
                  Dismiss
                </button>
              </div>
            ) : null}
            {loadingTeams ? <div style={styles.loadingCard}>Loading event teams...</div> : null}
            <div style={styles.sheetPanel}>
              <div style={styles.sheetHeader}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {selectedSummary && (
                      <button style={styles.secondaryButton} onClick={() => setSelectedTeam(null)}>←</button>
                    )}
                    <div style={styles.panelTitle}>
                      {selectedSummary ? `Team ${selectedSummary.teamNumber}` : "Team Averages & Notes"}
                    </div>
                  </div>
                  <div style={styles.panelSubtitle}>
                    {selectedSummary
                      ? "Per-match breakdown and notes"
                      : "Click a row to open detailed team stats."}
                  </div>
                </div>
                <div style={styles.sheetHeaderActions}>
                  <input
                    style={styles.searchInput}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search team number or notes"
                  />
                  {!selectedSummary && (
                    <>
                      <select
                        style={styles.toolbarSelect}
                        value={parkFilter}
                        onChange={(e) => setParkFilter(e.target.value)}
                      >
                        <option value="all">All Parks</option>
                        <option value="none">None</option>
                        <option value="partial">Partial</option>
                        <option value="full">Full</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              {!loadingTeams && (selectedSummary ? (
                <>
                  <div style={styles.summaryGrid}>
                    <div style={styles.statCard}><div style={styles.statLabel}>Matches Played</div><div style={styles.statValue}>{scoutOverview.matches}</div></div>
                    <div style={styles.statCard}><div style={styles.statLabel}>Avg Auto Close</div><div style={styles.statValue}>{scoutOverview.avgAutoClose}</div></div>
                    <div style={styles.statCard}><div style={styles.statLabel}>Avg Auto Far</div><div style={styles.statValue}>{scoutOverview.avgAutoFar}</div></div>
                    <div style={styles.statCard}><div style={styles.statLabel}>Avg Teleop</div><div style={styles.statValue}>{scoutOverview.avgTeleop}</div></div>
                    <div style={styles.statCard}><div style={styles.statLabel}>Auto Leave</div><div style={styles.statValue}>{scoutOverview.leaveRate}%</div></div>
                    <div style={styles.statCard}><div style={styles.statLabel}>Typical Park</div><div style={styles.statValue}>{scoutOverview.dominantPark}</div></div>
                  </div>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailPanel}>
                      <div style={styles.detailPanelHeader}>Per-Match Breakdown</div>
                      <div style={styles.tableWrap}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Match</th>
                              <th style={styles.th}>Close</th>
                              <th style={styles.th}>Far</th>
                              <th style={styles.th}>Leave</th>
                              <th style={styles.th}>Teleop</th>
                              <th style={styles.th}>Park</th>
                              <th style={styles.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRows.map((row) => (
                              <tr key={`${row.team_number}-${row.match_index}`}>
                                <td style={styles.tdText}>Q{row.match_index}</td>
                                <td style={styles.tdEdit}>
                                  <select style={styles.cellSelect} value={row.auto_close} onChange={(e) => updateSelectedRow(row.match_index, "auto_close", e.target.value)}>
                                    {AUTO_OPTIONS.map((option) => <option key={`close-${option}`} value={option}>{option}</option>)}
                                  </select>
                                </td>
                                <td style={styles.tdEdit}>
                                  <select style={styles.cellSelect} value={row.auto_far} onChange={(e) => updateSelectedRow(row.match_index, "auto_far", e.target.value)}>
                                    {AUTO_OPTIONS.map((option) => <option key={`far-${option}`} value={option}>{option}</option>)}
                                  </select>
                                </td>
                                <td style={styles.tdEdit}>
                                  <button style={{ ...styles.toggle, ...(row.auto_leave ? styles.toggleOn : {}) }} onClick={() => updateSelectedRow(row.match_index, "auto_leave", !row.auto_leave)}>
                                    <div style={{ ...styles.toggleKnob, ...(row.auto_leave ? styles.toggleKnobOn : {}) }} />
                                  </button>
                                </td>
                                <td style={styles.tdEdit}>
                                  <input type="number" min="0" style={styles.cellInput} value={row.teleop_count} onChange={(e) => updateSelectedRow(row.match_index, "teleop_count", e.target.value)} />
                                </td>
                                <td style={styles.tdEdit}>
                                  <select style={styles.cellSelect} value={row.endgame_park} onChange={(e) => updateSelectedRow(row.match_index, "endgame_park", e.target.value)}>
                                    <option value="none">None</option>
                                    <option value="partial">Partial</option>
                                    <option value="full">Full</option>
                                  </select>
                                </td>
                                <td style={styles.tdAction}>
                                  <button
                                    type="button"
                                    style={styles.deleteButton}
                                    onClick={() => deleteMatchForSelectedTeam(row.match_index)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {!selectedRows.length && <tr><td style={styles.emptyCell} colSpan={7}>No scouting rows yet for this team.</td></tr>}
                            <tr>
                              <td style={styles.addMatchRow} colSpan={7}>
                                <button type="button" style={styles.addMatchButton} onClick={addMatchForSelectedTeam}>
                                  + Add Match
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div style={styles.notesPanel}>
                      <div style={styles.detailPanelHeader}>Scout Notes</div>
                      <div style={styles.notesList}>
                        {combinedNotes.length ? combinedNotes.map((note, index) => (
                          <div key={`${selectedSummary.teamNumber}-note-${index}`} style={styles.noteCard}>
                            <div style={styles.noteMatchLabel}>Match {selectedRows[index]?.match_index ?? "—"}</div>
                            <div style={styles.noteText}>{note}</div>
                          </div>
                        )) : <div style={styles.noteEmpty}>No notes recorded yet.</div>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {[
                          { key: "team", label: "Team" },
                          { key: "rank", label: "Rank" },
                          { key: "opr", label: "OPR" },
                          { key: null, label: "W/L/T" },
                          { key: "rp", label: "RP" },
                          { key: null, label: "Matches" },
                          { key: "close", label: "Close" },
                          { key: "far", label: "Far" },
                          { key: "teleop", label: "Avg Teleop" },
                          { key: null, label: "Leave %" },
                          { key: null, label: "Park" },
                          { key: null, label: "Notes" },
                        ].map((col) => {
                          const isActive = col.key && sortField === col.key;
                          return (
                            <th
                              key={col.label}
                              style={{
                                ...styles.th,
                                cursor: col.key ? "pointer" : "default",
                                userSelect: "none",
                              }}
                              onClick={() => {
                                if (!col.key) return;
                                if (sortField === col.key) {
                                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                } else {
                                  setSortField(col.key);
                                  setSortDirection("asc");
                                }
                              }}
                            >
                              {col.label}
                              {isActive && (
                                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                                  {sortDirection === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeams.map((team) => (
                        <tr key={team.teamNumber} style={styles.clickableRow} onClick={() => setSelectedTeam(team.teamNumber)}>
                          <td style={styles.tdText}>{team.teamNumber}</td>
                          <td style={styles.tdText}>{team.rank}</td>
                          <td style={styles.tdText}>{team.opr}</td>
                          <td style={styles.tdText}>{team.wlt}</td>
                          <td style={styles.tdText}>{team.rp}</td>
                          <td style={styles.tdText}>{team.matchCount}</td>
                          <td style={styles.tdText}>{team.hasAutoClose && team.closeBucket !== "0" ? team.closeBucket : ""}</td>
                          <td style={styles.tdText}>{team.hasAutoFar && team.farBucket !== "0" ? team.farBucket : ""}</td>
                          <td style={styles.tdText}>{team.avgTeleop}</td>
                          <td style={styles.tdText}>{team.leaveRate}%</td>
                          <td style={styles.tdText}>{titlePark(team.dominantPark)}</td>
                          <td style={styles.tdText}>{team.notes[0] || "—"}</td>
                        </tr>
                      ))}
                      {!filteredTeams.length && <tr><td style={styles.emptyCell} colSpan={12}>No teams match the current search.</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
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
    background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
    gap: "16px",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "16px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  headerSearchGroup: { display: "flex", alignItems: "center", gap: "10px" },
  headerSearchInput: {
    width: "240px",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f0f10",
    color: "#ffffff",
    outline: "none",
  },
  headerEyebrow: { fontSize: "12px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.58)", marginBottom: "4px" },
  headerTitle: { fontSize: "28px", fontWeight: 800, color: "#ffffff" },
  eventChip: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(19,176,212,0.28)",
    background: "rgba(19,176,212,0.12)",
    color: "#9feaff",
    fontWeight: 600,
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
  mainGrid: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "420px minmax(0, 1fr)" },
  sidebar: {
    padding: "18px",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minHeight: 0,
    overflow: "auto",
  },
  sidebarFooter: { marginTop: "auto", paddingTop: "4px" },
  practiceCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  },
  practiceTitle: { fontSize: "14px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" },
  practiceDesc: { fontSize: "12px", color: "rgba(255,255,255,0.6)" },
  successButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(34,197,94,0.4)",
    background: "#22c55e",
    color: "#022c22",
    fontWeight: 800,
    cursor: "pointer",
  },
  sheetArea: { padding: "18px", minHeight: 0, overflow: "hidden" },
  panel: {
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: "16px",
  },
  panelTitle: { fontSize: "18px", fontWeight: 750, color: "#ffffff", marginBottom: "0px" },
  panelSubtitle: { fontSize: "13px", color: "rgba(255,255,255,0.58)" },
  nextMatchHeaderRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "14px" },
  currentMatchNumberRight: {
    fontSize: "56px",
    fontWeight: 800,
    color: "#13b0d4",
    lineHeight: 1,
    textAlign: "right",
    minWidth: "fit-content",
    marginLeft: "auto",
  },
  nextAlliancesWrap: { display: "flex", flexDirection: "column", gap: "14px", marginTop: "1rem" },
  allianceSectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" },
  blueAlliancePanel: { borderRadius: "14px", border: "1px solid rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.12)", padding: "12px" },
  redAlliancePanel: { borderRadius: "14px", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", padding: "12px" },
  blueAllianceTitle: { color: "#60a5fa", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" },
  redAllianceTitle: { color: "#f87171", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" },
  weAreHereBadge: {
    padding: "4px 8px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 800,
  },
  nextMatchTeamList: { display: "flex", flexDirection: "column", gap: "10px" },
  nextMatchTeamCard: {
    textAlign: "left",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#ffffff",
    cursor: "pointer",
  },
  nextMatchTeamCardUs: { boxShadow: "0 0 0 1px rgba(19,176,212,0.22) inset" },
  nextMatchTeamCardBlue: { borderColor: "rgba(59,130,246,0.42)", background: "rgba(30,64,175,0.18)" },
  nextMatchTeamCardRed: { borderColor: "rgba(239,68,68,0.42)", background: "rgba(127,29,29,0.18)" },
  nextMatchTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" },
  nextMatchTeamNumber: { fontSize: "18px", fontWeight: 800 },
  allianceMiniBadge: { padding: "4px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, border: "1px solid transparent" },
  blueBadge: { background: "rgba(59,130,246,0.2)", borderColor: "rgba(59,130,246,0.35)", color: "#93c5fd" },
  redBadge: { background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.35)", color: "#fca5a5" },
  nextMatchMetaRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  searchInput: {
    width: "260px",
    boxSizing: "border-box",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f0f10",
    color: "#ffffff",
    outline: "none",
  },
  toolbarSelect: {
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f0f10",
    color: "#ffffff",
    outline: "none",
    minWidth: "120px",
  },
  clickableRow: { cursor: "pointer" },
  metaPill: { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", fontSize: "12px", whiteSpace: "nowrap" },
  sheetPanel: {
    height: "100%",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  sheetHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" },
  sheetHeaderActions: { display: "flex", alignItems: "center", gap: "12px" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "12px", marginBottom: "16px" },
  statCard: { borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "14px", minWidth: 0 },
  statLabel: { fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" },
  statValue: { fontSize: "28px", fontWeight: 800, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  detailGrid: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "16px" },
  detailPanel: { minHeight: 0, borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "14px", display: "flex", flexDirection: "column" },
  notesPanel: { minHeight: 0, borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "14px", display: "flex", flexDirection: "column" },
  detailPanelHeader: { fontSize: "16px", fontWeight: 750, color: "#ffffff", marginBottom: "12px" },
  tableWrap: { flex: 1, minHeight: 0, overflow: "auto", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "1200px", background: "rgba(10,10,11,0.38)" },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    textAlign: "left",
    padding: "16px 12px",
    background: "#151518",
    color: "rgba(255,255,255,0.72)",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tdText: { padding: "16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#ffffff", fontSize: "14px", background: "rgba(255,255,255,0.015)" },
  tdEdit: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontSize: "14px",
    background: "rgba(255,255,255,0.015)",
  },
  tdAction: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.015)",
    textAlign: "right",
    width: "120px",
  },
  addMatchRow: {
    padding: "14px 10px",
    background: "rgba(255,255,255,0.015)",
    textAlign: "right",
  },
  deleteButton: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.6)",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  addMatchButton: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  cellSelect: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0f0f10",
    color: "#ffffff",
    outline: "none",
  },
  cellInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0f0f10",
    color: "#ffffff",
    outline: "none",
  },
  emptyCell: { padding: "18px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.015)" },
  notesList: { flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: "10px" },
  noteCard: { borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "12px" },
  noteMatchLabel: { fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#9feaff", marginBottom: "6px" },
  noteText: { fontSize: "14px", color: "rgba(255,255,255,0.78)", lineHeight: 1.5 },
  noteEmpty: { color: "rgba(255,255,255,0.55)", fontSize: "14px" },
  emptyAllianceText: {
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.6)",
    fontSize: "13px",
  },
  loadingCard: {
    marginBottom: "12px",
    padding: "18px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.72)",
  },
  errorBannerWrap: {
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  errorBanner: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(248,113,113,0.22)",
    background: "rgba(239,68,68,0.12)",
    color: "#fecaca",
    fontSize: "14px",
  },
  errorDismissButton: {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.78)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  settingsOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "24px",
  },
  settingsModal: {
    width: "100%",
    maxWidth: "460px",
    borderRadius: "24px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(20,20,22,0.96)",
    boxShadow: "0 25px 70px rgba(0,0,0,0.45)",
    padding: "20px",
  },
  settingsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
  },
  settingsTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#ffffff",
  },
  settingsBody: {
    display: "grid",
    gap: "14px",
  },
  settingsLabel: {
    display: "grid",
    gap: "8px",
  },
  settingsLabelText: {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.62)",
    fontWeight: 700,
  },
  settingsInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0f0f10",
    color: "#ffffff",
    outline: "none",
  },
  settingsActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "18px",
  },
  toggle: {
    width: "42px",
    height: "22px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    position: "relative",
    cursor: "pointer",
    padding: 0,
  },
  toggleOn: { background: "#13b0d4", borderColor: "#13b0d4" },
  toggleKnob: {
    position: "absolute",
    top: "2px",
    left: "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#ffffff",
    transition: "all 0.2s ease",
  },
  toggleKnobOn: { left: "22px" },
};
