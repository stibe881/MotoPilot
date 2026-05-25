const { withInfoPlist, withEntitlementsPlist } = require("@expo/config-plugins");

/**
 * Custom config plugin for react-native-callkeep on iOS.
 *
 * CallKit + VoIP push (PushKit) require:
 *  - "voip" and "audio" background modes so the call UI / audio session
 *    stays alive when the app is backgrounded on a handlebar mount.
 *  - A microphone usage string (CallKit routes audio through the headset).
 *  - The aps-environment entitlement so PushKit VoIP pushes can wake the app
 *    to report an incoming call within the iOS-mandated deadline.
 *
 * Note: the matching native wiring (PushKit delegate -> RNCallKeep) still has
 * to live in AppDelegate; this plugin only guarantees the Info.plist /
 * entitlements are present so the build is valid.
 */
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

  return config;
};

module.exports = withCallKeep;
