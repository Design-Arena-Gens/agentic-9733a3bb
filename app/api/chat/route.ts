import { NextResponse } from "next/server";

type Role = "user" | "assistant";

type Message = {
  role: Role;
  content: string;
};

const agentName = "Lumen";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

const greetingPhrases = [
  "Hi there! What are we exploring today?",
  "Hey! I'm glad you're here. What's on your mind?",
  "Hello! Ready when you are—just share a thought."
];

function extractLastUserMessage(messages: Message[]): Message | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (candidate.role === "user") {
      return candidate;
    }
  }
  return undefined;
}

function summarizeUserThemes(messages: Message[]): string[] {
  const keywords = new Map<string, number>();
  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }
    const terms = message.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (const term of terms) {
      if (term.length < 4) {
        continue;
      }
      const weight = keywords.get(term) ?? 0;
      keywords.set(term, weight + 1);
    }
  }
  return Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([term]) => term);
}

function buildSuggestions(topic: string): string[] {
  switch (topic) {
    case "time":
      return [
        "Help me plan the rest of my day",
        "Remind me of something important later",
        "Suggest a quick reflection exercise"
      ];
    case "productivity":
      return [
        "Break my work into focused blocks",
        "Give me a motivation boost",
        "Help me celebrate a recent win"
      ];
    case "mood":
      return [
        "Share a grounding exercise",
        "Help me reframe a negative thought",
        "Suggest a relaxing break idea"
      ];
    case "planning":
      return [
        "Create a quick checklist",
        "Help me prioritize tasks",
        "Draft a mini roadmap"
      ];
    default:
      return [
        "Give me a small challenge",
        "Share a curious fact",
        "Help me set a tiny goal"
      ];
  }
}

function detectTopic(text: string): string {
  const normalized = text.toLowerCase();
  if (/time|date|clock|today|tonight|morning|evening/.test(normalized)) {
    return "time";
  }
  if (/plan|schedule|organize|roadmap|timeline/.test(normalized)) {
    return "planning";
  }
  if (/focus|productive|productivity|motivation|work|study/.test(normalized)) {
    return "productivity";
  }
  if (/sad|happy|mood|feel|feeling|tired|excited|stressed|stress/.test(normalized)) {
    return "mood";
  }
  return "general";
}

function craftReply(messages: Message[]): { reply: string; topic: string } {
  if (!messages.length) {
    return {
      reply: greetingPhrases[Math.floor(Math.random() * greetingPhrases.length)],
      topic: "general"
    };
  }

  const lastUserMessage = extractLastUserMessage(messages);
  if (!lastUserMessage) {
    return {
      reply: "I'm tuned in! Whenever you're ready, let me know what's on your radar.",
      topic: "general"
    };
  }

  const text = lastUserMessage.content.trim();
  const normalized = text.toLowerCase();
  const topic = detectTopic(text);
  const themes = summarizeUserThemes(messages);
  const recentAssistant = [...messages].reverse().find(message => message.role === "assistant");

  if (!text) {
    return {
      reply: "Take your time—I'm right here whenever you feel like sharing something.",
      topic
    };
  }

  if (/^(hi|hello|hey|yo|hiya|sup)([^a-z]|$)/.test(normalized)) {
    return {
      reply: `${greetingPhrases[Math.floor(Math.random() * greetingPhrases.length)]} Also, what's one thing you're curious about right now?`,
      topic
    };
  }

  if (normalized.includes("your name")) {
    return {
      reply: `I'm ${agentName}! Think of me as your upbeat co-pilot for ideas, plans, and reflections. What's next on your mind?`,
      topic
    };
  }

  if (/time|date|day is it/.test(normalized)) {
    return {
      reply: `Right now it's ${timeFormatter.format(new Date())}. Want me to help block out the next hour or sketch a mini plan?`,
      topic: "time"
    };
  }

  if (/help|advice|support/.test(normalized)) {
    return {
      reply: `You've got my full attention. Give me a sentence or two about what you want help with, and I'll guide you through it step by step.`,
      topic
    };
  }

  if (/plan|schedule|organize|roadmap/.test(normalized)) {
    return {
      reply: `Let's architect something useful. Start with the big milestone, then we can break it into 3 bite-sized moves. What milestone should we anchor on?`,
      topic: "planning"
    };
  }

  if (/tired|stressed|overwhelmed|anxious|burned|burnt|exhausted/.test(normalized)) {
    return {
      reply: `Sounds like your energy is running low. Let's find a micro-reset: deep breath, unclench your shoulders, then name one win from today—no matter how small. Want a few reset ideas?`,
      topic: "mood"
    };
  }

  if (/focus|productive|productivity|motivation|bored|procrastinate/.test(normalized)) {
    return {
      reply: `We can spark some momentum. What's the next action you'd feel okay doing in the next 10 minutes? I'll help you lock it in and keep it light.`,
      topic: "productivity"
    };
  }

  if (/thank|thanks|thank you|appreciate/.test(normalized)) {
    return {
      reply: `Always happy to help! If anything else pops up—even a tiny question—just drop it here.`,
      topic
    };
  }

  if (/who are you|what are you/.test(normalized)) {
    return {
      reply: `I'm ${agentName}, a conversational agent built to keep you company, offer structure, and nudge you toward momentum. Ask me for ideas, plans, or just to think out loud.`,
      topic
    };
  }

  const reflection = themes.length
    ? ` I'm picking up on themes like ${themes.join(", ")}.`
    : "";
  const callback = recentAssistant
    ? " I remember what we were just discussing, so let's build on it."
    : "";

  return {
    reply: `Got it. ${callback}${reflection} Here's how we can tackle that: describe the outcome you want, list the constraints, and we'll map the next move together.`,
    topic
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: Message[] };
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const { reply, topic } = craftReply(messages);
    const suggestions = buildSuggestions(topic);

    return NextResponse.json({ reply, suggestions });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { reply: "Whoops, my mind went blank for a second. Could you repeat that?", suggestions: buildSuggestions("general") },
      { status: 500 }
    );
  }
}
