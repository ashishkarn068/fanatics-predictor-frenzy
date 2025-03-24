import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  User, 
  Trophy, 
  Calendar, 
  ChevronDown, 
  X,
  Bell,
  LogOut,
  Home,
  BarChart
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { notifications } from '@/lib/mock-data';
import { isUserAdmin } from '@/utils/admin-auth';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  // Check if user is authenticated
  const isAuthenticated = !!currentUser;

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        try {
          const adminStatus = await isUserAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img 
                src="/images/iplLogo.png" 
                alt="IPL Predictor" 
                className="h-10 mr-2" 
              />
              <span className="text-xl font-bold gradient-text hidden sm:inline">IPL Predictor</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/' 
                    ? 'text-ipl-blue font-semibold' 
                    : 'text-gray-700 hover:text-ipl-blue'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/matches" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname.includes('/matches') 
                    ? 'text-ipl-blue font-semibold' 
                    : 'text-gray-700 hover:text-ipl-blue'
                }`}
              >
                Matches
              </Link>
              <Link 
                to="/leaderboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/leaderboard' 
                    ? 'text-ipl-blue font-semibold' 
                    : 'text-gray-700 hover:text-ipl-blue'
                }`}
              >
                Leaderboard
              </Link>
              
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/admin' 
                      ? 'text-ipl-blue font-semibold' 
                      : 'text-gray-700 hover:text-ipl-blue'
                  }`}
                >
                  Admin
                </Link>
              )}
              
              {isAuthenticated ? (
                <>
                  <Link to="/notifications" className="text-gray-700 hover:text-ipl-blue px-3 py-2 rounded-md text-sm font-medium relative">
                    <Bell size={20} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={currentUser?.photoURL || undefined} 
                            alt={currentUser?.displayName || 'User'} 
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className="bg-ipl-blue text-white">
                            {currentUser?.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{currentUser?.displayName || 'User'}</span>
                        <ChevronDown size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link to="/profile">
                        <DropdownMenuItem>
                          <User className="mr-2 h-4 w-4" />
                          <span>My Profile</span>
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link to="/register">
                  <Button variant="default" className="bg-ipl-blue hover:bg-ipl-blue/90">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {isAuthenticated && (
              <Link to="/notifications" className="text-gray-700 mr-4 relative">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  {notifications.filter(n => !n.read).length}
                </span>
              </Link>
            )}
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-ipl-blue focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/' 
                  ? 'text-ipl-blue font-semibold' 
                  : 'text-gray-700 hover:text-ipl-blue'
              }`}
              onClick={toggleMenu}
            >
              <div className="flex items-center">
                <Home className="mr-2 h-5 w-5" />
                Home
              </div>
            </Link>
            <Link 
              to="/matches" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname.includes('/matches') 
                  ? 'text-ipl-blue font-semibold' 
                  : 'text-gray-700 hover:text-ipl-blue'
              }`}
              onClick={toggleMenu}
            >
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Matches
              </div>
            </Link>
            <Link 
              to="/leaderboard" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === '/leaderboard' 
                  ? 'text-ipl-blue font-semibold' 
                  : 'text-gray-700 hover:text-ipl-blue'
              }`}
              onClick={toggleMenu}
            >
              <div className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Leaderboard
              </div>
            </Link>
            
            {isAdmin && (
              <Link 
                to="/admin" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === '/admin' 
                    ? 'text-ipl-blue font-semibold' 
                    : 'text-gray-700 hover:text-ipl-blue'
                }`}
                onClick={toggleMenu}
              >
                <div className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5" />
                  Admin
                </div>
              </Link>
            )}
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/profile" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === '/profile' 
                      ? 'text-ipl-blue font-semibold' 
                      : 'text-gray-700 hover:text-ipl-blue'
                  }`}
                  onClick={toggleMenu}
                >
                  <div className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    My Profile
                  </div>
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-ipl-blue"
                >
                  <div className="flex items-center">
                    <LogOut className="mr-2 h-5 w-5" />
                    Logout
                  </div>
                </button>
              </>
            ) : (
              <Link 
                to="/register" 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-ipl-blue"
                onClick={toggleMenu}
              >
                <div className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Sign In
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
