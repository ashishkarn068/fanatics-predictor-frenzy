import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0288d1] text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {/* Logo Section */}
          <div className="flex justify-center md:justify-start">
            <img
              src="https://www.iplt20.com/assets/images/ipl-logo-new-old.png"
              alt="TATA IPL Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* About Section */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white">
              IPL Predictor Mania
            </h3>
            <p className="text-sm text-white/80 mt-1">
              Test your cricket prediction skills during IPL 2025.
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white">
              Quick Links
            </h3>
            <ul className="mt-1 space-y-1">
              <li>
                <button 
                  onClick={() => navigate('/')} 
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/matches')} 
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Matches
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/leaderboard')} 
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Leaderboard
                </button>
              </li>
            </ul>
          </div>

          {/* Connect Section */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white">
              Connect With Us
            </h3>
            <div className="mt-1">
              <a 
                href="https://github.com/ashishkarns/fanatics-predictor-frenzy" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center space-x-1 text-sm text-white/80 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span>View Repository</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-2 border-t border-white/20 text-center">
          <p className="text-xs text-white/60">
            © {currentYear} IPL Predictor Mania. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
