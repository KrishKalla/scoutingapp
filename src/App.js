import { useEffect, useState } from "react";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

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
              setPage("scoutingDesktop");
            }}
            switchToMobileView={() => setHomeView("mobile")}
            goToPracticePage={() => {
              setPage("practiceDesktop");
            }}
          />
        ) : (
          <CompetitionHomeMobileView
            goToScoutingPage={(eventCode) => {
              setCurrentEventCode(eventCode);
              setSelectedTeamNumber(null);
              setPage("scoutingMobile");
            }}
            goToPracticePage={() => {
              setPage("practiceMobile");
            }}
            goToTeamNotes={(eventCode, teamNumber) => {
              setCurrentEventCode(eventCode);
              setSelectedTeamNumber(teamNumber);
              setPage("scoutingMobile");
            }}
            showDesktopButton={isDesktop}
            switchToDesktopView={() => setHomeView("desktop")}
          />
        )}
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  if (page === "scoutingDesktop") {
    return (
      <>
        <MainScoutingPageDesktop
          goHome={() => setPage("home")}
          goToPracticePage={() => setPage("practiceDesktop")}
          eventCode={currentEventCode}
        />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  if (page === "scoutingMobile") {
    return (
      <>
        <TeamListMobileView
          goHome={() => setPage("home")}
          initialTeamNumber={selectedTeamNumber}
          eventCode={currentEventCode}
        />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  if (page === "practiceDesktop") {
    return (
      <>
        <DriversPracticeDesktopView
          goBackToScouting={() => setPage("scoutingDesktop")}
        />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  if (page === "practiceMobile") {
    return (
      <>
        <DriversPracticeMobileView
          goHome={() => setPage("home")}
        />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  return null;
}
