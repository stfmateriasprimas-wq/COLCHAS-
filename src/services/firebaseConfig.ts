import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "materias-primas-stf",
  appId: "1:769806615177:web:3b707999f3aa7b371f3c58",
  apiKey: "AIzaSyDfdZAfcsOr3HrsFpLBFJOZGHaz0junEWk",
  authDomain: "materias-primas-stf.firebaseapp.com",
  storageBucket: "materias-primas-stf.firebasestorage.app",
  messagingSenderId: "769806615177",
  measurementId: "",
  oAuthClientId: "769806615177-rth1busak1qhhkeeo8sc2hg67mhb3hao.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
