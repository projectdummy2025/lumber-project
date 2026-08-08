import { useState, useEffect } from "react";
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
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { sendChatMessage, type AgentLog } from "../../services/apiService";

const formatCurrentDate = () => {
  const date: Date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

interface MessageItem {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
  logs?: AgentLog[];
}

interface ChatPaneProps {
  initialPrompt?: string;
}

export const ChatPane = ({ initialPrompt }: ChatPaneProps) => {
  const [textMessage, setTextMessage] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || textMessage;
    if (prompt.trim() === "" || isLoading) return;

    setTextMessage("");

    const userMessage: MessageItem = {
      id: Date.now(),
      role: "user",
      text: prompt,
      time: formatCurrentDate(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(prompt);
      const assistantMessage: MessageItem = {
        id: Date.now() + 1,
        role: "ai",
        text: response.reply,
        time: formatCurrentDate(),
        logs: response.agent_logs,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: MessageItem = {
        id: Date.now() + 1,
        role: "ai",
        text: `Error: ${error instanceof Error ? error.message : "Gagal terhubung ke AI Agent"}`,
        time: formatCurrentDate(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  return (
    <section className="flex w-1/2 flex-col justify-between bg-[#222] p-6">
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
                    Silakan sampaikan masalah operasional Anda atau pilih
                    skenario di panel kiri.
                  </div>
                )}
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <Message align={message.role === "user" ? "end" : "start"}>
                      <MessageContent>
                        <MessageHeader className="text-[0.8em] font-semibold text-gray-400">
                          {message.role === "user" ? "You" : "AI Operational Consultant"}
                        </MessageHeader>

                        <div
                          className={`relative my-2 w-fit max-w-[85%] rounded-2xl p-4 text-[0.85em] leading-relaxed ${
                            message.role === "user"
                              ? "border border-blue-500/20 bg-blue-600/30 text-white"
                              : "border border-white/10 bg-white/10 text-gray-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.text}</p>

                          {/* Render Agent Thought Process logs */}
                          {message.logs && message.logs.length > 0 && (
                            <div className="mt-4 rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] text-gray-300">
                              <div className="mb-1 font-semibold text-emerald-400">
                                Agent Thought Process:
                              </div>
                              {message.logs.map((log, index) => (
                                <div key={index} className="mb-2 last:mb-0">
                                  <span className="text-amber-400">
                                    [{log.action}]
                                  </span>{" "}
                                  {log.query && (
                                    <div className="text-gray-400">
                                      {log.query}
                                    </div>
                                  )}
                                  {log.observation && (
                                    <div className="mt-1 text-emerald-300/80">
                                      {log.observation}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <MessageFooter className="text-[0.7em] font-semibold text-gray-500">
                          {message.time}
                        </MessageFooter>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 p-4 text-xs text-gray-400">
                    <Loader2Icon className="h-4 w-4 animate-spin text-blue-500" />
                    AI Consultant sedang Menganalisis Database Operasional...
                  </div>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton className="cursor-pointer rounded-full border-0 bg-white/10 text-white transition-all duration-300 hover:bg-white/20" />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      {/* Input Area */}
      <div className="mt-4 flex w-full items-center justify-between rounded-full border border-white/20 bg-black/20 px-6 py-2 hover:border-white/40">
        <Input
          onChange={(e) => setTextMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Tanyakan masalah operasional pabrik..."
          value={textMessage}
          disabled={isLoading}
          className="w-[90%] border-none bg-transparent text-sm text-white focus:outline-none"
        />
        <Button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isLoading}
          className="cursor-pointer rounded-full bg-blue-600 p-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2Icon className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUpIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </section>
  );
};
