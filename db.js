import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SUPER ADMIN: Gestión de Empresas ---
export async function createCompany(data) {
    // Crear empresa
    const compRef = await addDoc(collection(db, "companies"), {
        name: data.name,
        plan: data.plan,
        status: 'active', // active | blocked
        createdAt: serverTimestamp()
    });

    // Crear Admin de la empresa automáticamente
    const adminUid = `admin_${compRef.id}`; // Simulado para el ejemplo
    await setDoc(doc(db, "users", adminUid), {
        email: data.adminEmail,
        role: 'COMPANY_ADMIN',
        companyId: compRef.id,
        name: "Admin " + data.name
    });
    
    // (Nota: En prod, aquí usarías Cloud Functions para crear el Auth real)
    return compRef.id;
}

export async function toggleCompanyStatus(companyId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, "companies", companyId), { status: newStatus });
    return newStatus;
}

export async function getCompanies() {
    const snap = await getDocs(collection(db, "companies"));
    return snap.docs.map(d => ({id: d.id, ...d.data()}));
}

// --- EMPRESA: Insumos ---
export async function getSupplies(companyId) {
    const q = query(collection(db, `companies/${companyId}/supplies`));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
}

// --- UTILIDAD: Exportar a XLS ---
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
