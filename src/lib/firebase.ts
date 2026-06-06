import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC6IXCk6EXm0ndord8Is6cRZf_mG2MY5UM",
    authDomain: "kedinasan-d9051.firebaseapp.com",
    projectId: "kedinasan-d9051",
    storageBucket: "kedinasan-d9051.firebasestorage.app",
    messagingSenderId: "488517479224",
    appId: "1:488517479224:web:57ed244cf69e2a010c6fcd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const loginAnonymously = async () => {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Firebase anonymouse login failed", error);
    }
};
