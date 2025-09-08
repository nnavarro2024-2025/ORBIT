import { Code, Heart, GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white mt-auto">
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Code className="h-4 w-4 text-blue-200" />
            <span>Developed with</span>
            <Heart className="h-4 w-4 text-red-400 fill-red-400" />
            <span>by</span>
            <span className="font-bold text-white bg-white/20 px-3 py-1 rounded-full">James Lemuel M. Rabang</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-purple-200" />
            <span className="font-medium">BSIT Student • University of the Immaculate Conception</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-center text-sm">
            <span className="font-bold text-white">ORBIT Campus Management System</span>
            <span className="mx-2 text-blue-200">•</span>
            <span className="text-blue-100">© 2025 • Revolutionizing Campus Technology</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
