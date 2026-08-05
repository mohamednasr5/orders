
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNWeuRszXCZgmyIEyRwdKK1KaTp1SLn_I",
  authDomain: "orders-8f568.firebaseapp.com",
  databaseURL: "https://orders-8f568-default-rtdb.firebaseio.com",
  projectId: "orders-8f568",
  storageBucket: "orders-8f568.firebasestorage.app",
  messagingSenderId: "1029204669334",
  appId: "1:1029204669334:web:7df3d26ebd51d353abe3b7",
  measurementId: "G-FDZ9DHF6PL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, ref, set, get, child, onValue, push };
