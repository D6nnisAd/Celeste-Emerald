// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
// REPLACE THIS WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAekLsfqslOVE7rpHiKgxPZGublCwCPIiI",
    authDomain: "celeste-emerald.firebaseapp.com",
    projectId: "celeste-emerald",
    storageBucket: "celeste-emerald.firebasestorage.app",
    messagingSenderId: "820580965028",
    appId: "1:820580965028:web:2789813b92107e52006431"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, doc, getDoc, setDoc, updateDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged };
