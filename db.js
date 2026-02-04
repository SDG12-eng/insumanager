// db.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- HELPERS ---
const getUser = () => auth.currentUser;
const logAudit = async (action, details) => {
    try {
        await addDoc(collection(db, "auditLogs"), {
            action, details, 
            user: getUser()?.email, 
            timestamp: serverTimestamp()
        });
    } catch(e) { console.log("Audit Error", e); }
};

// --- MÓDULO EMPRESAS (CORP) ---
export async function createCompany(data) {
    const docRef = await addDoc(collection(db, "companies"), {
        ...data,
        createdAt: serverTimestamp(),
        active: true
    });
    await logAudit("CREATE_COMPANY", `Empresa creada: ${data.name}`);
    return docRef.id;
}

export async function getCompanies() {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

// --- MÓDULO USUARIOS (GLOBAL & LOCAL) ---
export async function createUser(uid, userData) {
    // Nota: Crear Auth User requiere Cloud Functions en producción para seguridad.
    // Aquí simulamos guardando el documento en Firestore.
    await setDoc(doc(db, "users", uid), {
        ...userData,
        createdAt: serverTimestamp()
    });
}

// --- MÓDULO INSUMOS (COMPANY) ---
export async function getSupplies(companyId) {
    const q = query(collection(db, `companies/${companyId}/supplies`));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

export async function addSupply(companyId, data) {
    await addDoc(collection(db, `companies/${companyId}/supplies`), data);
    await logAudit("ADD_SUPPLY", `Insumo: ${data.name} en ${companyId}`);
}

export async function updateStock(companyId, supplyId, qty, type, reason) {
    const supplyRef = doc(db, `companies/${companyId}/supplies`, supplyId);
    const supplySnap = await getDoc(supplyRef);
    const currentStock = parseInt(supplySnap.data().stock);
    const newStock = type === 'IN' ? currentStock + parseInt(qty) : currentStock - parseInt(qty);

    await updateDoc(supplyRef, { stock: newStock });
    
    // Registrar Movimiento
    await addDoc(collection(db, `companies/${companyId}/movements`), {
        supplyId, type, qty, reason,
        user: getUser().email,
        date: serverTimestamp(),
        stockSnapshot: newStock
    });
}
