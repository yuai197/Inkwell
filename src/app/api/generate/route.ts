import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

export async function POST(req: NextRequest) {
  try {
    const { githubUrl } = await req.json();

    if (!githubUrl || typeof githubUrl !== "string") {
      return NextResponse.json({ error: "GitHub URL is required" }, { status: 400 });
    }

    // Parse owner/repo from URL
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");

    // Fetch repo files
    const files: Record<string, string> = {};

    const filesToFetch = [
      "package.json",
      "README.md",
      "tsconfig.json",
      "requirements.txt",
      "Cargo.toml",
      "go.mod",
      "pyproject.toml",
      "Gemfile",
    ];

    for (const file of filesToFetch) {
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/main/${file}`
        );
        if (res.ok) {
          files[file] = await res.text();
        }
      } catch {
        // File doesn't exist on main branch, skip
      }
    }

    if (!files["package.json"] && !files["requirements.txt"] && !files["go.mod"] && !files["Cargo.toml"]) {
      return NextResponse.json(
        { error: "Could not find any recognizable project files in the repo" },
        { status: 400 }
      );
    }

    const fileContents = Object.entries(files)
      .map(([name, content]) => `=== ${name} ===\n${content.slice(0, 3000)}`)
      .join("\n\n");

    const prompt = `You are a README generator for open-source projects. Based on the following project files, generate a professional, well-structured README.md in English.

Requirements:
- Use Markdown format
- Include: project title, description, features, installation, usage, tech stack
- Keep it concise and professional
- If there's an existing README, improve upon it

Project files:
${fileContents}

Generate the README now:`;

    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a technical writer specializing in open-source documentation." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
    });

    const readme = completion.choices[0]?.message?.content || "Failed to generate README.";

    return NextResponse.json({ readme });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
