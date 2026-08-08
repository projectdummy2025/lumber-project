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

const dateNow = () => {
  const date: Date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${day}-${month}-${year}`;
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
        text: `Error: ${error instanceof Error ? error.message : "Gagal terhubung ke AI Agent"}`,
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
          <div className="w-10/12 my-auto">
            <h1 className="text-center text-6xl leading-tight text-white/80">
              Halo Alvin, Ada Yang Bisa Saya Bantu?
            </h1>
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
                              <p
                                className={`overflow-hidden ${
                                  msg.role === "user"
                                    ? "text-ellipsis line-clamp-4"
                                    : "line-clamp-none leading-loose text-balance whitespace-pre-wrap"
                                }`}
                              >
                                {msg.text}
                              </p>

                              {/* Agent Thought Process Logs */}
                              {msg.logs && msg.logs.length > 0 && (
                                <div className="mt-4 rounded-lg bg-black/40 p-3 font-mono text-xs text-gray-300 border border-white/5">
                                  <div className="mb-1 font-semibold text-emerald-400">
                                    Agent Thought Process:
                                  </div>
                                  {msg.logs.map((log, index) => (
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
                                        <div className="text-emerald-300/80">
                                          {log.observation}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
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
                      <Loader2Icon className="h-4 w-4 animate-spin text-blue-500" />
                      Assistant sedang berpikir...
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
            placeholder="Sampaikan masalah kamu"
            value={textMessage}
            disabled={isLoading}
            className="ml-4 w-10/12 border-none text-ellipsis bg-transparent text-white focus:outline-none"
          />
          <Button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isLoading}
            className="cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2Icon className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUpIcon />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
