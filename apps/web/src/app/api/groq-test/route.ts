import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

export async function POST() {
  const groq = new Groq({ apiKey: process.env["GROQ_API_KEY"] });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Hello from Vercel!" }],
    });
    const firstChoice = response.choices[0];

    return NextResponse.json({
      message: firstChoice?.message?.content ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
