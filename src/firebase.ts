import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAyZ_ycbfampCWC6fqoWwDSgokMFTby370",
  authDomain: "alfa-project-4ccf0.firebaseapp.com",
  databaseURL: "https://alfa-project-4ccf0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alfa-project-4ccf0",
  storageBucket: "alfa-project-4ccf0.appspot.com",
  messagingSenderId: "68665549482",
  appId: "1:68665549482:web:d6607d347982b4140ee6d3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
