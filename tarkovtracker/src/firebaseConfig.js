import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmnyWsbuhksvNGydNTWreK9ojK8PIpARU",
  authDomain: "tarkovtracker-squad.firebaseapp.com",
  projectId: "tarkovtracker-squad",
  storageBucket: "tarkovtracker-squad.firebasestorage.app",
  messagingSenderId: "168303246246",
  appId: "1:168303246246:web:ba0bc97b172ff362e56d67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();