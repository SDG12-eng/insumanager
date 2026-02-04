import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// --- FUNCIÓN CENTRAL DE REDIRECCIÓN ---
async function handleUserRedirect(user) {
    if (!user || !user.uid) {
        throw new Error("Error: No se pudo obtener el ID del usuario.");
    }

    // Leer datos del usuario en Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Verificar bloqueo de empresa (Excepto Super Admin)
        if (userData.role !== 'SUPER_ADMIN') {
            if (!userData.companyId) {
                throw new Error("Usuario sin empresa asignada.");
            }
            const companyDoc = await getDoc(doc(db, "companies", userData.companyId));
            
            if (companyDoc.exists()) {
                if (companyDoc.data().status === 'blocked') {
                    await signOut(auth);
                    throw new Error("ACCESO DENEGADO: Su empresa está suspendida.");
                }
                localStorage.setItem('branding_name', companyDoc.data().name);
            }
        }

        // Guardar sesión
        localStorage.setItem('user_data', JSON.stringify(userData));

        // Redirigir
        if (userData.role === 'SUPER_ADMIN') {
            window.location.href = 'super-admin.html';
        } else {
            window.location.href = 'app.html';
        }
    } else {
        // El usuario se autenticó (Google/Email) pero no existe en la base de datos 'users'
        await signOut(auth);
        throw new Error("Usuario no registrado en el sistema SaaS.");
    }
}

// --- LOGIN EMAIL ---
export async function login(email, password) {
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await handleUserRedirect(userCred.user);
    } catch (error) {
        let msg = error.message;
        if(error.code === 'auth/invalid-credential') msg = "Credenciales incorrectas.";
        alert(msg);
    }
}

// --- LOGIN GOOGLE (NUEVO) ---
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        await handleUserRedirect(result.user);
    } catch (error) {
        console.error("Error Google Auth:", error);
        if (error.code === 'auth/popup-closed-by-user') {
            alert("Cerraste la ventana de inicio de sesión.");
        } else {
            alert("Error al iniciar con Google: " + error.message);
        }
    }
}

// --- LOGOUT ---
export function logout() {
    signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

// --- GUARDIA DE RUTAS ---
export function authGuard(requiredRole) {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        const stored = localStorage.getItem('user_data');
        if (!stored) {
            // Si hay usuario Auth pero no localStorage, intentar recuperar o salir
            logout(); 
            return;
        }

        const userData = JSON.parse(stored);
        if (requiredRole === 'SUPER_ADMIN' && userData.role !== 'SUPER_ADMIN') {
            window.location.href = 'app.html';
        }
    });
}
