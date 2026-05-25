import { Platform } from "react-native";
import RNCallKeep from "react-native-callkeep";
import { useCallStore } from "@/store/useCallStore";

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
}

/** Report an incoming call to CallKit and reflect it in the in-app overlay. */
export function reportIncomingCall(handle: string, callerName: string): string {
  const uuid = uuidv4();
  useCallStore.getState().setCall({ uuid, handle, callerName, state: "incoming" });
  RNCallKeep.displayIncomingCall(uuid, handle, callerName, "number", false);
  return uuid;
}

export function startOutgoingCall(handle: string, callerName: string): string {
  const uuid = uuidv4();
  useCallStore.getState().setCall({ uuid, handle, callerName, state: "outgoing" });
  RNCallKeep.startCall(uuid, handle, callerName, "number", false);
  return uuid;
}

export function answerCall(uuid: string): void {
  RNCallKeep.answerIncomingCall(uuid);
  RNCallKeep.setCurrentCallActive(uuid);
  useCallStore.getState().setState("active");
}

export function endCall(uuid: string): void {
  RNCallKeep.endCall(uuid);
  useCallStore.getState().setCall(null);
}

export function teardownCallKeep(): void {
  if (Platform.OS === "ios") RNCallKeep.setAvailable(false);
}
