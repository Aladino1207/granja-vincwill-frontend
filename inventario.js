
async function cargarInventario() {
  
  try {
    const res = await fetch(`${window.API_URL}/inventario`, { // Cambia a window.API_URL
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de /inventario - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    console.log('Datos recibidos de /inventario:', inventario);
    const tbody = document.getElementById('tablaInventario'); // Cambia a tablaInventario
    if (!tbody) throw new Error('Elemento tablaInventario no encontrado');
    tbody.innerHTML = '';
    if (Array.isArray(inventario) && inventario.length > 0) {
      inventario.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.producto || 'N/A'}</td>
          <td>${item.categoria || 'N/A'}</td>
          <td>${item.cantidad || 0}</td>
          <td>${item.costo || 0}</td>
          <td>${item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarInventario(${item.id || 0})">Editar</button>
            <button onclick="eliminarInventario(${item.id || 0})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      console.log('Tabla de inventario rellenada con éxito');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay inventario registrado</td></tr>';
      console.log('Tabla de inventario vacía, mostrando mensaje');
    }
  } catch (error) {
    console.error('Error al cargar inventario:', error);
    const tbody = document.getElementById('tablaInventario');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6">Error al cargar inventario: ${error.message}</td></tr>`;
  }
}

async function guardarInventario(e) {
  e.preventDefault();
  const inventario = {
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    costo: parseFloat(document.getElementById('costo').value),
    fecha: document.getElementById('fecha').value
  };
  console.log('Datos enviados a /inventario:', inventario);
  try {
    const res = await fetch(`${window.API_URL}/inventario`, { // Cambia a window.API_URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(inventario)
    });
    console.log('Respuesta de guardarInventario - Status:', res.status, 'Status Text:', res.statusText);
    const responseText = await res.text();
    console.log('Respuesta cruda de guardarInventario:', responseText);
    if (res.ok) {
      document.getElementById('inventarioForm').reset();
      await cargarInventario();
      console.log('Inventario guardado y tabla recargada');
    } else {
      console.error('Error al guardar inventario - Detalle:', responseText);
      alert('Error al guardar inventario: ' + (responseText || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión o inesperado:', error);
    alert('Error de conexión o inesperado');
  }
}

async function editarInventario(id) {
  try {
    console.log('Intentando editar inventario con id:', id);
    console.log('URL de la solicitud:', `${window.API_URL}/inventario/${id}`);
    console.log('Token enviado:', localStorage.getItem('token'));
    const res = await fetch(`${window.API_URL}/inventario/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de editarInventario - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Detalles del error:', errorText);
      throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
    }
    const item = await res.json();
    console.log('Datos recibidos para edición:', item);
    document.getElementById('producto').value = item.producto;
    document.getElementById('categoria').value = item.categoria;
    document.getElementById('cantidad').value = item.cantidad;
    document.getElementById('costo').value = item.costo;
    document.getElementById('fecha').value = item.fecha.split('T')[0];
    document.getElementById('inventarioForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedItem = {
        producto: document.getElementById('producto').value,
        categoria: document.getElementById('categoria').value,
        cantidad: parseFloat(document.getElementById('cantidad').value),
        costo: parseFloat(document.getElementById('costo').value),
        fecha: document.getElementById('fecha').value
      };
      const putRes = await fetch(`${window.API_URL}/inventario/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedItem)
      });
      console.log('Respuesta de PUT - Status:', putRes.status, 'Status Text:', putRes.statusText);
      if (!putRes.ok) throw new Error(`HTTP error! status: ${putRes.status}`);
      document.getElementById('inventarioForm').reset();
      document.getElementById('inventarioForm').onsubmit = guardarInventario;
      cargarInventario();
    };
  } catch (error) {
    console.error('Error al editar inventario:', error);
    alert('Error al editar inventario: ' + error.message);
  }
}

async function eliminarInventario(id) {
  if (confirm('¿Seguro que quieres eliminar este inventario?')) {
    try {
      console.log('Intentando eliminar inventario con id:', id);
      const res = await fetch(`${window.API_URL}/inventario/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Respuesta de eliminarInventario - Status:', res.status, 'Status Text:', res.statusText);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      cargarInventario();
    } catch (error) {
      console.error('Error al eliminar inventario:', error);
      alert('Error al eliminar inventario: ' + error.message);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    const inventarioForm = document.getElementById('inventarioForm');
    const inventarioTable = document.getElementById('inventarioTable');
    if (inventarioForm) {
      inventarioForm.style.display = 'grid';
      inventarioForm.onsubmit = guardarInventario; // Vincula el evento
    }
    if (inventarioTable) inventarioTable.style.display = 'table';
  }
  cargarInventario();
});