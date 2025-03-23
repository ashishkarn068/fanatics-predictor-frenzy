import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  googleProvider,
  facebookProvider,
  signInWithPopup
} from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/firestore-collections';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<User>;
  facebookSignIn: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to store or update user data in Firestore
  const storeUserData = async (user: User) => {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous User',
        photoURL: user.photoURL,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Update existing user document with latest auth data
      await setDoc(userRef, {
        displayName: user.displayName || userDoc.data().displayName,
        photoURL: user.photoURL || userDoc.data().photoURL,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  // Sign up with email and password
  const signup = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        await storeUserData(userCredential.user);
        return userCredential.user;
      });
  };

  // Login with email and password
  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        await storeUserData(userCredential.user);
        return userCredential.user;
      });
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  // Google sign in
  const googleSignIn = () => {
    return signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        await storeUserData(result.user);
        return result.user;
      });
  };

  // Facebook sign in
  const facebookSignIn = () => {
    return signInWithPopup(auth, facebookProvider)
      .then(async (result) => {
        await storeUserData(result.user);
        return result.user;
      });
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await storeUserData(user);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    googleSignIn,
    facebookSignIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
