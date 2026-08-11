interface HeaderProps {
  activeTab: "chat" | "dashboard";
  onTabChange: (tab: "chat" | "dashboard") => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#181818] px-8 text-white">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-wide">Lumber Manufactory</span>
      </div>

      <nav className="flex items-center gap-2">
        <button
          onClick={() => onTabChange("chat")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          AI Assistant
        </button>

        <button
          onClick={() => onTabChange("dashboard")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "dashboard"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          Operations Dashboard
        </button>
      </nav>
    </header>
  );
};
