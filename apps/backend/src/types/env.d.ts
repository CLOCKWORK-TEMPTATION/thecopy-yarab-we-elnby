export {};

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV?: "development" | "production" | "test";
			PORT?: string;

			npm_package_version?: string;

			REDIS_URL?: string;
			REDIS_HOST?: string;
			REDIS_PORT?: string;
			REDIS_PASSWORD?: string;
			REDIS_SENTINEL_ENABLED?: "true" | "false";
			REDIS_SENTINELS?: string;
			REDIS_MASTER_NAME?: string;
			REDIS_SENTINEL_PASSWORD?: string;

			GEMINI_API_KEY?: string;
			GOOGLE_GENAI_API_KEY?: string;

			WEAVIATE_URL?: string;
			WEAVIATE_API_KEY?: string;
			REPO_PATH?: string;

			SENTRY_DSN?: string;

			SMTP_HOST?: string;
			SMTP_PORT?: string;
			SMTP_SECURE?: "true" | "false";
			SMTP_USER?: string;
			SMTP_PASS?: string;
			SMTP_FROM?: string;

			SLACK_WEBHOOK_URL?: string;
			ALERT_EMAIL_RECIPIENTS?: string;

			JWT_SECRET?: string;
			CORS_ORIGIN?: string;
			FRONTEND_URL?: string;

			LOG_LEVEL?: string;
			LOG_PRETTY?: "true" | "false";
		}
	}
}
