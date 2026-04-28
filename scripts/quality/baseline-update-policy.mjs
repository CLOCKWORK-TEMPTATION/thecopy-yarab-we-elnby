const ciMarkers = [
  "CI",
  "GITHUB_ACTIONS",
  "BUILDKITE",
  "CIRCLECI",
  "GITLAB_CI",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
];

function readOption(args, name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1).trim();
  }

  const index = args.indexOf(name);
  if (index !== -1) {
    return args[index + 1]?.trim() ?? "";
  }

  return "";
}

export function isCiEnvironment(environment = process.env) {
  return ciMarkers.some((marker) => {
    const value = environment[marker];
    if (value === undefined || value === "") {
      return false;
    }

    return !["0", "false", "no"].includes(value.toLowerCase());
  });
}

export function enforceBaselineUpdatePolicy(args, commandName) {
  if (!args.includes("--update-baseline")) {
    return null;
  }

  if (isCiEnvironment()) {
    console.error(
      `[baseline-policy] ${commandName}: --update-baseline is forbidden in CI. Run it locally after human review.`,
    );
    process.exit(2);
  }

  const reviewedBy =
    readOption(args, "--reviewed-by") ||
    process.env["BASELINE_UPDATE_REVIEWED_BY"] ||
    "";
  const reviewRef =
    readOption(args, "--review-ref") ||
    readOption(args, "--review-ticket") ||
    process.env["BASELINE_UPDATE_REVIEW_REF"] ||
    process.env["BASELINE_UPDATE_REVIEW_TICKET"] ||
    "";

  if (!reviewedBy || !reviewRef) {
    console.error(
      `[baseline-policy] ${commandName}: --update-baseline requires --reviewed-by=<human> and --review-ref=<ticket-or-pr>.`,
    );
    process.exit(2);
  }

  return { reviewedBy, reviewRef };
}
