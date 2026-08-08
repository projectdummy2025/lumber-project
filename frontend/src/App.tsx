import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "./components/ui/message-scroller";
import {
  Message,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "./components/ui/message";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useState, useEffect } from "react";
import {
  sendChatMessage,
  getInventory,
  getWorkstations,
  InventoryMaterial,
  Workstation,
  AgentLog,
} from "./services/apiService";

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

const App = () => {
  const [textMessage, setTextMessage] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryMaterial[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);

  useEffect(() => {
    // Fetch initial dashboard metrics directly from frontend fullstack API
    getInventory().then(setInventory).catch(console.error);
    getWorkstations().then(setWorkstations).catch(console.error);
  }, []);

  const handleSendMessage = async () => {
    if (textMessage.trim() === "" || isLoading) return;

    const userText = textMessage;
    setTextMessage("");

    const userMessage: MessageItem = {
      id: Date.now(),
      role: "user",
      text: userText,
      time: formatCurrentDate(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userText);
      const assistantMessage: MessageItem = {
        id: Date.now() + 1,
        role: "ai",
        text: response.reply,
        time: formatCurrentDate(),
        logs: response.agent_logs,
      };
      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      const errorMessage: MessageItem = {
        id: Date.now() + 1,
        role: "ai",
        text: `Error: ${error instanceof Error ? error.message : "Gagal terhubung ke AI Agent"}`,
        time: formatCurrentDate(),
      };
      setMessages((previous) => [...previous, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <main className="font-montserrat flex h-screen w-full flex-col items-center justify-center bg-[#222] p-8 text-white">
      {/* Realtime Dashboard Header */}
      <header className="mb-4 flex w-7/12 items-center justify-between rounded-xl bg-white/5 p-4 text-xs">
        <div>
          <span className="font-semibold text-gray-400">Inventory Timber: </span>
          {inventory.map((item) => (
            <span key={item.id} className="ml-2 font-mono text-emerald-400">
              {item.material_name}: {item.stock_quantity} {item.unit}
            </span>
          ))}
        </div>
        <div>
          <span className="font-semibold text-gray-400">Workstations Active: </span>
          <span className="ml-1 font-mono text-blue-400">{workstations.length} units</span>
        </div>
      </header>

      <div className="flex h-[85%] w-7/12 flex-col items-center justify-between overflow-hidden rounded-xl">
        {messages.length < 1 && (
          <div className="w-10/12 my-auto">
            <h1 className="text-center text-5xl leading-tight text-white/80">
              Halo, Ada Yang Bisa Saya Bantu Mengenai Operational Factory?
            </h1>
          </div>
        )}

        {/* Chat Area */}
        <div className="relative min-h-0 w-full flex-1 border-0 p-4">
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {messages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      scrollAnchor={message.role === "user"}
                    >
                      <Message align={message.role === "user" ? "end" : "start"}>
                        <MessageContent>
                          <MessageHeader className="w-fit text-[0.9em] font-semibold text-gray-400">
                            {message.role === "user" ? "You" : "AI Operational Consultant"}
                          </MessageHeader>

                          <div
                            className={`flex w-full ${
                              message.role === "user" ? "justify-end" : "ml-3 justify-start"
                            }`}
                          >
                            <div
                              className={`relative my-3 w-fit max-w-9/12 overflow-hidden rounded-2xl p-5 px-4 text-[0.9em] leading-relaxed ${
                                message.role === "user"
                                  ? "bg-blue-600/30 text-white border border-blue-500/20"
                                  : "bg-white/10 text-gray-100 border border-white/10"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.text}</p>

                              {/* Render Agent Thought Process logs */}
                              {message.logs && message.logs.length > 0 && (
                                <div className="mt-4 rounded-lg bg-black/40 p-3 text-xs font-mono text-gray-300 border border-white/5">
                                  <div className="mb-1 text-emerald-400 font-semibold">
                                    Agent Thought Process:
                                  </div>
                                  {message.logs.map((log, index) => (
                                    <div key={index} className="mb-2">
                                      <span className="text-amber-400">[{log.action}]</span>{" "}
                                      {log.query && <div className="text-gray-400">{log.query}</div>}
                                      {log.observation && (
                                        <div className="text-emerald-300/80">{log.observation}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <MessageFooter className="w-fit text-[0.9em] font-semibold text-gray-400">
                            {message.time}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 p-4 text-sm text-gray-400">
                      <Loader2Icon className="animate-spin text-blue-500" />
                      AI Consultant sedang Menganalisis Database Operasional...
                    </div>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="cursor-pointer rounded-full border-0 bg-white/10 text-white transition-all duration-300 hover:bg-white/20" />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>

        <div className="mt-4 flex w-full justify-between rounded-full border border-white/20 px-6 py-3 hover:border-white/40">
          <Input
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sampaikan masalah operasional pabrik kamu..."
            value={textMessage}
            disabled={isLoading}
            className="ml-4 w-10/12 border-none text-ellipsis bg-transparent text-white focus:outline-none"
          />
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={isLoading}
            className="cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2Icon className="animate-spin" /> : <ArrowUpIcon />}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default App;
