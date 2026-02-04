import { db, firebaseConfig } from './firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, query, where, serverTimestamp, orderBy, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Importaciones para crear usuario secundario
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- SUPER ADMIN: GESTIÓN DE EMPRESAS ---

export async function createCompany(data) {
    // 1. Usar una App Secundaria para crear el usuario en Auth sin cerrar sesión al Admin
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);
    
    let adminUid = null;

    try {
        // Crear usuario real en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.adminEmail, data.password);
        adminUid = userCredential.user.uid;
        
        // Cerrar sesión de la app secundaria inmediatamente
        await signOut(secondaryAuth);
    } catch (error) {
        console.error("Error Auth:", error);
        throw new Error("Error al crear usuario: " + error.message);
    }

    // 2. Crear documento de la empresa en Firestore
    const compRef = await addDoc(collection(db, "companies"), {
        name: data.name,
        plan: data.plan,
        status: 'active',
        createdAt: serverTimestamp()
    });

    // 3. Crear perfil del usuario Admin en Firestore vinculado a la empresa
    if (adminUid) {
        await setDoc(doc(db, "users", adminUid), {
            email: data.adminEmail,
            role: 'COMPANY_ADMIN', // Rol Admin de Empresa
            companyId: compRef.id,
            name: "Admin " + data.name,
            // Opcional: guardamos la pass solo como referencia para el Super Admin
            passwordHint: data.password 
        });
    }
    
    return compRef.id;
}

export async function getCompanies() {
    const snap = await getDocs(collection(db, "companies"));
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function toggleCompanyStatus(companyId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, "companies", companyId), { status: newStatus });
    return newStatus;
}

// --- SUPER ADMIN: GESTIÓN INTERNA ---

export async function getUsersByCompany(companyId) {
    const q = query(collection(db, "users"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function addPayment(companyId, amount, method) {
    await addDoc(collection(db, `companies/${companyId}/payments`), {
        amount: parseFloat(amount),
        date: serverTimestamp(),
        method: method,
        status: 'paid'
    });
}

export async function getCompanyPayments(companyId) {
    const q = query(collection(db, `companies/${companyId}/payments`), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            formattedDate: data.date ? new Date(data.date.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()
        };
    });
}

export async function getCompanyStats(companyId) {
    try {
        const suppliesSnap = await getCountFromServer(query(collection(db, `companies/${companyId}/supplies`)));
        const usersSnap = await getCountFromServer(query(collection(db, "users"), where("companyId", "==", companyId)));
        
        return {
            supplies: suppliesSnap.data().count,
            users: usersSnap.data().count
        };
    } catch (e) {
        console.log("Error stats:", e);
        return { supplies: 0, users: 0 };
    }
}

// --- EMPRESA: INSUMOS ---

export async function getSupplies(companyId) {
    if(!companyId) return [];
    const q = query(collection(db, `companies/${companyId}/supplies`));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
}

// --- UTILIDADES ---

export function exportToXLS(data, filename) {
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head><body>
        <table border="1">
            <thead>
                <tr style="background-color: #4f46e5; color: white;">
                    <th>NOMBRE</th><th>CATEGORÍA</th><th>STOCK</th><th>ESTADO</th>
                </tr>
            </thead>
            <tbody>`;
    
    data.forEach(row => {
        html += `<tr>
            <td>${row.name}</td>
            <td>${row.category}</td>
            <td>${row.stock}</td>
            <td>${row.stock < 5 ? 'BAJO' : 'NORMAL'}</td>
        </tr>`;
    });

    html += `</tbody></table></body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.xls`;
    a.click();
}
