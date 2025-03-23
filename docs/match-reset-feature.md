# Match Reset Feature

## Overview

The Match Reset feature allows administrators to reset a completed match back to "upcoming" status. This functionality is useful in scenarios where:

- A match was accidentally marked as completed
- Incorrect match results were entered and need to be cleared
- A match needs to be reopened for predictions after being closed

## Technical Implementation

The reset process consists of several operations that work together to cleanly revert a match and all associated data:

### 1. Match Status Reset

The match document in Firestore is updated to:
- Change status from "completed" to "upcoming"
- Remove the result field entirely using Firebase's `deleteField()` operation
- Update the timestamp to record when the change occurred

```typescript
const matchData = {
  status: 'upcoming' as const
};

const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
await updateDoc(matchRef, {
  ...matchData,
  result: deleteField(), // Use deleteField() to remove the result field
  updatedAt: serverTimestamp()
});
```

### 2. Match Result Deletion

The separate match result document, which contains detailed information about the match outcome, is completely removed from the database:

```typescript
export const resetMatchResult = async (matchId: string): Promise<void> => {
  try {
    // Get the match result document
    const matchResultRef = doc(db, COLLECTIONS.MATCH_RESULTS, matchId);
    const matchResultSnap = await getDoc(matchResultRef);
    
    // If it exists, delete it
    if (matchResultSnap.exists()) {
      await deleteDoc(matchResultRef);
      console.log(`Match result for match ${matchId} has been deleted`);
    } else {
      console.log(`No match result found for match ${matchId}`);
    }
  } catch (error) {
    console.error(`Error resetting match result for match ${matchId}:`, error);
    throw new Error(`Failed to reset match result: ${error.message}`);
  }
};
```

### 3. User Predictions Reset

All user predictions for the match are deleted, and user point totals are adjusted to remove any points earned from this match:

```typescript
export const resetMatchPredictions = async (matchId: string): Promise<void> => {
  try {
    // 1. Get all prediction answers for this match
    const predictionAnswersQuery = query(
      collection(db, COLLECTIONS.PREDICTION_ANSWERS),
      where("matchId", "==", matchId)
    );
    const predictionAnswersSnap = await getDocs(predictionAnswersQuery);
    
    // Track which users need their points reset and by how much
    const userPointsToReset = new Map<string, number>();
    
    // 2. Process in batches of 500 (Firestore limit)
    const batch = writeBatch(db);
    let operationCount = 0;
    
    predictionAnswersSnap.forEach((doc) => {
      const predictionAnswer = doc.data();
      
      // Track points to reset for this user
      if (predictionAnswer.points && predictionAnswer.userId) {
        const currentPoints = userPointsToReset.get(predictionAnswer.userId) || 0;
        userPointsToReset.set(predictionAnswer.userId, currentPoints + predictionAnswer.points);
      }
      
      // Delete the prediction answer
      batch.delete(doc.ref);
      operationCount++;
      
      // If we reach the batch limit, commit and create a new batch
      if (operationCount >= 500) {
        await batch.commit();
        operationCount = 0;
      }
    });
    
    // Commit any remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }
    
    // 3. Update user totals by subtracting the points they earned from this match
    for (const [userId, pointsToSubtract] of userPointsToReset.entries()) {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedPoints = (userData.totalPoints || 0) - pointsToSubtract;
        
        await updateDoc(userRef, {
          totalPoints: updatedPoints >= 0 ? updatedPoints : 0
        });
      }
    }
    
    // 4. Delete the match leaderboard if it exists
    const leaderboardRef = doc(db, COLLECTIONS.LEADERBOARDS, matchId);
    const leaderboardSnap = await getDoc(leaderboardRef);
    
    if (leaderboardSnap.exists()) {
      await deleteDoc(leaderboardRef);
    }
    
    console.log(`Reset ${predictionAnswersSnap.size} predictions for match ${matchId}`);
  } catch (error) {
    console.error(`Error resetting predictions for match ${matchId}:`, error);
    throw new Error(`Failed to reset match predictions: ${error.message}`);
  }
};
```

## User Interface

The Match Reset feature is accessible through the admin interface in the Match Result Updater component. Administrators can:

1. Select a match from the dropdown menu
2. Click the "Reset Match" button 
3. Confirm the action when prompted with a warning dialog

The UI provides clear feedback with:
- A confirmation dialog explaining the consequences of the reset
- Loading states with spinner icons during the reset operation
- Toast notifications confirming success or displaying errors
- Automatic refresh of the match list after a successful reset

## Security Considerations

The Match Reset feature includes several security measures:

1. **Admin Authentication**: Only authenticated users with admin privileges can reset matches
2. **Confirmation Dialog**: Users must explicitly confirm the action before it proceeds
3. **Error Handling**: All database operations include proper error handling and user feedback
4. **Audit Trail**: The match document includes a timestamp update to track when changes occurred

## Future Enhancements

Potential improvements to consider for the Match Reset feature:

1. **Audit Logging**: Add a dedicated audit log to track who reset a match and when
2. **Notification System**: Notify users whose predictions were reset
3. **Batch Reset**: Allow resetting multiple matches at once
4. **Partial Reset**: Option to reset only match results without affecting predictions
5. **Undo Capability**: Store backup data to allow undoing a reset within a time window 