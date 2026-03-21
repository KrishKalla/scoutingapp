import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";

import CompetitionHomeMobileView from "./pages/home_page_mobile_view.jsx";
import TeamListMobileView from "./pages/scouting_page_mobile_view.jsx";
import DriversPracticeMobileView from "./pages/drivers_practice_mobile_view.jsx";

import CompetitionHomeDesktopView from "./pages/welcome_splash_desktop.jsx";
import MainScoutingPageDesktop from "./pages/main_scouting_page_desktop.jsx";
import DriversPracticeDesktopView from "./pages/drivers_practice_page_desktop.jsx";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isDesktop;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [currentEventCode, setCurrentEventCode] = useState("");
  const [selectedTeamNumber, setSelectedTeamNumber] = useState(null);
  const [homeView, setHomeView] = useState("desktop");

  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!isDesktop) {
      setHomeView("mobile");
    }
  }, [isDesktop]);

  if (page === "home") {
    const showDesktopHome = isDesktop && homeView === "desktop";

    return (
      <>
        {showDesktopHome ? (
          <CompetitionHomeDesktopView
            goToScoutingPage={(eventCode) => {
              setCurrentEventCode(eventCode);
              setSelectedTeamNumber(null);
              setPage("scouting");
            }}
            switchToMobileView={() => setHomeView("mobile")}
            goToPracticePage={() => {
              setPage("practice");
            }}
          />
        ) : (
          <CompetitionHomeMobileView
            goToScoutingPage={(eventCode) => {
              setCurrentEventCode(eventCode);
              setSelectedTeamNumber(null);
              setPage("scouting");
            }}
            goToPracticePage={() => {
              setPage("practice");
            }}
            goToTeamNotes={(eventCode, teamNumber) => {
              setCurrentEventCode(eventCode);
              setSelectedTeamNumber(teamNumber);
              setPage("scouting");
            }}
            showDesktopButton={isDesktop}
            switchToDesktopView={() => setHomeView("desktop")}
          />
        )}
        <Analytics />
      </>
    );
  }

  if (page === "scouting") {
    return (
      <>
        {isDesktop ? (
          <MainScoutingPageDesktop
            goHome={() => setPage("home")}
            goToPracticePage={() => setPage("practice")}
            eventCode={currentEventCode}
          />
        ) : (
          <TeamListMobileView
            goHome={() => setPage("home")}
            initialTeamNumber={selectedTeamNumber}
            eventCode={currentEventCode}
          />
        )}
        <Analytics />
      </>
    );
  }

  if (page === "practice") {
    return (
      <>
        {isDesktop ? (
          <DriversPracticeDesktopView
            goBackToScouting={() => setPage("scouting")}
          />
        ) : (
          <DriversPracticeMobileView
            goHome={() => setPage("home")}
          />
        )}
        <Analytics />
      </>
    );
  }

  return null;
}
