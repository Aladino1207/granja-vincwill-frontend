async function cargarGalpones() {
    try {
        const token = localStorage.getItem('token');
        const granjaId = getSelectedGranjaId();
        const res = await fetch(`${window.API_URL}/galpones?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const tbody = document.getElementById('tablaGalpones');
        tbody.innerHTML = '';

        data.forEach(g => {
            let estadoHTML = '';
            let accionHTML = `<button onclick="eliminarGalpon(${g.id})" class="btn btn-sm btn-peligro">Eliminar</button>`;

            if (g.estado === 'libre') {
                estadoHTML = `<span class="badge-disponible" style="background:#27ae60; color:white; padding:4px 8px; border-radius:4px;">LIBRE</span>`;
                // Aún libre, podemos registrar mantenimiento preventivo
                accionHTML = `
                    <button onclick="abrirMantenimiento(${g.id}, '${g.nombre}')" class="btn btn-sm btn-primario" style="background:#34495e;">Mantenimiento</button>
                    <button onclick="eliminarGalpon(${g.id})" class="btn btn-sm btn-peligro">Eliminar</button>`;
            } else if (g.estado === 'ocupado') {
                estadoHTML = `<span class="badge-ocupado" style="background:#e74c3c; color:white; padding:4px 8px; border-radius:4px;">OCUPADO</span>`;
                accionHTML = `<small>En uso</small>`;
            } else if (g.estado === 'mantenimiento') {
                const fechaLibre = new Date(g.fechaDisponible).toLocaleDateString('es-ES', { timeZone: 'UTC' });
                estadoHTML = `<span class="badge-mantenimiento" style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px;">LIMPIEZA (Hasta: ${fechaLibre})</span>`;
                accionHTML = `
                    <button onclick="abrirMantenimiento(${g.id}, '${g.nombre}')" class="btn btn-sm btn-primario" style="background:#34495e;">Registrar Gasto</button>
                    <button onclick="liberarGalpon(${g.id})" class="btn btn-sm btn-success" style="margin-top:5px;">Liberar</button>`;
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

// --- MÓDULO MANTENIMIENTO ---
async function cargarInventarioParaMantenimiento() {
    try {
        const token = localStorage.getItem('token');
        const granjaId = getSelectedGranjaId();
        const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
        const items = await res.json();
        const select = document.getElementById('inventarioSelect');
        select.innerHTML = '<option value="">Seleccione Insumo</option>';

        const utiles = items.filter(i => i.categoria === 'Cama' || i.categoria === 'Otro' || i.categoria === 'Medicina');

        utiles.forEach(i => {
            const option = document.createElement('option');
            option.value = i.id;
            option.textContent = `${i.producto} (Stock: ${i.cantidad} ${i.unidadMedida})`;
            option.dataset.unidad = i.unidadMedida;
            select.appendChild(option);
        });
    } catch (e) { console.error(e); }
}

function abrirMantenimiento(id, nombre) {
    document.getElementById('mantGalponId').value = id;
    document.getElementById('modalTitle').textContent = `Mantenimiento: ${nombre}`;
    document.getElementById('mantenimientoModal').classList.add('is-open');
    cargarInventarioParaMantenimiento();
}

async function guardarMantenimiento(e) {
    e.preventDefault();
    const granjaId = getSelectedGranjaId();
    const galponId = document.getElementById('mantGalponId').value;
    const tipoGasto = document.getElementById('tipoGasto').value;

    const data = {
        granjaId,
        galponId,
        tipoGasto,
        descripcion: document.getElementById('mantDescripcion').value,
        fecha: document.getElementById('mantFecha').value
    };

    if (tipoGasto === 'Inventario') {
        data.inventarioId = document.getElementById('inventarioSelect').value;
        data.cantidad = document.getElementById('mantCantidad').value;
    } else {
        data.monto = document.getElementById('mantMonto').value;
    }

    try {
        const res = await fetch(`${window.API_URL}/mantenimiento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.getElementById('mantenimientoModal').classList.remove('is-open');
            document.getElementById('mantenimientoForm').reset();
            alert("Gasto registrado correctamente.");
        } else {
            const err = await res.json();
            alert("Error: " + err.error);
        }
    } catch (e) { alert("Error de conexión"); }
}

async function liberarGalpon(id) {
    if (confirm("¿Confirmas que la desinfección ha terminado y el galpón está listo?")) {
        const token = localStorage.getItem('token');
        const granjaId = getSelectedGranjaId(); // Obtenemos el ID

        try {
            const res = await fetch(`${window.API_URL}/galpones/liberar/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                // CORRECCIÓN: Enviamos el granjaId en el cuerpo
                body: JSON.stringify({ granjaId: granjaId })
            });

            if (res.ok) {
                alert("Galpón liberado correctamente.");
                cargarGalpones();
            } else {
                const err = await res.json();
                alert("Error: " + (err.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
        }
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
            document.getElementById('formContainer').classList.remove('is-open');
            document.getElementById('galponForm').reset();
            cargarGalpones();
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
    // 1. Formulario Principal (Galpón)
    const form = document.getElementById('galponForm');
    if (form) form.onsubmit = guardarGalpon;

    // 2. Botones de Toggle (CORRECCIÓN)
    const toggleBtn = document.getElementById('toggleFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const formContainer = document.getElementById('formContainer');

    if (toggleBtn) {
        toggleBtn.onclick = () => {
            formContainer.classList.add('is-open');
            toggleBtn.textContent = 'Cancelar';
        };
    }
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            formContainer.classList.remove('is-open');
            document.getElementById('toggleFormBtn').textContent = 'Nuevo Galpón';
        };
    }

    // 3. Lógica Modal Mantenimiento
    const tipoGasto = document.getElementById('tipoGasto');
    const groupInv = document.getElementById('groupInventario');
    const groupDir = document.getElementById('groupDirecto');

    if (tipoGasto) {
        tipoGasto.addEventListener('change', () => {
            if (tipoGasto.value === 'Inventario') {
                groupInv.style.display = 'grid';
                groupDir.style.display = 'none';
                document.getElementById('inventarioSelect').required = true;
                document.getElementById('mantMonto').required = false;
            } else {
                groupInv.style.display = 'none';
                groupDir.style.display = 'block';
                document.getElementById('inventarioSelect').required = false;
                document.getElementById('mantMonto').required = true;
            }
        });
    }

    const closeMant = document.getElementById('closeMantenimientoModal');
    if (closeMant) {
        closeMant.onclick = () => {
            document.getElementById('mantenimientoModal').classList.remove('is-open');
        };
    }

    const formMant = document.getElementById('mantenimientoForm');
    if (formMant) formMant.onsubmit = guardarMantenimiento;

    // Cargar datos iniciales
    cargarGalpones();
});