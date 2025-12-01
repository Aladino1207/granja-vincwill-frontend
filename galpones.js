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
```

---

### Paso 4: Actualizar `lotes.html` y `lotes.js`

Finalmente, conectamos los cables.

**En `lotes.html`:**
Añade el selector de galpón al principio del formulario.

```html
    < div class="form-group" >
    <label for="galponSelect">Ubicación (Galpón)</label>
    <select id="galponSelect" class="form-control" required>
        <option value="">Cargando galpones...</option>
    </select>
</div >
    ```

**En `lotes.js`:**
Añade la función para cargar galpones y modifica el `guardarLote`.

```javascript
// --- CARGAR GALPONES DISPONIBLES ---
async function cargarGalponesSelect() {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/galpones?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const galpones = await res.json();
    const select = document.getElementById('galponSelect');
    select.innerHTML = '<option value="">Seleccione Galpón</option>';

    galpones.forEach(g => {
        // Visualmente indicamos si está ocupado
        const estadoTexto = g.estado === 'ocupado' ? '(OCUPADO)' : '(Libre)';
        // Podríamos deshabilitarlo si está ocupado:
        const disabled = g.estado === 'ocupado' ? 'disabled' : '';

        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = `${g.nombre} - Capacidad: ${g.capacidad} ${estadoTexto}`;
        if (g.estado === 'ocupado') option.disabled = true; // Bloqueo Frontend

        select.appendChild(option);
    });
}

// ... Dentro de guardarLote ...
const lote = {
    // ...
    galponId: parseInt(document.getElementById('galponSelect').value), // <-- ENVIAR ID
    // ...
};

// ... En DOMContentLoaded ...
cargarGalponesSelect();