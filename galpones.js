async function cargarGalpones() {
    try {
        const token = localStorage.getItem('token');
        const granjaId = getSelectedGranjaId();
        const res = await fetch(`${window.API_URL}/galpones?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const tbody = document.getElementById('tablaGalpones');
        tbody.innerHTML = '';

        data.forEach(g => {
            const estadoClass = g.estado === 'ocupado' ? 'badge-vendido' : 'badge-disponible'; // Reusamos estilos
            tbody.innerHTML += `
                <tr>
                    <td><strong>${g.nombre}</strong></td>
                    <td>${g.capacidad}</td>
                    <td><span class="${estadoClass}">${g.estado.toUpperCase()}</span></td>
                    <td><button onclick="eliminarGalpon(${g.id})" class="btn btn-sm btn-peligro">Eliminar</button></td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

async function guardarGalpon(e) {
    e.preventDefault();
    const granjaId = getSelectedGranjaId();
    const data = {
        granjaId,
        nombre: document.getElementById('nombre').value,
        capacidad: document.getElementById('capacidad').value
    };

    try {
        const res = await fetch(`${window.API_URL}/galpones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            location.reload();
        } else {
            alert("Error al guardar");
        }
    } catch (e) { alert("Error"); }
}

async function eliminarGalpon(id) {
    if (confirm("¿Eliminar galpón?")) {
        const granjaId = getSelectedGranjaId();
        await fetch(`${window.API_URL}/galpones/${id}?granjaId=${granjaId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        cargarGalpones();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('galponForm');
    if (form) form.onsubmit = guardarGalpon;

    // Lógica simple de toggle
    document.getElementById('toggleFormBtn').onclick = () => {
        document.getElementById('formContainer').classList.add('is-open');
    };
    document.getElementById('cancelBtn').onclick = () => {
        document.getElementById('formContainer').classList.remove('is-open');
    };

    cargarGalpones();
});