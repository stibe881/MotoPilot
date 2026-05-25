const {
  withInfoPlist,
  withEntitlementsPlist,
  withAppDelegate,
} = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

/**
 * Custom config plugin for react-native-callkeep on iOS.
 *
 * Info.plist / entitlements:
 *  - "voip" and "audio" background modes so the call UI / audio session stays
 *    alive when the app is backgrounded on a handlebar mount.
 *  - A microphone usage string (CallKit routes audio through the headset).
 *  - The aps-environment entitlement so PushKit VoIP pushes can wake the app.
 *
 * AppDelegate (Swift):
 *  - Registers a PKPushRegistry for VoIP pushes and reports incoming calls to
 *    RNCallKeep within the iOS-mandated deadline.
 *
 * NOTE: the AppDelegate injection is applied by prebuild but can only be
 * COMPILE-verified in Xcode. It assumes static frameworks (set via
 * expo-build-properties) so `import RNCallKeep` resolves; pairs well with
 * react-native-voip-push-notification if you prefer JS-side token handling.
 */

const VOIP_EXTENSION = `
// Added by withCallKeep: PushKit VoIP -> RNCallKeep bridge.
extension AppDelegate: PKPushRegistryDelegate {
  func voipRegistration() {
    let voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    voipRegistry.delegate = self
    voipRegistry.desiredPushTypes = [.voIP]
  }

  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    // TODO: send this VoIP token to your backend so it can deliver pushes.
    NSLog("[MotoPilot] VoIP push token: \\(token)")
  }

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let info = payload.dictionaryPayload
    let uuid = (info["uuid"] as? String) ?? UUID().uuidString
    let handle = (info["handle"] as? String) ?? ""
    let callerName = (info["callerName"] as? String) ?? "Unknown"
    RNCallKeep.reportNewIncomingCall(
      uuid,
      handle: handle,
      handleType: "generic",
      hasVideo: false,
      localizedCallerName: callerName,
      supportsHolding: true,
      supportsDTMF: true,
      supportsGrouping: true,
      supportsUngrouping: true,
      fromPushKit: true,
      payload: nil,
      withCompletionHandler: nil
    )
    completion()
  }
}
`;

function withCallKeepAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      // Objective-C AppDelegate (older templates) — skip; wire PushKit manually.
      return cfg;
    }
    let contents = cfg.modResults.contents;

    // 1) imports
    contents = mergeContents({
      tag: "callkeep-imports",
      src: contents,
      newSrc: "import PushKit\nimport RNCallKeep",
      anchor: /import Expo/,
      offset: 1,
      comment: "//",
    }).contents;

    // 2) start VoIP registration during launch
    contents = mergeContents({
      tag: "callkeep-voip-register",
      src: contents,
      newSrc: "    self.voipRegistration()",
      anchor: /bindReactNativeFactory\(factory\)/,
      offset: 1,
      comment: "//",
    }).contents;

    // 3) the delegate extension (idempotent)
    if (!contents.includes("PKPushRegistryDelegate")) {
      contents += VOIP_EXTENSION;
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

const withCallKeep = (config) => {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;

    const modes = new Set(plist.UIBackgroundModes || []);
    modes.add("voip");
    modes.add("audio");
    plist.UIBackgroundModes = Array.from(modes);

    if (!plist.NSMicrophoneUsageDescription) {
      plist.NSMicrophoneUsageDescription =
        "MotoPilot needs microphone access to handle in-app calls through your connected headset.";
    }

    return cfg;
  });

  config = withEntitlementsPlist(config, (cfg) => {
    if (!cfg.modResults["aps-environment"]) {
      cfg.modResults["aps-environment"] = "production";
    }
    return cfg;
  });

  config = withCallKeepAppDelegate(config);

  return config;
};

module.exports = withCallKeep;
