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
import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";

// const MOCK_MESSAGES = [
//   { id: 1, role: "user", text: "Hello! How are you doing today?", time: "10:00 AM" },
//   { id: 2, role: "ai", text: "I'm doing great, thank you! How can I help you?", time: "10:01 AM" },
//   { id: 3, role: "user", text: "I need help understanding how to use the MessageScroller component.", time: "10:02 AM" },
//   { id: 4, role: "ai", text: "Sure! The MessageScroller helps you handle a scrollable area specifically designed for chat interfaces. It handles scrolling automatically and gives you a button to scroll to the bottom.", time: "10:02 AM" },
//   { id: 5, role: "user", text: "That sounds exactly like what I need. How do I construct the message itself?", time: "10:03 AM" },
//   { id: 6, role: "ai", text: "You can use the Message components like MessageAvatar, MessageContent, and MessageHeader inside each MessageScrollerItem. You can pass align='end' to align the user's messages to the right side of the screen.", time: "10:03 AM" },
// ];

const dateNow = () => {
  const date: Date = new Date();
  const yeaar = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${day}-${month}-${yeaar}`;
};

interface MessagesStruct {
  id: number;
  role: string;
  text: string;
  time: string;
}

const App = () => {
  const [textMessage, setTextMessage] = useState("");
  const [messages, setMessages] = useState<MessagesStruct[]>([]);
  const [id, setId] = useState(1);

  const handleSubmitPrompt = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (textMessage.trim() === "") return;
      setId((prevId) => prevId + 1);
      const messageDatas = {
        id: id,
        role: id % 2 === 0 ? "ai" : "user",
        text: textMessage,
        time: dateNow(),
      };
      setTextMessage("");
      setMessages((prevMessages) => [...prevMessages, messageDatas]);
    }
  };
  return (
    <main className="font-montserrat flex h-screen w-full flex-col items-center justify-center bg-[#222] p-8 text-white">
      <div className="flex h-[90%] w-7/12 flex-col items-center justify-between overflow-hidden rounded-xl">
        {messages.length < 1 && (
          <div className="w-10/12">
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
                            className={`flex w-full ${msg.role === "user" ? "justify-end" : "ml-3 justify-start"}`}
                          >
                            <div
                              className={`relative my-3 w-fit max-w-9/12 overflow-hidden rounded-2xl p-5 px-4 text-[0.9em] leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-[grey]/10 text-white"
                                  : "bg-[grey]/20 text-gray-100"
                              }`}
                            >
                              <p
                                className={`line-clamp-4 overflow-hidden ${msg.role === "user" ? "text-ellipsis" : "line-clamp-none leading-loose text-balance"}`}
                              >
                                {msg.text}
                              </p>
                            </div>
                          </div>
                          <MessageFooter className="w-fit text-[0.9em] font-semibold text-[grey]/50">
                            {msg.time}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className="cursor-pointer rounded-full border-0 bg-[grey]/20 text-white transition-all duration-500 hover:bg-[grey]/10 hover:text-white" />
            </MessageScroller>
          </MessageScrollerProvider>
        </div>
        <div className="mt-10 flex w-full justify-between rounded-full border border-[#80808050] border-b-[#80808050] px-6 py-4 hover:border-2 hover:border-[grey]/40">
          <Input
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyDown={(e) => handleSubmitPrompt(e)}
            placeholder="Sampaikan masalah kamu"
            value={textMessage}
            className="ml-4 w-10/12 border-none text-ellipsis"
          />
          <Button
            type="submit"
            className="cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <ArrowUpIcon />
          </Button>
        </div>
      </div>
    </main>
  );
};

export default App;
