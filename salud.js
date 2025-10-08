async function cargarSalud() {
  try {
    const res = await fetch(`${window.API_URL}/salud`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de /salud - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const salud = await res.json();
    console.log('Datos recibidos de /salud:', salud);
    const tbody = document.getElementById('saludTableBody');
    if (!tbody) throw new Error('Elemento saludTableBody no encontrado');
    tbody.innerHTML = ''; // Limpia la tabla antes de rellenar
    console.log('Intentando rellenar tabla con', salud.length, 'registros');
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
      console.log('Tabla rellenada con éxito');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay eventos de salud registrados</td></tr>';
      console.log('Tabla vacía, mostrando mensaje');
    }
  } catch (error) {
    console.error('Error al cargar salud:', error);
    const tbody = document.getElementById('saludTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6">Error al cargar salud: ${error.message}</td></tr>`;
  }
}

async function cargarLotesForSelect() {
  try {
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteId'); // Cambiado a 'loteId' para coincidir con salud.html
    if (!select) throw new Error('Elemento loteId no encontrado');
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
  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: document.getElementById('tipo').value,
    nombre: document.getElementById('nombre').value,
    cantidad: parseFloat(document.getElementById('cantidad').value), // Cambiado a parseFloat para consistencia
    fecha: document.getElementById('fecha').value
  };
  try {
    const res = await fetch(`${window.API_URL}/salud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(salud)
    });
    console.log('Respuesta de guardarSalud - Status:', res.status, 'Status Text:', res.statusText);
    if (res.ok) {
      document.getElementById('saludForm').reset();
      await cargarSalud(); // Asegúrate de esperar la recarga
      console.log('Evento de salud guardado y tabla recargada');
    } else {
      const errorText = await res.text();
      console.error('Error al guardar evento de salud:', errorText);
      alert('Error al guardar evento de salud: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

async function editarSalud(id) {
  try {
    const res = await fetch(`${window.API_URL}/salud/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de GET /salud/:id - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const s = await res.json();
    console.log('Datos recibidos para edición:', s);
    document.getElementById('loteId').value = s.loteId;
    document.getElementById('tipo').value = s.tipo;
    document.getElementById('nombre').value = s.nombre;
    document.getElementById('cantidad').value = s.cantidad;
    document.getElementById('fecha').value = s.fecha.split('T')[0];
    document.getElementById('saludForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedSalud = {
        loteId: parseInt(document.getElementById('loteId').value),
        tipo: document.getElementById('tipo').value,
        nombre: document.getElementById('nombre').value,
        cantidad: parseFloat(document.getElementById('cantidad').value),
        fecha: document.getElementById('fecha').value
      };
      const putRes = await fetch(`${window.API_URL}/salud/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedSalud)
      });
      console.log('Respuesta de PUT /salud/:id - Status:', putRes.status, 'Status Text:', putRes.statusText);
      if (putRes.ok) {
        document.getElementById('saludForm').reset();
        document.getElementById('saludForm').onsubmit = guardarSalud;
        await cargarSalud();
        console.log('Evento de salud actualizado y tabla recargada');
      } else {
        const errorText = await putRes.text();
        console.error('Error al actualizar evento de salud:', errorText);
        alert('Error al actualizar evento de salud: ' + (errorText || 'Desconocido'));
      }
    };
  } catch (error) {
    console.error('Error al editar salud:', error);
    alert('Error al editar evento de salud: ' + error.message);
  }
}

async function eliminarSalud(id) {
  if (confirm('¿Seguro que quieres eliminar este evento de salud?')) {
    try {
      const res = await fetch(`${window.API_URL}/salud/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Respuesta de DELETE /salud/:id - Status:', res.status, 'Status Text:', res.statusText);
      if (res.ok) {
        await cargarSalud();
        console.log('Evento de salud eliminado y tabla recargada');
      } else {
        const errorText = await res.text();
        console.error('Error al eliminar evento de salud:', errorText);
        alert('Error al eliminar evento de salud: ' + (errorText || 'Desconocido'));
      }
    } catch (error) {
      console.error('Error al eliminar salud:', error);
      alert('Error al eliminar evento de salud');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const saludForm = document.getElementById('saludForm');
  const saludTable = document.getElementById('saludTable');
  
  console.log('Verificando elementos - saludForm:', saludForm, 'saludTable:', saludTable);

  if (currentUser && currentUser.role !== 'viewer') {
    if (saludForm) {
      saludForm.style.display = 'grid';
    } else {
      console.error('Elemento saludForm no encontrado en el DOM');
    }
    if (saludTable) {
      saludTable.style.display = 'table';
    } else {
      console.error('Elemento saludTable no encontrado en el DOM');
    }
  } else {
    console.log('Rol de usuario:', currentUser ? currentUser.role : 'No autenticado');
  }
  cargarLotesForSelect();
  cargarSalud();
});