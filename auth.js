// auth.js
import { auth, db, googleProvider } from './firebase-config.js';
import { signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- LOGIN ---
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return checkUserRole(userCredential.user);
    } catch (error) {
        console.error("Error login:", error);
        throw error;
    }
}

export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return checkUserRole(result.user);
    } catch (error) {
        console.error("Error Google:", error);
        throw error;
    }
}

// --- VERIFICACIÓN DE ROL Y REDIRECCIÓN ---
async function checkUserRole(user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        localStorage.setItem('user_role', userData.role);
        localStorage.setItem('company_id', userData.companyId || '');
        
        // Router Lógico
        if (userData.role === 'SUPER_ADMIN_CORP') {
            window.location.href = 'corp-admin.html';
        } else if (['ADMIN_EMPRESA', 'USUARIO', 'AUDITOR'].includes(userData.role)) {
            window.location.href = 'company-panel.html';
        } else {
            alert("Rol no asignado. Contacte soporte.");
            await logoutUser();
        }
    } else {
        alert("Usuario no registrado en base de datos administrativa.");
        await logoutUser();
    }
}

export async function logoutUser() {
    await signOut(auth);
    localStorage.clear();
    window.location.href = 'index.html';
}

// Guardar sesión PWA
export function initAuthGuard(requiredRoleGroup) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            // Validación extra de seguridad en cliente
            const storedRole = localStorage.getItem('user_role');
            if(requiredRoleGroup === 'CORP' && storedRole !== 'SUPER_ADMIN_CORP') {
                window.location.href = 'index.html';
            }
        }
    });
}
