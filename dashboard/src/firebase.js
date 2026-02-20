import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDZX1Mujl9UK7GT8EDUezs0rHVMCexHJic",
    authDomain: "logiwa-intelligence.firebaseapp.com",
    projectId: "logiwa-intelligence",
    storageBucket: "logiwa-intelligence.firebasestorage.app",
    messagingSenderId: "802197643521",
    appId: "1:802197643521:web:81ed8461d1e4661b93fb00",
    measurementId: "G-7ZJ5LKZFL0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
