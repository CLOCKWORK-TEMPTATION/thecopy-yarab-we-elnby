import {
  captureSentryRouterTransitionStart,
  initSentryClient,
} from "@/lib/sentry-client";

void initSentryClient();

export const onRouterTransitionStart = captureSentryRouterTransitionStart;
