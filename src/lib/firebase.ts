// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, User, onAuthStateChanged } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getFirebaseConfig } from "@/utils/firebase-config";

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

// Auth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Initialize Firebase with configuration from Azure Key Vault
export async function initializeFirebase() {
  try {
    if (app) return { app, auth, db }; // Return existing instances if already initialized

    console.log('Initializing Firebase with config from Azure Key Vault...');
    const firebaseConfig = await getFirebaseConfig();
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Enable offline persistence for Firestore
    if (db) {
      enableIndexedDbPersistence(db)
        .then(() => {
          console.log('Firestore persistence enabled');
        })
        .catch((err) => {
          console.error('Error enabling Firestore persistence:', err);
          if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
          }
        });
    }

    // Debug Firebase connection in development
    if (import.meta.env.DEV) {
      console.log('Firebase initialized with config:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
      });
    }

    return { app, auth, db };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  onAuthStateChanged
};

export type { User };
