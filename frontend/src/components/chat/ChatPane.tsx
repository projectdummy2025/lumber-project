import { useState, useEffect } from "react";
import { marked } from "marked";
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
import { ArrowUpIcon, Loader2Icon, CheckCircle2, ChevronDown, ChevronRight, LightbulbIcon, BrainCircuitIcon } from "lucide-react";
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

const CollapsibleAgentLogs = ({ logs }: { logs: AgentLog[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="mt-4 mb-2 w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10">
          <BrainCircuitIcon className="h-3 w-3" />
        </div>
        <span className="font-medium">Thought process</span>
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="mt-4 pl-3">
          <div className="relative border-l-2 border-white/10 pl-6 pb-2">
            {logs.map((log, index) => (
              <div key={index} className="mb-6 relative">
                <div className="absolute -left-[32.5px] top-0 bg-[#222] rounded-full p-0.5">
                  <CheckCircle2 className="h-4 w-4 text-gray-500 fill-gray-500/20" />
                </div>
                <h4 className="text-sm font-semibold text-gray-200 capitalize">
                  {log.action.replace(/_/g, ' ')}
                </h4>
                {log.query && (
                  <p className="mt-1.5 text-[0.85em] leading-relaxed text-gray-400">
                    {log.query}
                  </p>
                )}
              </div>
            ))}
            
            <div className="relative">
              <div className="absolute -left-[32.5px] top-0 bg-[#222] rounded-full p-0.5">
                <LightbulbIcon className="h-4 w-4 text-gray-400" />
              </div>
              <h4 className="text-sm font-semibold text-gray-400">
                Thinking completed
              </h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
        text: `Error: ${error instanceof Error ? error.message : "Failed to connect to AI Agent"}`,
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
                    Ask an operational query or choose one of the scenario templates.
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
                          {message.role === "user" ? (
                            <p className="whitespace-pre-wrap">{message.text}</p>
                          ) : (
                            <div 
                              className="whitespace-pre-wrap [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>h4]:text-base [&>h4]:font-semibold [&>h4]:mb-2 [&>p]:mb-3 last:[&>p]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>li]:mb-1 [&_strong]:font-bold [&_em]:italic"
                              dangerouslySetInnerHTML={{ __html: marked.parse(message.text) as string }} 
                            />
                          )}
                          
                          {message.logs && message.logs.length > 0 && (
                            <CollapsibleAgentLogs logs={message.logs} />
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
                    AI Consultant is analyzing operational database...
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
          placeholder="Ask about factory operations..."
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
