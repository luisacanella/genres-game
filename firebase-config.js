import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyABObRNLtxV-HiHaM1th01f3yn08t5TEmA",
  authDomain: "genres-game.firebaseapp.com",
  projectId: "genres-game",
  storageBucket: "genres-game.firebasestorage.app",
  messagingSenderId: "82837680",
  appId: "1:82837680:web:19d84090ace7856d263b75"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp };
