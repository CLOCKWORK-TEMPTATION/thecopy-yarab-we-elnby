/** Build a successful /api/development/execute response */
export function primaryOk(text = "النتيجة من Gemini مباشرةً") {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        success: true,
        result: {
          finalDecision: text,
          proposals: [
            {
              agentId: "completion",
              agentName: "إكمال النص",
              text,
              confidence: 0.85,
            },
          ],
        },
      }),
  } as unknown as Response;
}

/** Build a failed /api/development/execute response (API key missing) */
export function primaryFail(status = 503) {
  return {
    ok: false,
    status,
    json: () =>
      Promise.resolve({
        success: false,
        error: "Gemini API key missing",
        fallback: true,
      }),
  } as unknown as Response;
}

/** Build a successful /api/brainstorm fallback response */
export function brainstormOk(text = "نتيجة من brainstorm") {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        finalDecision: text,
        proposals: [{ agentId: "completion", text, confidence: 0.82 }],
      }),
  } as unknown as Response;
}
