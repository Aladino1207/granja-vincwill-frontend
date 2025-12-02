async function cargarGalpones() {
    try {
        const token = localStorage.getItem('token');
        const granjaId = getSelectedGranjaId();
        // El backend ya revisa las fechas y actualiza estados automáticamente al hacer GET
        const res = await fetch(`${window.API_URL}/galpones?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const tbody = document.getElementById('tablaGalpones');
        tbody.innerHTML = '';

        data.forEach(g => {
            let estadoHTML = '';
            let accionHTML = `<button onclick="eliminarGalpon(${g.id})" class="btn btn-sm btn-peligro">Eliminar</button>`;

            if (g.estado === 'libre') {
                estadoHTML = `<span class="badge-disponible">LIBRE</span>`;
            } else if (g.estado === 'ocupado') {
                estadoHTML = `<span class="badge-ocupado" style="background:#e74c3c; color:white; padding:4px 8px; border-radius:4px;">OCUPADO</span>`;
                // No se puede borrar si está ocupado
                accionHTML = `<button class="btn btn-sm btn-peligro" disabled style="opacity:0.5; cursor:not-allowed;">En Uso</button>`;
            } else if (g.estado === 'mantenimiento') {
                const fechaLibre = new Date(g.fechaDisponible).toLocaleDateString();
                estadoHTML = `<span class="badge-mantenimiento" style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px;">LIMPIEZA (Hasta: ${fechaLibre})</span>`;
                // Botón especial para liberar
                accionHTML = `<button onclick="liberarGalpon(${g.id})" class="btn btn-sm btn-primario" title="Terminar limpieza ahora">Liberar Ahora</button>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${g.nombre}</strong></td>
                    <td>${g.capacidad}</td>
                    <td>${estadoHTML}</td>
                    <td>${accionHTML}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

async function liberarGalpon(id) {
    if (confirm("¿Confirmas que la desinfección ha terminado y el galpón está listo?")) {
        const token = localStorage.getItem('token');
        const granjaId = getSelectedGranjaId();
        try {
            const res = await fetch(`${window.API_URL}/galpones/liberar/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ granjaId })
            });
            if (res.ok) {
                alert("Galpón liberado correctamente.");
                cargarGalpones();
            } else {
                const err = await res.json();
                alert("Error: " + err.error);
            }
        } catch (e) { alert("Error de conexión"); }
    }
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

    const toggleBtn = document.getElementById('toggleFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (toggleBtn) toggleBtn.onclick = () => { document.getElementById('formContainer').classList.add('is-open'); };
    if (cancelBtn) cancelBtn.onclick = () => { document.getElementById('formContainer').classList.remove('is-open'); };

    cargarGalpones();
});