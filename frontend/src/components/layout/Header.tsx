interface HeaderProps {
  activeTab: "chat" | "dashboard";
  onTabChange: (tab: "chat" | "dashboard") => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#181818] px-4 sm:px-8 text-white shrink-0">
      {/* Brand */}
      <span className="text-sm sm:text-base font-bold tracking-wide">Lumber Manufactory</span>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        <button
          onClick={() => onTabChange("chat")}
          className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "chat"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          AI Assistant
        </button>

        <button
          onClick={() => onTabChange("dashboard")}
          className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "dashboard"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="hidden sm:inline">Operations Dashboard</span>
          <span className="sm:hidden">Operations</span>
        </button>
      </nav>
    </header>
  );
};
