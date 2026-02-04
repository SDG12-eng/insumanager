import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración (EXPORTADA para usar en db.js)
export const firebaseConfig = {
  apiKey: "AIzaSyA5pUM_BycmKkbfhreDUrUH5CJEg_ykUW4",
  authDomain: "proyectocoorporativo.firebaseapp.com",
  projectId: "proyectocoorporativo",
  storageBucket: "proyectocoorporativo.firebasestorage.app",
  messagingSenderId: "152806986808",
  appId: "1:152806986808:web:6944d32424e27dbf9e82cd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
