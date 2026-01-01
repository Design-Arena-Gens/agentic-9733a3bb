"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "user" | "assistant";

type ConversationMessage = {
  role: Role;
  content: string;
  timestamp: number;
};

type AgentResponse = {
  reply: string;
  suggestions?: string[];
};

const agentName = "Lumen";

const defaultSuggestions = [
  "What can you help me with today?",
  "Give me a quick productivity tip",
  "Help me plan my next break"
];

export default function HomePage() {
  const [messages, setMessages] = useState<ConversationMessage[]>(() => [
    {
      role: "assistant",
      content: `Hey there! I'm ${agentName}, your upbeat companion. Tell me what's on your mind and let's make progress together.`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [isLoading, setIsLoading] = useState(false);

  const scrollAnchorId = useMemo(() => `scroll-anchor-${messages.length}`, [messages.length]);

  useEffect(() => {
    const anchor = document.getElementById(scrollAnchorId);
    anchor?.scrollIntoView({ behavior: "smooth" });
  }, [scrollAnchorId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const newMessage: ConversationMessage = {
        role: "user",
        content: trimmed,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [...messages, newMessage].map(message => ({
              role: message.role,
              content: message.content
            }))
          })
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as AgentResponse;

        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: payload.reply,
            timestamp: Date.now()
          }
        ]);
        setSuggestions(payload.suggestions?.length ? payload.suggestions : defaultSuggestions);
      } catch (error) {
        console.error(error);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content:
              "Hmm, something glitched on my end. Mind trying that again in a moment?",
            timestamp: Date.now()
          }
        ]);
        setSuggestions(defaultSuggestions);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleSuggestion = useCallback(
    async (suggestion: string) => {
      await sendMessage(suggestion);
    },
    [sendMessage]
  );

  return (
    <main className="page">
      <section className="chat-shell">
        <header className="chat-header">
          <h1>{agentName}</h1>
          <p>Your conversational accelerant for ideas, planning, and encouragement.</p>
        </header>

        <div className="chat-feed">
          {messages.map((message, index) => (
            <article
              key={`${message.timestamp}-${index}`}
              className={message.role === "assistant" ? "bubble assistant" : "bubble user"}
            >
              <span className="role-label">{message.role === "assistant" ? agentName : "You"}</span>
              <p>{message.content}</p>
            </article>
          ))}
          <div id={scrollAnchorId} />
        </div>

        <footer className="chat-footer">
          <form onSubmit={handleSubmit} className="message-form">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Say something to your agent..."
              disabled={isLoading}
              aria-label="Message input"
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </form>
          <div className="suggestions">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestion(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </footer>
      </section>
    </main>
  );
}
