import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useRideStore } from "@/store/useRideStore";
import { useSettingsStore } from "@/store/useSettingsStore";

const REPEAT_MS = 15_000; // re-buzz at most this often while still speeding

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
 * Haptic + spoken warning when the rider exceeds the posted speed limit by more
 * than the configured tolerance. Buzzes on the rising edge and repeats while
 * still over; speaks once per over-limit episode (only if voice is enabled).
 */
export function useSpeedWarning() {
  const { t, i18n } = useTranslation();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const speedMps = useRideStore((s) => s.currentSpeedMps);
  const limitKmh = useRideStore((s) => s.currentSpeedLimit);
  const voiceEnabled = useRideStore((s) => s.voiceEnabled);
  const toleranceKmh = useSettingsStore((s) => s.speedToleranceKmh);

  const wasSpeeding = useRef(false);
  const lastBuzz = useRef(0);

  useEffect(() => {
    if (!isNavigating) {
      wasSpeeding.current = false;
      return;
    }
    const speeding =
      limitKmh != null &&
      speedMps != null &&
      speedMps >= 0 &&
      speedMps * 3.6 > limitKmh + toleranceKmh;

    if (speeding) {
      const rising = !wasSpeeding.current;
      const now = Date.now();
      if (rising || now - lastBuzz.current > REPEAT_MS) {
        lastBuzz.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        if (rising && voiceEnabled) {
          Speech.speak(t("nav.speedWarning"), { language: speechLocale(i18n.language) });
        }
      }
    }
    wasSpeeding.current = speeding;
  }, [isNavigating, speedMps, limitKmh, toleranceKmh, voiceEnabled, t, i18n.language]);
}
