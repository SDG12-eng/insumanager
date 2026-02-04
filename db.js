// ... (Mantén todo lo anterior: imports, createCompany, getCompanies, etc.)

// --- NUEVAS FUNCIONES PARA EL SUPER ADMIN ---

// 1. Obtener usuarios de una empresa específica
export async function getUsersByCompany(companyId) {
    const q = query(collection(db, "users"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

// 2. Registrar un pago manual (SaaS)
export async function addPayment(companyId, amount, method) {
    await addDoc(collection(db, `companies/${companyId}/payments`), {
        amount: parseFloat(amount),
        date: serverTimestamp(),
        method: method, // 'Transferencia', 'Stripe', 'Efectivo'
        status: 'paid'
    });
    // Opcional: Extender fecha de vencimiento aquí si tuvieras lógica de fechas
}

// 3. Obtener historial de pagos de una empresa
export async function getCompanyPayments(companyId) {
    const q = query(collection(db, `companies/${companyId}/payments`), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            // Convertir timestamp a fecha legible si existe, si no usar fecha actual
            formattedDate: data.date ? new Date(data.date.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()
        };
    });
}

// 4. Obtener Estadísticas Rápidas de una empresa (Para el "Muestreo de Panel")
export async function getCompanyStats(companyId) {
    // Nota: Leer todos los docs puede ser costoso en producción real.
    // Para MVP está bien. En prod usar contadores agregados.
    const suppliesSnap = await getCountFromServer(query(collection(db, `companies/${companyId}/supplies`)));
    const usersSnap = await getCountFromServer(query(collection(db, "users"), where("companyId", "==", companyId)));
    
    return {
        supplies: suppliesSnap.data().count,
        users: usersSnap.data().count
    };
}

// Importar getCountFromServer al inicio de db.js si no está:
import { getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
