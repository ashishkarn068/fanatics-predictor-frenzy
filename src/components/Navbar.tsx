
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  User, 
  Trophy, 
  Calendar, 
  ChevronDown, 
  X,
  Bell
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold gradient-text">IPL Predictor</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/matches" className="text-gray-700 hover:text-ipl-blue px-3 py-2 rounded-md text-sm font-medium">
                Matches
              </Link>
              <Link to="/predictions" className="text-gray-700 hover:text-ipl-blue px-3 py-2 rounded-md text-sm font-medium">
                Predictions
              </Link>
              <Link to="/leaderboard" className="text-gray-700 hover:text-ipl-blue px-3 py-2 rounded-md text-sm font-medium">
                Leaderboard
              </Link>
              <Link to="/notifications" className="text-gray-700 hover:text-ipl-blue px-3 py-2 rounded-md text-sm font-medium relative">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  3
                </span>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="User Avatar" />
                      <AvatarFallback className="bg-ipl-blue text-white">JP</AvatarFallback>
                    </Avatar>
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-predictions" className="cursor-pointer flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>My Predictions</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/achievements" className="cursor-pointer flex items-center">
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Achievements</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/login" className="cursor-pointer">
                      Sign Out
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile menu button */}
          {isMobile && (
            <div className="flex items-center md:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-ipl-blue focus:outline-none"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMobile && isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/matches" 
              className="text-gray-700 hover:text-ipl-blue block px-3 py-2 rounded-md text-base font-medium"
              onClick={toggleMenu}
            >
              Matches
            </Link>
            <Link 
              to="/predictions" 
              className="text-gray-700 hover:text-ipl-blue block px-3 py-2 rounded-md text-base font-medium"
              onClick={toggleMenu}
            >
              Predictions
            </Link>
            <Link 
              to="/leaderboard" 
              className="text-gray-700 hover:text-ipl-blue block px-3 py-2 rounded-md text-base font-medium"
              onClick={toggleMenu}
            >
              Leaderboard
            </Link>
            <Link 
              to="/notifications" 
              className="text-gray-700 hover:text-ipl-blue block px-3 py-2 rounded-md text-base font-medium"
              onClick={toggleMenu}
            >
              Notifications
            </Link>
            <Link 
              to="/profile" 
              className="text-gray-700 hover:text-ipl-blue block px-3 py-2 rounded-md text-base font-medium"
              onClick={toggleMenu}
            >
              Profile
            </Link>
            <Link 
              to="/login" 
              className="text-gray-700 hover:text-ipl-blue block px-3 py-2 rounded-md text-base font-medium"
              onClick={toggleMenu}
            >
              Sign Out
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
