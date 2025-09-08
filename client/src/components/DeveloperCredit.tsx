import { Code } from "lucide-react";

export default function DeveloperCredit() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Code className="h-3 w-3" />
          <span>Built by James Lemuel M. Rabang</span>
        </div>
      </div>
    </div>
  );
}
