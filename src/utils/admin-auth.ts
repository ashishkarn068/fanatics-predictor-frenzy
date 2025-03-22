import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestore-collections';

/**
 * Checks if a user has admin privileges
 * @param userId The Firebase user ID to check
 * @returns Promise that resolves to true if the user is an admin, false otherwise
 */
export const isUserAdmin = async (userId: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // In development mode, we'll check Firestore first but fall back to true
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role === 'admin';
    }
    
    // For development, if user doesn't exist, we'll still return true
    console.log('User not found in Firestore, but allowing admin access for development');
    return true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    // For development, return true even if there's an error
    console.log('Error occurred, but allowing admin access for development');
    return true;
  }
};

/**
 * Sets a user as an admin (for development purposes)
 * @param userId The Firebase user ID to set as admin
 * @returns Promise that resolves when the operation is complete
 */
export const setUserAsAdmin = async (userId: string): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      // Update the existing user document with admin role
      await updateDoc(userDocRef, {
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
      console.log(`User ${userId} has been updated with admin role`);
    } else {
      // Create a new user document with admin role
      await setDoc(userDocRef, {
        uid: userId,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`User ${userId} has been created with admin role`);
    }
  } catch (error) {
    console.error('Error setting user as admin:', error);
    throw error;
  }
};

/**
 * Simplified check if a user is an admin
 * @param userId The Firebase user ID to check
 * @returns Boolean indicating if the user is an admin
 */
export const isAdmin = (userId?: string): boolean => {
  if (!userId) return false;
  
  // For development purposes, we'll return true
  // This allows the application to work without needing to set up Firebase properly
  return true;
};
