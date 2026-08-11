import { useState, useEffect } from "react";
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
import { Input } from "../ui/input";
import { sendChatMessage, type AgentLog } from "../../services/apiService";

const dateNow = () => {
  const date: Date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${day}/${month}/${year}`;
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

// Helper function to format observation JSON or string neatly
const formatLogObservation = (obs: string) => {
  try {
    const parsed = JSON.parse(obs);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return obs;
  }
};

// Collapsible Agent Logs Component
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

export const ChatView = ({
  initialPrompt,
  onClearInitialPrompt,
}: ChatViewProps) => {
  const [textMessage, setTextMessage] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || textMessage;
    if (promptToSend.trim() === "" || isLoading) return;

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
    }
  };

  const handleSubmitPrompt = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const markedInstance = new Marked();

  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#222] p-8 text-white">
      <div className="flex h-[90%] w-7/12 flex-col items-center justify-between overflow-hidden rounded-xl">
        {messages.length < 1 && (
          <div className="w-10/12 my-auto flex flex-col items-center">
            <h1 className="text-center text-6xl leading-tight text-white/80">
              Hello Alvin, How Can I Help You Today?
            </h1>

            {/* Prompt Templates */}
            <div className="mt-12 grid w-full grid-cols-2 gap-4">
              <button
                onClick={() => handleSendMessage("Analyze feasibility for Order of 100 Teak Dining Sets (SET-DINING-01) with a 40-day deadline.")}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <span className="font-semibold text-gray-200">Analyze New Order</span>
                <span className="text-xs text-gray-400">100 Teak Dining Sets (SET-DINING-01) completion in 40 days.</span>
              </button>

              <button
                onClick={() => handleSendMessage("Check raw teak timber stock availability and average yield rates.")}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <span className="font-semibold text-gray-200">Check Timber Inventory</span>
                <span className="text-xs text-gray-400">Teak log availability & average yield rate.</span>
              </button>

              <button
                onClick={() => handleSendMessage("Are any workstations currently experiencing bottleneck or capacity overload?")}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <span className="font-semibold text-gray-200">Detect Bottlenecks</span>
                <span className="text-xs text-gray-400">Identify overloaded workstation capacity.</span>
              </button>

              <button
                onClick={() => handleSendMessage("Compare subcontracting cost options vs overtime shift to clear the backlog.")}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <span className="font-semibold text-gray-200">Operational Trade-off</span>
                <span className="text-xs text-gray-400">Cost comparison of subcontracting vs overtime.</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="relative min-h-0 w-full flex-1 scrollbar-track-transparent border-0 p-4">
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {messages.map((msg) => (
                    <MessageScrollerItem
                      key={msg.id}
                      scrollAnchor={msg.role === "user"}
                    >
                      <Message align={msg.role === "user" ? "end" : "start"}>
                        <MessageContent>
                          <MessageHeader className="w-fit text-[0.9em] font-semibold text-[grey]/50">
                            {msg.role === "user" ? "You" : "Assistant"}
                          </MessageHeader>

                          <div
                            className={`flex w-full ${
                              msg.role === "user"
                                ? "justify-end"
                                : "ml-3 justify-start"
                            }`}
                          >
                            <div
                              className={`relative my-3 w-fit max-w-9/12 overflow-hidden rounded-2xl p-5 px-4 text-[0.9em] leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-[grey]/10 text-white"
                                  : "bg-[grey]/20 text-gray-100"
                              }`}
                            >
                              {msg.role === "user" ? (
                                <p className="overflow-hidden text-ellipsis line-clamp-4">
                                  {msg.text}
                                </p>
                              ) : (
                                <div
                                  className="markdown-content"
                                  dangerouslySetInnerHTML={{
                                    __html: markedInstance.parse(msg.text, { async: false })
                                  }}
                                />
                              )}

                              {/* Collapsible Agent Thought Process Logs */}
                              {msg.logs && msg.logs.length > 0 && (
                                <CollapsibleAgentLogs logs={msg.logs} />
                              )}
                            </div>
                          </div>
                          <MessageFooter className="w-fit text-[0.9em] font-semibold text-[grey]/50">
                            {msg.time}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 p-4 text-xs text-gray-400">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Assistant is thinking...
                    </div>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="cursor-pointer rounded-full border-0 bg-[grey]/20 text-white transition-all duration-500 hover:bg-[grey]/10 hover:text-white" />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>

        {/* Input Bar */}
        <div className="mt-10 flex w-full justify-between rounded-full border border-[#80808050] border-b-[#80808050] px-6 py-4 hover:border-2 hover:border-[grey]/40">
          <Input
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyDown={(e) => handleSubmitPrompt(e)}
            placeholder="Type your message or prompt operational queries..."
            value={textMessage}
            disabled={isLoading}
            className="ml-4 w-10/12 border-none text-ellipsis bg-transparent text-white focus:outline-none"
          />
          <Button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isLoading}
            className="cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center p-2"
          >
            {isLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span>▲</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
