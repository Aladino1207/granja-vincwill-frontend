
async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para cargar salud:', token);
    const res = await fetch(`${window.API_URL}/salud`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const salud = await res.json();
    console.log('Datos recibidos de /salud:', salud);
    const tbody = document.getElementById('saludTableBody');
    if (!tbody) throw new Error('Elemento saludTableBody no encontrado');
    tbody.innerHTML = '';
    if (Array.isArray(salud) && salud.length > 0) {
      salud.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.loteId || 'N/A'}</td>
          <td>${s.tipo || 'N/A'}</td>
          <td>${s.nombre || 'N/A'}</td>
          <td>${s.cantidad || 0}</td>
          <td>${s.fecha ? new Date(s.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarSalud(${s.id || 0})">Editar</button>
            <button onclick="eliminarSalud(${s.id || 0})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay eventos de salud registrados</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar salud:', error);
    const tbody = document.getElementById('saludTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6">Error al cargar salud: ${error.message}</td></tr>`;
  }
}

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para cargar lotes:', token);
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Cantidad: ${lote.cantidad})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

async function guardarSalud(e) {
  e.preventDefault();
  console.log('Intentando guardar evento de salud...');

  const loteId = parseInt(document.getElementById('loteSelect').value);
  const tipo = document.getElementById('tipo').value;
  const nombre = document.getElementById('nombre').value;
  const cantidad = parseFloat(document.getElementById('cantidad').value);
  const fecha = document.getElementById('fecha').value;

  console.log('Datos del formulario antes de enviar:', { loteId, tipo, nombre, cantidad, fecha });

  if (!loteId || !tipo || !nombre || isNaN(cantidad) || !fecha) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  const salud = { loteId, tipo, nombre, cantidad, fecha };

  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para guardar:', token);
    console.log('Datos enviados:', salud);
    const res = await fetch(`${window.API_URL}/salud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(salud)
    });
    console.log('Respuesta de guardarSalud - Status:', res.status, 'Status Text:', res.statusText);
    if (res.ok) {
      document.getElementById('saludForm').reset();
      await cargarSalud();
      console.log('Evento de salud guardado y tabla recargada');
    } else {
      const errorText = await res.text();
      console.error('Error al guardar evento de salud - Detalle:', errorText);
      alert('Error al guardar evento de salud: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión o inesperado:', error);
    alert('Error de conexión o inesperado');
  }
}

async function editarSalud(id) {
  console.log('Editar salud ID:', id);
  alert('Edición no implementada. Necesita endpoint GET /salud/:id y PUT /salud/:id.');
}

async function eliminarSalud(id) {
  console.log('Eliminar salud ID:', id);
  alert('Eliminación no implementada. Necesita endpoint DELETE /salud/:id.');
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    const saludForm = document.getElementById('saludForm');
    const saludTable = document.getElementById('saludTable');
    if (saludForm) saludForm.style.display = 'grid';
    if (saludTable) saludTable.style.display = 'table';
  }
  cargarLotesForSelect();
  cargarSalud();
});

document.getElementById('saludForm').onsubmit = guardarSalud;