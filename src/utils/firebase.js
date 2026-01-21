// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyD1-uxu9eHmt0JJSZeWOxZTHs_Dl9oUypQ",
    authDomain: "line-schedule-liff.firebaseapp.com",
    projectId: "line-schedule-liff",
    storageBucket: "line-schedule-liff.firebasestorage.app",
    messagingSenderId: "1034348545160",
    appId: "1:1034348545160:web:68fb371f1be3320a1d4b3d",
    measurementId: "G-XGTK80TCG7"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
