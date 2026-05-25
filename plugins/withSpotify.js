const { withInfoPlist } = require("@expo/config-plugins");

const SPOTIFY_AUTH_CALLBACK_SCHEME = "motopilot";

/**
 * Custom config plugin wiring the native Spotify iOS SDK / auth flow.
 *
 *  - LSApplicationQueriesSchemes "spotify" lets us detect the installed app and
 *    hand off to the Spotify SDK for SDK-based remote control (avoids the
 *    in-app web player when the user already has Spotify installed).
 *  - A CFBundleURLTypes entry registers the OAuth redirect scheme so the
 *    authorization callback returns to MotoPilot instead of app-switching away.
 *
 * The native SpotifyiOS.framework still needs to be linked (via the EAS build /
 * a local pod) — this plugin only prepares Info.plist so the redirect resolves.
 */
const withSpotify = (config) => {
  return withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;

    const queries = new Set(plist.LSApplicationQueriesSchemes || []);
    queries.add("spotify");
    plist.LSApplicationQueriesSchemes = Array.from(queries);

    plist.CFBundleURLTypes = plist.CFBundleURLTypes || [];
    const alreadyRegistered = plist.CFBundleURLTypes.some((entry) =>
      (entry.CFBundleURLSchemes || []).includes(SPOTIFY_AUTH_CALLBACK_SCHEME)
    );
    if (!alreadyRegistered) {
      plist.CFBundleURLTypes.push({
        CFBundleURLName: "me.stibe.motopilot.spotify-auth",
        CFBundleURLSchemes: [SPOTIFY_AUTH_CALLBACK_SCHEME],
      });
    }

    return cfg;
  });
};

module.exports = withSpotify;
