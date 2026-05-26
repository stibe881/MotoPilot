import { Platform } from "react-native";
import { useCallStore } from "@/store/useCallStore";

// react-native-callkeep requires native modules (CallKit/ConnectionService) that
// are not available in Expo Go. We load it lazily with a no-op fallback so the
// app can run in Expo Go during development.
let RNCallKeep: any = null;
try {
  const module = require("react-native-callkeep");
  RNCallKeep = module?.default || module;
} catch {
  // Native module not available (e.g. Expo Go) – use no-ops below
}

// react-native-callkeep bridges to iOS CallKit. NOTE: CallKit is for VoIP /
// app-handled calls — iOS does not let a third-party app replace the system UI
// for regular cellular (PSTN) calls. This drives an in-app overlay for VoIP
// calls the app reports (e.g. via a PushKit wake handled in AppDelegate).

let initialized = false;

export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function setupCallKeep(): Promise<void> {
  if (initialized) return;
  
  if (!RNCallKeep || typeof RNCallKeep.setup !== "function") {
    console.warn("[CallKeep] Native setup is not available. App will fall back to the in-app call overlay.");
    initialized = true;
    return;
  }

  try {
    await RNCallKeep.setup({
      ios: {
        appName: "MotoPilot",
        supportsVideo: false,
        maximumCallGroups: "1",
        maximumCallsPerCallGroup: "1",
      },
      android: {
        alertTitle: "Permissions required",
        alertDescription: "MotoPilot needs access to manage in-app calls.",
        cancelButton: "Cancel",
        okButton: "OK",
        additionalPermissions: [],
        foregroundService: {
          channelId: "me.stibe.motopilot.calls",
          channelName: "Calls",
          notificationTitle: "MotoPilot is handling a call",
        },
      },
    });
    RNCallKeep.setAvailable(true);

    const { setCall, setState } = useCallStore.getState();

    RNCallKeep.addEventListener("answerCall", ({ callUUID }) => {
      RNCallKeep.setCurrentCallActive(callUUID);
      setState("active");
    });

    RNCallKeep.addEventListener("endCall", () => {
      setCall(null);
    });

    RNCallKeep.addEventListener("didPerformSetMutedCallAction", () => {
      /* hook up mute UI if needed */
    });

    initialized = true;
  } catch (error) {
    console.warn("[CallKeep] Native setup failed:", error);
  }
}

/** Report an incoming call to CallKit and reflect it in the in-app overlay. */
export function reportIncomingCall(handle: string, callerName: string): string {
  const uuid = uuidv4();
  useCallStore.getState().setCall({ uuid, handle, callerName, state: "incoming" });
  
  if (RNCallKeep && typeof RNCallKeep.displayIncomingCall === "function") {
    try {
      RNCallKeep.displayIncomingCall(uuid, handle, callerName, "number", false);
    } catch (e) {
      console.warn("[CallKeep] displayIncomingCall failed:", e);
    }
  }
  return uuid;
}

export function startOutgoingCall(handle: string, callerName: string): string {
  const uuid = uuidv4();
  useCallStore.getState().setCall({ uuid, handle, callerName, state: "outgoing" });
  
  if (RNCallKeep && typeof RNCallKeep.startCall === "function") {
    try {
      RNCallKeep.startCall(uuid, handle, callerName, "number", false);
    } catch (e) {
      console.warn("[CallKeep] startCall failed:", e);
    }
  }
  return uuid;
}

export function answerCall(uuid: string): void {
  if (RNCallKeep && typeof RNCallKeep.answerIncomingCall === "function") {
    try {
      RNCallKeep.answerIncomingCall(uuid);
      RNCallKeep.setCurrentCallActive(uuid);
    } catch (e) {
      console.warn("[CallKeep] answerIncomingCall/setCurrentCallActive failed:", e);
    }
  }
  useCallStore.getState().setState("active");
}

export function endCall(uuid: string): void {
  if (RNCallKeep && typeof RNCallKeep.endCall === "function") {
    try {
      RNCallKeep.endCall(uuid);
    } catch (e) {
      console.warn("[CallKeep] endCall failed:", e);
    }
  }
  useCallStore.getState().setCall(null);
}

export function teardownCallKeep(): void {
  if (RNCallKeep && Platform.OS === "ios" && typeof RNCallKeep.setAvailable === "function") {
    try {
      RNCallKeep.setAvailable(false);
    } catch (e) {
      console.warn("[CallKeep] setAvailable failed:", e);
    }
  }
}
