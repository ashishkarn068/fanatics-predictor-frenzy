// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, User, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8ee2OBNfvdvRnTnatdqXC6EN7yflqmbs",
  authDomain: "fanatics-predictor.firebaseapp.com",
  projectId: "fanatics-predictor",
  storageBucket: "fanatics-predictor.firebasestorage.app",
  messagingSenderId: "882421015273",
  appId: "1:882421015273:web:ee00904e7a7bb0c0b50678",
  measurementId: "G-EH6FM2JFG0"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

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
