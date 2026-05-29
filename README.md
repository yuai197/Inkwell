# Inkwell

> Dip into the inkwell. Paste a GitHub link, let AI craft your story.

Inkwell is a free AI-powered tool that generates professional README.md files from any GitHub repository. Just paste a link — AI reads your project files and writes a polished English README in seconds.

## How it works

1. Paste a GitHub repo URL
2. Inkwell fetches your project config files
3. DeepSeek AI generates a structured, professional README
4. Copy and drop it into your project

## Features

- Instant README generation from any public GitHub repo
- Clean, professional English output
- One-click copy to clipboard
- Dark mode support

## Try it

**[inkwell-oyw3.vercel.app](https://inkwell-oyw3.vercel.app)**

## Tech stack

- **Frontend**: Next.js 16 + TailwindCSS
- **AI**: DeepSeek API
- **Deployment**: Vercel

## Run locally

```bash
git clone https://github.com/yuai197/Inkwell.git
cd Inkwell
npm install
```

Create a `.env.local` file:

```
DEEPSEEK_API_KEY=your_api_key
```

```bash
npm run dev
```

Open http://localhost:3000

## License

MIT
