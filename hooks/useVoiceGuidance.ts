import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";
import { useRideStore } from "@/store/useRideStore";

function speechLocale(lang: string): string {
  switch (lang) {
    case "de":
      return "de-DE";
    case "fr":
      return "fr-FR";
    default:
      return "en-US";
  }
}

/**
 * Speaks the current turn instruction aloud when the active step changes
 * (and when navigation starts), in the rider's profile language. Mount once on
 * the navigation screen alongside useNavigationTracker.
 */
export function useVoiceGuidance() {
  const { t, i18n } = useTranslation();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const voiceEnabled = useRideStore((s) => s.voiceEnabled);
  const route = useRideStore((s) => s.route);
  const stepIndex = useRideStore((s) => s.stepIndex);
  const arrived = useRideStore((s) => s.arrived);
  const spokenStep = useRef<number>(-1);
  const announcedArrival = useRef(false);

  useEffect(() => {
    if (!isNavigating || !voiceEnabled || !route) return;
    // Speak the upcoming maneuver — the same one the banner shows.
    const upcoming = route.steps[stepIndex + 1] ?? route.steps[stepIndex];
    if (!upcoming?.instruction) return;
    if (spokenStep.current === stepIndex) return;
    spokenStep.current = stepIndex;
    Speech.stop();
    Speech.speak(upcoming.instruction, { language: speechLocale(i18n.language) });
  }, [isNavigating, voiceEnabled, route, stepIndex, i18n.language]);

  // Announce arrival once.
  useEffect(() => {
    if (arrived && voiceEnabled && !announcedArrival.current) {
      announcedArrival.current = true;
      Speech.stop();
      Speech.speak(t("nav.arrivedVoice"), { language: speechLocale(i18n.language) });
    }
    if (!arrived) announcedArrival.current = false;
  }, [arrived, voiceEnabled, t, i18n.language]);

  // Reset / silence when navigation ends or voice is muted.
  useEffect(() => {
    if (!isNavigating || !voiceEnabled) {
      spokenStep.current = -1;
      if (!voiceEnabled) Speech.stop();
    }
  }, [isNavigating, voiceEnabled]);
}
