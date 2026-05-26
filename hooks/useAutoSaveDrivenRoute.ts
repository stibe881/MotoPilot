import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { saveDrivenRoute } from "@/lib/routes";
import { useRideStore } from "@/store/useRideStore";

/**
 * On arrival, save the actually-ridden trail (breadcrumb path) once, so the
 * rider keeps a record of the trip. Trails shorter than 2 points are ignored.
 */
export function useAutoSaveDrivenRoute() {
  const { t } = useTranslation();
  const arrived = useRideStore((s) => s.arrived);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!arrived) {
      savedRef.current = false;
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;

    const { trackedPath, preference } = useRideStore.getState();
    if (trackedPath.length < 2) return;
    const name = t("nav.ridden", { date: new Date().toLocaleDateString() });
    saveDrivenRoute(name, trackedPath, preference).catch(() => undefined);
  }, [arrived, t]);
}
