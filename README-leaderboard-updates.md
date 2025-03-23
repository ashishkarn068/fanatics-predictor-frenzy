# Prediction Leaderboard Real-Time Updates

This document explains the real-time leaderboard update functionality implemented for the Fanatics Predictor Frenzy application.

## Overview

When match results are updated, the leaderboard now automatically updates across the application without requiring users to refresh the page. This provides a more interactive and engaging experience for users.

## Key Features

1. **Automatic Evaluation**: When an admin updates match results, predictions are automatically evaluated, and points are awarded to users.

2. **Real-Time Leaderboard Updates**: All leaderboards (match-specific, weekly, and season) now update in real-time as prediction results are evaluated.

3. **Real-Time Prediction Results**: Users can see their prediction results (correct/incorrect) update in real-time without refreshing the page.

4. **Improved User Experience**: The seamless updates enhance the application's interactivity and provide immediate feedback to users.

5. **Match Reset Functionality**: Admins can now reset a match from "completed" to "upcoming" status, clearing all predictions and restoring leaderboard points.

## Technical Implementation

### Evaluation Process

1. When an admin updates match results, the `evaluateMatchPredictions` function is automatically triggered.

2. This function:
   - Retrieves all user predictions for the match
   - Evaluates each prediction against the actual results
   - Awards points to users based on correct predictions
   - Updates user profiles with earned points
   - Creates or updates match-specific leaderboards

### Match Reset Process

1. When an admin resets a match, the following happens:
   - The match status is changed from "completed" to "upcoming"
   - The match result data is removed from the database
   - All prediction answers for the match are deleted
   - User points earned from this match are deducted from their profiles
   - The match leaderboard is deleted

### Real-Time Updates

1. **Firestore Listeners**: The application now uses Firestore's real-time listeners to monitor changes to:
   - User answers in the PredictionGame component
   - Leaderboard entries in the Leaderboard component

2. **Component Updates**:
   - When data changes in Firestore, components automatically re-render with the updated data
   - No page refresh is required to see updated leaderboards or prediction results

## Usage

### For Admins

1. Navigate to the admin page and select a match to update
2. Enter the match results and click "Update Results"
3. Predictions will be automatically evaluated and leaderboards will update
4. To reset a match, select the match and click "Reset Match" (this will revert the match to upcoming status and remove all prediction data)

### For Users

1. When viewing a match with predictions, results will update in real-time as they are evaluated
2. Leaderboards across the application will automatically update to reflect the latest standings

## Implementation Details

The real-time updates have been implemented in these key components:

1. **src/utils/firestore-collections.ts**: Enhanced the `evaluateMatchPredictions` function to update user profiles and leaderboards. Added `resetMatchResult` and `resetMatchPredictions` functions to support the match reset feature.

2. **src/components/predictions/Leaderboard.tsx**: Updated to use real-time listeners for leaderboard data.

3. **src/components/predictions/PredictionGame.tsx**: Now uses real-time listeners for prediction results.

4. **src/components/admin/MatchResultUpdater.tsx**: Updated to automatically evaluate predictions after saving match results and to provide match reset functionality.

## Troubleshooting

If leaderboards are not updating:

1. Check browser console for errors
2. Verify that the match status is set to "completed"
3. Ensure that the prediction evaluation process completed successfully
4. As a last resort, manually trigger the evaluation process using the "Evaluate Predictions" button

## Future Enhancements

1. Add notification system to alert users when their predictions are evaluated
2. Implement animations for point changes in the leaderboard
3. Add detailed statistics page showing prediction accuracy over time
4. Add batch reset functionality to reset multiple matches at once 