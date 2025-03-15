import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="/images/iplLogo.png" 
                alt="IPL Predictor" 
                className="h-10 mr-2" 
              />
              <h3 className="text-xl font-bold gradient-text">IPL Predictor</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Test your cricket prediction skills and compete with friends during the
              Indian Premier League season.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/matches" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Matches
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Notifications
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 hover:text-ipl-blue text-sm">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="text-gray-600 hover:text-ipl-blue text-sm">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-gray-500 text-sm text-center">
            &copy; {new Date().getFullYear()} IPL Predictor Mania. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
