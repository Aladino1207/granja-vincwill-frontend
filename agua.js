// --- Lógica para agua.js ---

// Copiamos la función para cargar lotes
async function cargarLotesForSelect() {
  try {
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Activo)`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

// Función para cargar los registros de agua
async function cargarAgua() {
  try {
    const res = await fetch(`${window.API_URL}/agua`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const registros = await res.json();
    const tbody = document.getElementById('aguaTableBody');
    if (!tbody) throw new Error('Elemento aguaTableBody no encontrado');
    tbody.innerHTML = '';
    
    if (Array.isArray(registros) && registros.length > 0) {
      registros.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.Lote ? r.Lote.loteId : 'Lote Borrado'}</td>
          <td>${r.cantidad} L</td>
          <td>${new Date(r.fecha).toLocaleDateString()}</td>
          <td>
            <button onclick="eliminarAgua(${r.id})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="4">No hay registros de consumo de agua</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar registros de agua:', error);
    const tbody = document.getElementById('aguaTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="4">Error al cargar datos: ${error.message}</td></tr>`;
  }
}

// Función para guardar un nuevo registro
async function guardarAgua(e) {
  e.preventDefault();
  const registro = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    cantidad: parseFloat(document.getElementById('cantidad').value),
    fecha: document.getElementById('fecha').value
  };
  
  try {
    const res = await fetch(`${window.API_URL}/agua`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(registro)
    });
    if (res.ok) {
      document.getElementById('aguaForm').reset();
      await cargarAgua();
    } else {
      const error = await res.json();
      alert('Error al guardar: ' + error.error);
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión al guardar registro de agua');
  }
}

// Función para eliminar un registro
async function eliminarAgua(id) {
  if (confirm('¿Seguro que quieres eliminar este registro?')) {
    try {
      const res = await fetch(`${window.API_URL}/agua/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        cargarAgua();
      } else {
        alert('Error al eliminar registro');
      }
    } catch (error) {
      alert('Error de conexión al eliminar');
    }
  }
}

// Event Listener principal
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('aguaForm').onsubmit = guardarAgua;
  }
  
  cargarLotesForSelect();
  cargarAgua();
});