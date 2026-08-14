import { useState, useEffect, useRef } from "react";
import { Marked } from "marked";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "../ui/message-scroller";
import {
  Message,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "../ui/message";
import { Button } from "../ui/button";
import { sendChatMessage, type AgentLog } from "../../services/apiService";

// Format as DD/MM/YYYY
const dateNow = () => {
  const date = new Date();
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

// Try to pretty-print observation as JSON
const formatLogObservation = (obs: string) => {
  try {
    return JSON.stringify(JSON.parse(obs), null, 2);
  } catch {
    return obs;
  }
};

interface MessageItem {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
  logs?: AgentLog[];
}

interface ChatViewProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

// Collapsible agent thought process logs panel
const CollapsibleAgentLogs = ({ logs }: { logs: AgentLog[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 rounded-lg bg-black/40 border border-white/10 overflow-hidden font-mono text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">LOG</span>
          <span>Agent Thought Process ({logs.length} Steps)</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>{isOpen ? "Hide" : "Show Details"}</span>
          <span>{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="max-h-72 overflow-y-auto p-3 text-gray-300 leading-relaxed border-t border-white/5 bg-black/60">
          {logs.map((log, index) => (
            <div key={index} className="mb-3 last:mb-0 border-b border-white/5 pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold uppercase text-[11px]">
                  Step {index + 1}: {log.action}
                </span>
              </div>
              {log.query && (
                <div className="text-blue-300 mt-1 font-mono bg-blue-950/40 p-2 rounded border border-blue-500/20 whitespace-pre-wrap break-all text-[11px]">
                  {log.query}
                </div>
              )}
              {log.observation && (
                <pre className="text-emerald-400/90 mt-1 font-mono bg-black/40 p-2 rounded border border-emerald-500/20 whitespace-pre text-[10px] overflow-x-auto">
                  {formatLogObservation(log.observation)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Prompt template suggestions for the empty state
const PROMPT_SUGGESTIONS = [
  {
    title: "Analyze New Order",
    desc: "100 Teak Dining Sets (SET-DINING-01) completion in 40 days.",
    prompt: "Analyze feasibility for Order of 100 Teak Dining Sets (SET-DINING-01) with a 40-day deadline.",
  },
  {
    title: "Check Timber Inventory",
    desc: "Teak log availability & average yield rate.",
    prompt: "Check raw teak timber stock availability and average yield rates.",
  },
  {
    title: "Detect Bottlenecks",
    desc: "Identify overloaded workstation capacity.",
    prompt: "Are any workstations currently experiencing bottleneck or capacity overload?",
  },
  {
    title: "Operational Trade-off",
    desc: "Cost comparison of subcontracting vs overtime.",
    prompt: "Compare subcontracting cost options vs overtime shift to clear the backlog.",
  },
];

export const ChatView = ({ initialPrompt, onClearInitialPrompt }: ChatViewProps) => {
  const [textMessage, setTextMessage] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const markedInstance = new Marked();

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || textMessage;
    if (promptToSend.trim() === "" || isLoading) return;

    // Append user message immediately
    const userMessage: MessageItem = {
      id: Date.now(),
      role: "user",
      text: promptToSend,
      time: dateNow(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTextMessage("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(promptToSend);
      const assistantMessage: MessageItem = {
        id: Date.now() + 1,
        role: "ai",
        text: response.reply,
        time: dateNow(),
        logs: response.agent_logs,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: MessageItem = {
        id: Date.now() + 1,
        role: "ai",
        text: `Error: ${error instanceof Error ? error.message : "Failed to connect to AI Agent"}`,
        time: dateNow(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-full w-full flex-col items-center bg-[#222] text-white">
      {/* Centered content column — max-width constrained */}
      <div className="flex h-full w-full max-w-3xl flex-col px-4 sm:px-6">

        {/* Empty state — welcome screen */}
        {showEmptyState && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-center text-3xl sm:text-5xl font-light leading-tight text-white/80">
              Hello, How Can I Help You Today?
            </h1>

            {/* Suggestion cards */}
            <div className="mt-10 grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
              {PROMPT_SUGGESTIONS.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-50"
                >
                  <span className="font-semibold text-sm text-gray-200">{item.title}</span>
                  <span className="text-xs text-gray-400">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages area */}
        <div className={`relative min-h-0 flex-1 ${showEmptyState ? "hidden" : "block"} py-2`}>
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {messages.map((msg) => (
                    <MessageScrollerItem key={msg.id} scrollAnchor={msg.role === "user"}>
                      <Message align={msg.role === "user" ? "end" : "start"}>
                        <MessageContent>
                          <MessageHeader className="w-fit text-[0.8em] font-semibold text-gray-500">
                            {msg.role === "user" ? "You" : "Assistant"}
                          </MessageHeader>

                          <div className={`flex w-full ${msg.role === "user" ? "justify-end" : "ml-3 justify-start"}`}>
                            <div
                              className={`relative my-2 w-fit max-w-[90%] sm:max-w-[80%] overflow-hidden rounded-2xl p-4 text-sm leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-white/10 text-white"
                                  : "bg-white/[0.07] text-gray-100"
                              }`}
                            >
                              {/* User: plain text */}
                              {msg.role === "user" ? (
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                              ) : (
                                /* AI: rendered markdown */
                                <div
                                  className="markdown-content"
                                  dangerouslySetInnerHTML={{
                                    __html: markedInstance.parse(msg.text, { async: false }),
                                  }}
                                />
                              )}

                              {/* Collapsible agent logs */}
                              {msg.logs && msg.logs.length > 0 && (
                                <CollapsibleAgentLogs logs={msg.logs} />
                              )}
                            </div>
                          </div>

                          <MessageFooter className="w-fit text-[0.75em] font-semibold text-gray-600">
                            {msg.time}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Assistant is thinking...
                    </div>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="cursor-pointer rounded-full border-0 bg-white/10 text-white transition-all hover:bg-white/15" />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>

        {/* Input bar — always visible at bottom */}
        <div className="shrink-0 py-4">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-3 transition-all hover:border-white/25 focus-within:border-white/25">
            <input
              ref={inputRef}
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message or prompt operational queries..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
            />
            <Button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || textMessage.trim() === ""}
              className="h-8 w-8 cursor-pointer rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center shrink-0 p-0"
            >
              {isLoading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="text-xs">▲</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
