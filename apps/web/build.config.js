/**
 * Build Configuration for The Copy Frontend
 *
 * This file documents expected build warnings and provides configuration
 * for handling them appropriately.
 */

module.exports = {
  // Expected warnings that are safe to ignore
  expectedWarnings: {
    criticalDependencies: [
      // OpenTelemetry instrumentation uses dynamic requires for plugin loading
      // This is expected behavior and safe to ignore
      "@opentelemetry/instrumentation",
      "require-in-the-middle",

      // Sentry uses dynamic imports for performance monitoring
      // This is expected behavior and safe to ignore
      "@sentry/nextjs",
      "@sentry/opentelemetry",
      "@sentry/node",
    ],

    eslintDeprecated: [
      // ESLint flat config migration - these options are being phased out
      "useEslintrc",
      "extensions",
    ],
  },

  // Build approval settings
  approval: {
    // Automatically approve builds with only expected warnings
    autoApprove: true,

    // Maximum number of unexpected warnings before failing build
    maxUnexpectedWarnings: 0,

    // Log level for build warnings
    logLevel: "warn",
  },
};
