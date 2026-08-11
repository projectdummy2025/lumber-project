import { useState } from "react";
import { Header } from "./components/layout/Header";
import { OperationsDashboard } from "./components/dashboard/OperationsDashboard";
import { ChatView } from "./components/chat/ChatView";

type ViewState = "chat" | "dashboard";

const App = () => {
  const [activeTab, setActiveTab] = useState<ViewState>("chat");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");

  const handleSelectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setActiveTab("chat"); // Auto-switch to chat view to trigger the AI analysis
  };

  return (
    <main className="font-montserrat flex h-screen w-full flex-col overflow-hidden bg-[#121212]">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden relative">
        {/* Keep both rendered in DOM to preserve chat state when toggling tabs */}
        <div className={`h-full w-full ${activeTab === "dashboard" ? "block" : "hidden"}`}>
          <OperationsDashboard onSelectPrompt={handleSelectPrompt} />
        </div>

        <div className={`h-full w-full ${activeTab === "chat" ? "block" : "hidden"}`}>
          <ChatView
            initialPrompt={selectedPrompt}
            onClearInitialPrompt={() => setSelectedPrompt("")}
          />
        </div>
      </div>
    </main>
  );
};

export default App;
