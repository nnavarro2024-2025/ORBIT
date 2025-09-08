import { Code, Heart, GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Code className="h-4 w-4 text-blue-500" />
            <span>Developed with</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>by</span>
            <span className="font-semibold text-gray-800">James Lemuel M. Rabang</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <GraduationCap className="h-4 w-4 text-purple-500" />
            <span>BSIT Student • University of the Immaculate Conception</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-center text-xs text-gray-500">
            <span className="font-medium">ORBIT Campus Management System</span>
            <span className="mx-2">•</span>
            <span>© 2025 • Revolutionizing Campus Technology</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
