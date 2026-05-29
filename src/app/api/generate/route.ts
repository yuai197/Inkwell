import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      baseURL: "https://api.deepseek.com",
    });
  }
  return _client;
}

const FILES_TO_FETCH = [
  "package.json",
  "README.md",
  "tsconfig.json",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "Gemfile",
  "CMakeLists.txt",
  "Makefile",
  "build.gradle",
  "pom.xml",
  "composer.json",
  "Dockerfile",
  "docker-compose.yml",
];

async function fetchRepoFiles(owner: string, repo: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  // Try main first, then master
  for (const branch of ["main", "master"]) {
    for (const file of FILES_TO_FETCH) {
      if (files[file]) continue;
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`
        );
        if (res.ok) {
          files[file] = await res.text();
        }
      } catch {
        // skip
      }
    }

    // If we found at least one config file, stop trying branches
    const hasConfig = FILES_TO_FETCH.some(
      (f) => f !== "README.md" && files[f]
    );
    if (hasConfig) break;
  }

  // Fallback: try GitHub API to discover project structure
  if (Object.keys(files).length <= 1) {
    try {
      const apiRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );
      if (apiRes.ok) {
        const contents: { name: string; type: string }[] = await apiRes.json();
        const configFiles = contents.filter(
          (c) => c.type === "file" && FILES_TO_FETCH.includes(c.name)
        );
        for (const cf of configFiles) {
          if (!files[cf.name]) {
            const fileRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/main/${cf.name}`
            );
            if (fileRes.ok) {
              files[cf.name] = await fileRes.text();
            }
          }
        }
      }
    } catch {
      // API fallback failed, continue with whatever we have
    }
  }

  return files;
}

export async function POST(req: NextRequest) {
  try {
    const { githubUrl } = await req.json();

    if (!githubUrl || typeof githubUrl !== "string") {
      return NextResponse.json({ error: "GitHub URL is required" }, { status: 400 });
    }

    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");

    const files = await fetchRepoFiles(owner, repo);

    const hasConfig = FILES_TO_FETCH.some(
      (f) => f !== "README.md" && f !== "Dockerfile" && f !== "docker-compose.yml" && f !== "Makefile" && files[f]
    );

    if (!hasConfig) {
      return NextResponse.json(
        { error: "Could not find any recognizable project files in this repo" },
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

    const completion = await getClient().chat.completions.create({
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
