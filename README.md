# IPL Predictor Frenzy

A modern, interactive cricket prediction platform where fans can predict match outcomes and compete on leaderboards.

![IPL Predictor](https://i.imgur.com/placeholder.png)

## 🏏 Overview

IPL Predictor Frenzy is a web application that allows cricket enthusiasts to make predictions about IPL matches, compete with friends, and track their performance on various leaderboards. Users can predict match winners, top performers, and other statistics for upcoming cricket matches.

## ✨ Features

- **Match Predictions**: Make predictions for upcoming IPL matches
- **Player Selection**: Select players for performance-based questions with team logos for easy identification
- **Real-time Leaderboards**: Three types of leaderboards (Match, Weekly, Season)
- **Points System**: Earn points for correct predictions with negative points for incorrect ones
- **Admin Dashboard**: Admin users can update match results and evaluate predictions
- **User Authentication**: Secure Firebase-based authentication
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🧩 Core Components

### Prediction System
- Make predictions up to 24 hours before match start
- Reset predictions up to 5 minutes before match time
- Various prediction types (match winner, top batsman/bowler, sixes, etc.)

### Leaderboards
- **Match Leaderboard**: Rankings for individual match predictions
- **Weekly Leaderboard**: Performance across a weekly time frame
- **Season Leaderboard**: Global rankings for the entire season
- Ranking criteria: Points (highest first) → Accuracy (highest first) → Name (alphabetical)

### Admin Features
- Update match results
- Evaluate user predictions
- Reset match data if needed
- Manage player data and teams

## 🛠️ Technical Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Custom components with shadcn/ui
- **State Management**: React Context API
- **Backend**: Firebase (Firestore)
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting

## 📦 Project Structure

```
src/
├── components/       # UI components
│   ├── admin/        # Admin-specific components
│   ├── auth/         # Authentication components
│   ├── leaderboard/  # Leaderboard components
│   ├── matches/      # Match display components
│   ├── predictions/  # Prediction components
│   └── ui/           # Reusable UI components
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── lib/              # Helper libraries and type definitions
├── pages/            # Page components
├── utils/            # Utility functions
└── styles/           # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/username/fanatics-predictor-frenzy.git
cd fanatics-predictor-frenzy
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Create a `.env` file with your Firebase configuration
```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

## 📱 Screenshots

| Home Page | Match Predictions | Leaderboard |
|-----------|-------------------|-------------|
| ![Home](https://i.imgur.com/placeholder.png) | ![Predictions](https://i.imgur.com/placeholder.png) | ![Leaderboard](https://i.imgur.com/placeholder.png) |

## 🔐 Authentication

The application uses Firebase Authentication for user management. Users can:
- Sign up with email and password
- Sign in with existing accounts
- Link accounts with social providers (Google, Facebook)
- Reset password

## 📊 Scoring System

| Prediction Type | Correct | Incorrect |
|-----------------|---------|-----------|
| Match Winner    | +10 pts | -2 pts    |
| Top Batsman     | +15 pts | -2 pts    |
| Top Bowler      | +15 pts | -2 pts    |
| Total Runs      | +15 pts | -2 pts    |
| Team with more sixes | +10 pts | -2 pts |
| Special Events  | Varies  | Varies    |

## 🔄 Data Flow

1. User makes predictions for an upcoming match
2. Match occurs in real life
3. Admin updates match results in the system
4. System evaluates predictions and awards points
5. Leaderboards are updated automatically
6. Users can view their performance and global rankings

## 🧪 Testing

```bash
# Run tests
npm test
# or
yarn test
```

## 🛣️ Roadmap

- [ ] Advanced statistics and user insights
- [ ] Social features (comments, sharing)
- [ ] Push notifications for match reminders
- [ ] Additional prediction categories
- [ ] Mobile app version

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [IPL Official](https://www.iplt20.com/) - Match data and team information
- [shadcn/ui](https://ui.shadcn.com/) - UI component primitives
- [Lucide Icons](https://lucide.dev/) - Beautiful icon set
