# Multilingual Post Generator

Paste a communication post in any language, pick a tone and a channel, and get it adapted in **Slovenian, English and French** side by side, each with a Copy button. One click instead of three.

![Screenshot of the app](screenshot.png)
<!-- TODO: add a screenshot named screenshot.png to the project root -->

## The problem it solves

At my job in the Communication & Public Affairs team at Revoz (Renault Group), I often had to publish the same message in Slovenian, English and French: LinkedIn posts, intranet news, and short texts for the internal digital screens. I drafted every version by hand with AI chat tools. That meant copying the text in, explaining the tone, asking for each language and fixing the format every time.

So I built a tool that does it in one click. It produces all three languages at once, in the right tone and the right format for the channel.

## Features

- Input in any language (up to 2,000 characters)
- **Tone:** Formal corporate or Friendly
- **Channel:**
  - LinkedIn post (hook, short paragraphs, hashtags)
  - Internal digital screen (short headline plus 1–2 lines)
  - General
- All three languages come from **one** AI request and are shown side by side
- A Copy button on each version
- Clear error messages for empty input, rate limits (*"Too many requests, try again in a minute"*) and API errors

## How it works

```
Browser (index.html + script.js)
   │  POST /api/generate  { text, tone, channel }     ← no API key here
   ▼
Vercel serverless function (api/generate.js)
   │  reads GROQ_API_KEY from an environment variable
   │  builds the prompt and calls Groq once
   ▼
Groq API (model: openai/gpt-oss-120b)
   │  returns JSON { sl, en, fr }
   ▼
Serverless function → browser → three cards on the page
```

1. **Frontend.** The page is plain HTML, CSS and JavaScript. When you click *Generate*, `script.js` sends the post, the tone and the channel to `/api/generate`. That is my own backend, not Groq.
2. **Serverless function.** `api/generate.js` runs on Vercel's servers. It validates the input, reads the secret key from `process.env.GROQ_API_KEY`, and asks Groq for all three languages in a single request in JSON mode.
3. **API key.** The key exists only as an environment variable on the server (in Vercel's settings, or in a local `.env` file that is never committed). It is never sent to the browser, so nobody can find it in the page source or the network tab.

## Tech used

- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks)
- **Backend:** one Vercel serverless function (Node.js)
- **AI:** [Groq API](https://console.groq.com/docs) with the `openai/gpt-oss-120b` model (multilingual and fast)
- **Design:** matches my [portfolio](https://adi-burgic.github.io), using Space Grotesk and IBM Plex Sans

## Project structure

```
api/generate.js   serverless function: calls Groq; the key stays on the server
index.html        page layout
style.css         styling (same design tokens as my portfolio)
script.js         form handling, fetch to /api/generate, copy buttons
dev-server.js     tiny local server for testing (not used on Vercel)
.env.example      template for the environment variable
```

## Run it locally

You need **Node.js 20.11 or newer** and a free Groq API key from https://console.groq.com/keys.

```bash
# 1. Put your key in .env (copy .env.example to .env if it doesn't exist yet)
#    GROQ_API_KEY=gsk_...

# 2. Start the local server (no npm install needed: there are no dependencies)
npm run dev

# 3. Open http://localhost:3000
```

Alternative: if you have the Vercel CLI, `vercel dev` also works and reads `.env` the same way.

## Deploy to Vercel

1. Push the repo to GitHub. `.env` is in `.gitignore`, so the key stays on your machine.
2. Import the repo in Vercel.
3. Under **Settings → Environment Variables**, add `GROQ_API_KEY`.
4. Deploy.

## Notes

- Built with **AI-assisted development using [Claude Code](https://claude.com/claude-code)**. I defined the problem, the requirements and the design, then reviewed and tested the result.
- Only **made-up example posts** were used to build and test this tool. No confidential company data was used.
