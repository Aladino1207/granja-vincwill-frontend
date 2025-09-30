
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para cargar lotes:', token);
    const res = await fetch(`${API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteId');
    if (!select) throw new Error('Elemento loteId no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = lote.loteId;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado:', token);
    const res = await fetch(`${API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');
    if (!tbody) throw new Error('Elemento ventaTableBody no encontrado');
    tbody.innerHTML = '';
    ventas.forEach(venta => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${venta.loteId}</td>
        <td>${venta.cantidadVendida || 0}</td>
        <td>${venta.peso || 0}</td>
        <td>${venta.precio || 0}</td>
        <td>${new Date(venta.fecha).toLocaleDateString()}</td>
        <td>${venta.cliente || 'Sin cliente'}</td>
        <td>
          <button onclick="editarVenta(${venta.id})">Editar</button>
          <button onclick="eliminarVenta(${venta.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}

async function guardarVenta(e) {
  e.preventDefault();
  console.log('Intentando guardar venta...');

  const loteId = document.getElementById('loteId').value; // Asegurarse de que sea string
  const cantidadVendida = parseInt(document.getElementById('cantidadVendida').value);
  const peso = parseFloat(document.getElementById('peso').value);
  const precio = parseFloat(document.getElementById('precio').value);
  const fecha = document.getElementById('fecha').value;
  const cliente = document.getElementById('cliente')?.value || null;

  if (!loteId || isNaN(cantidadVendida) || isNaN(peso) || isNaN(precio) || !fecha) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  const venta = {
    loteId: loteId.toString(), // Forzar a string
    cantidadVendida,
    peso,
    precio,
    fecha,
    cliente
  };

  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para guardar:', token);
    console.log('Datos enviados:', venta);
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(venta)
    });
    if (res.ok) {
      document.getElementById('ventaForm').reset();
      cargarVentas(); // Asegúrate de tener esta función
      console.log('Venta guardada exitosamente');
    } else {
      const errorData = await res.json();
      console.error('Error del servidor:', errorData);
      alert('Error al guardar venta: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

  const venta = {
    loteId: parseInt(loteIdInput.value) || null,
    cantidadVendida: parseInt(cantidadVendidaInput.value) || 0, // Valor por defecto si está vacío
    peso: parseFloat(pesoInput.value) || 0,
    precio: parseFloat(precioInput.value) || 0,
    fecha: fechaInput.value || new Date().toISOString().split('T')[0],
    cliente: clienteInput.value || 'Sin cliente'
  };

  if (!venta.loteId) {
    alert('Por favor, selecciona un lote.');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para guardar:', token);
    console.log('Datos enviados:', venta); // Depuración
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(venta)
    });
    if (res.ok) {
      document.getElementById('ventaForm').reset();
      cargarVentas();
      console.log('Venta guardada exitosamente');
    } else {
      const errorData = await res.json();
      console.error('Error del servidor:', errorData);
      alert('Error al guardar venta: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

async function editarVenta(id) {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para editar:', token);
    const res = await fetch(`${API_URL}/ventas/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const venta = await res.json();
    document.getElementById('loteId').value = venta.loteId;
    document.getElementById('cantidadVendida').value = venta.cantidadVendida || 0;
    document.getElementById('peso').value = venta.peso || 0;
    document.getElementById('precio').value = venta.precio || 0;
    document.getElementById('fecha').value = venta.fecha.split('T')[0];
    document.getElementById('cliente').value = venta.cliente || '';
    document.getElementById('ventaForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedVenta = {
        loteId: parseInt(document.getElementById('loteId').value),
        cantidadVendida: parseInt(document.getElementById('cantidadVendida').value) || 0,
        peso: parseFloat(document.getElementById('peso').value) || 0,
        precio: parseFloat(document.getElementById('precio').value) || 0,
        fecha: document.getElementById('fecha').value,
        cliente: document.getElementById('cliente').value || ''
      };
      await fetch(`${API_URL}/ventas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedVenta)
      });
      document.getElementById('ventaForm').reset();
      document.getElementById('ventaForm').onsubmit = guardarVenta;
      cargarVentas();
    };
  } catch (error) {
    console.error('Error al editar venta:', error);
  }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres eliminar esta venta?')) {
    try {
      const token = localStorage.getItem('token');
      console.log('Token usado para eliminar:', token);
      await fetch(`${API_URL}/ventas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarVentas();
    } catch (error) {
      alert('Error al eliminar venta');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && ['admin', 'empleado'].includes(currentUser.role)) {
    const ventaForm = document.getElementById('ventaForm');
    if (ventaForm) {
      ventaForm.style.display = 'grid';
      ventaForm.onsubmit = guardarVenta;
    } else {
      console.error('Elemento ventaForm no encontrado');
    }
    const ventaTable = document.getElementById('ventaTable');
    if (ventaTable) {
      ventaTable.style.display = 'table';
    } else {
      console.error('Elemento ventaTable no encontrado');
    }
    cargarLotesForSelect();
    cargarVentas();
  } else if (currentUser) {
    document.querySelector('main').innerHTML = `
      <section>
        <h2>Acceso Denegado</h2>
        <p>Solo los usuarios con rol de Administrador o Empleado pueden gestionar ventas.</p>
        <a href="index.html">Volver al Dashboard</a>
      </section>
    `;
  } else {
    console.error('Usuario no autenticado o rol no válido');
  }
});