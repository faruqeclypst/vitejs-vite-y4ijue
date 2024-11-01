import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA4LJ0sPhb7qehE8K0ou7NKIauamNAEuB8",
  authDomain: "sman-modalbangsa.firebaseapp.com",
  databaseURL: "https://sman-modalbangsa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sman-modalbangsa",
  storageBucket: "sman-modalbangsa.appspot.com",
  messagingSenderId: "318465029002",
  appId: "1:318465029002:web:030d18e747b67fffb74e73"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
