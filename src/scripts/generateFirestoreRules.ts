import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define Firestore security rules
const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Common functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Teams collection - Read: all, Write: admin only
    match /teams/{teamId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Players collection - Read: all, Write: admin only
    match /players/{playerId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Matches collection - Read: all, Write: admin only
    match /matches/{matchId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Users collection - Read: owner/admin, Write: admin only (except own profile)
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Questions collection - Read: all, Write: admin only
    match /questions/{questionId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // PredictionGames collection - Read: all, Write: admin only
    match /predictionGames/{gameId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    // PredictionAnswers collection - Read: owner/admin, Write: owner (create/update) or admin
    match /predictionAnswers/{answerId} {
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || isAdmin()
      );
      allow delete: if isAdmin();
    }
    
    // Prediction questions - public read, admin write
    match /predictionQuestions/{questionId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Leaderboards - public read, admin write
    match /leaderboards/{leaderboardId} {
      allow read: if true;
      allow write: if isAdmin();
      
      // Leaderboard entries - public read, admin write
      match /leaderboardEntries/{entryId} {
        allow read: if true;
        allow write: if isAdmin();
      }
    }
  }
}`;

// Function to generate Firestore rules file
export const generateFirestoreRules = () => {
  try {
    const filePath = path.join(process.cwd(), 'firestore.rules');
    fs.writeFileSync(filePath, firestoreRules);
    console.log(`Firestore rules written to ${filePath}`);
    return true;
  } catch (error) {
    console.error('Error generating Firestore rules:', error);
    return false;
  }
};

// Execute if run directly
// In ESM, we can't directly check if a file is being run as the main module
// So we'll skip this check for now
// const isMainModule = import.meta.url === `file://${process.argv[1]}`;
// if (isMainModule) {
//   generateFirestoreRules();
// }

export default generateFirestoreRules;
