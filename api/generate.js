// =============================================================================
// /api/generate — the ONE serverless function of this app (runs on Vercel).
//
// The browser sends { text, tone, channel } here. This function adds the secret
// Groq API key (read from an environment variable), asks Groq to write the post
// in Slovenian, English and French in ONE request, and sends back { sl, en, fr }.
// The key never leaves the server, so the browser never sees it.
// =============================================================================

// Groq's production model with strong multilingual support (80+ languages).
// Model list: https://console.groq.com/docs/models
const MODEL = "openai/gpt-oss-120b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_CHARS = 2000;

// Allowed option values. The browser sends a key, we turn it into an instruction.
const TONES = {
  formal: "Formal corporate: professional, polished, confident, no slang, no emojis.",
  friendly: "Friendly: warm, approachable and positive, still appropriate for a workplace. At most one or two emojis.",
};

const CHANNELS = {
  linkedin:
    "LinkedIn post: a strong opening line, short paragraphs, a clear takeaway, and 3-5 relevant hashtags at the end.",
  screen:
    "Internal digital screen: a short headline (max ~8 words) on the first line, then 1-2 short lines of text. Nothing else - no hashtags, no long sentences.",
  general: "General: a clear, well-structured post that works in most channels (email, intranet, newsletter).",
};

export default async function handler(req, res) {
  // Only POST requests are allowed.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  // The key comes ONLY from the environment. Never hardcode it here.
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GROQ_API_KEY." });
  }

  // ---- 1. Validate input (the browser checks too, but never trust the client) ----
  const { text, tone, channel } = req.body || {};
  const post = typeof text === "string" ? text.trim() : "";

  if (!post) {
    return res.status(400).json({ error: "Please paste a post first." });
  }
  if (post.length > MAX_CHARS) {
    return res.status(400).json({ error: `Post is too long (max ${MAX_CHARS} characters).` });
  }
  if (!TONES[tone] || !CHANNELS[channel]) {
    return res.status(400).json({ error: "Invalid tone or channel." });
  }

  // ---- 2. Build the prompt: all three languages in a single request ----
  const systemPrompt = [
    "You are a corporate communications specialist who writes native-quality Slovenian, English and French.",
    "Adapt the user's post (it can be in any language) for the tone and channel below.",
    "Do not translate word for word: rewrite naturally so each version sounds like it was written by a native speaker.",
    "Keep all facts, names, dates and numbers exactly as given. Do not invent new facts.",
    // Fixes a bug found in testing: "We're proud" became "Ponosen sem" (I am proud) in Slovenian.
    "Keep the same grammatical person and number as the original in every language: if the original says \"we\", every version says \"we\"; if it says \"I\", every version says \"I\".",
    'Example: "We\'re proud" -> Slovenian "Ponosni smo" (not "Ponosen sem"), French "Nous sommes fiers" (not "Je suis fier").',
    "",
    `Tone: ${TONES[tone]}`,
    `Channel: ${CHANNELS[channel]}`,
    "",
    'Reply with ONLY a JSON object of this exact shape: {"sl": "...", "en": "...", "fr": "..."}',
    "sl = Slovenian, en = English, fr = French. Use \\n for line breaks inside the strings.",
  ].join("\n");

  // ---- 3. Call Groq ----
  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: post },
        ],
        response_format: { type: "json_object" }, // forces valid JSON back
        reasoning_effort: "low", // this is a rewriting task, so little "thinking" is needed (faster)
        temperature: 0.6,
      }),
    });
  } catch (err) {
    console.error("Network error calling Groq:", err);
    return res.status(502).json({ error: "Could not reach the AI service. Please try again." });
  }

  // ---- 4. Handle Groq errors ----
  if (groqResponse.status === 429) {
    return res.status(429).json({ error: "Too many requests, try again in a minute." });
  }
  if (!groqResponse.ok) {
    console.error("Groq API error:", groqResponse.status, await groqResponse.text());
    return res.status(502).json({ error: "The AI service returned an error. Please try again." });
  }

  // ---- 5. Parse the answer and send back { sl, en, fr } ----
  try {
    const data = await groqResponse.json();
    const result = JSON.parse(data.choices[0].message.content);

    if (!result.sl || !result.en || !result.fr) {
      throw new Error("Missing one of the languages");
    }
    return res.status(200).json({ sl: result.sl, en: result.en, fr: result.fr });
  } catch (err) {
    console.error("Could not parse Groq response:", err);
    return res.status(502).json({ error: "The AI returned an unexpected answer. Please try again." });
  }
}
