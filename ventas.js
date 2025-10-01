
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para cargar lotes:', token);
    const res = await fetch(`${API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id; // Usar id como valor, que es INTEGER en el backend
      option.textContent = `${lote.loteId} (Cantidad: ${lote.cantidad})`;
      option.dataset.cantidad = lote.cantidad;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para cargar ventas:', token);
    if (!token) throw new Error('No autenticado');
    const res = await fetch(`${API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    const ventas = await res.json();
    console.log('Ventas recibidas:', ventas); // Depuración
    const tbody = document.getElementById('ventaTableBody');
    if (!tbody) throw new Error('Elemento ventaTableBody no encontrado');
    tbody.innerHTML = '';
    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${venta.loteId}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>${venta.precio.toFixed(2)}</td>
          <td>${new Date(venta.fecha).toLocaleDateString()}</td>
          <td>${venta.cliente || 'Sin cliente'}</td>
          <td>
            <button onclick="editarVenta(${venta.id})">Editar</button>
            <button onclick="eliminarVenta(${venta.id})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No hay ventas registradas</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar ventas:', error);
    const tbody = document.getElementById('ventaTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7">Error al cargar ventas: ${error.message}</td></tr>`;
  }
}

async function guardarVenta(e) {
  e.preventDefault();
  console.log('Intentando guardar venta...');

  const loteSelect = document.getElementById('loteSelect');
  const loteId = loteSelect.value;
  const cantidadVendida = parseInt(document.getElementById('cantidadVendida').value);
  const peso = parseFloat(document.getElementById('peso').value);
  const precio = parseFloat(document.getElementById('precio').value);
  const fecha = document.getElementById('fecha').value;
  const cliente = document.getElementById('cliente').value || 'Sin cliente';

  console.log('Datos del formulario antes de enviar:', { loteId, cantidadVendida, peso, precio, fecha, cliente }); // Depuración

  if (!loteId || isNaN(cantidadVendida) || isNaN(peso) || isNaN(precio) || !fecha) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  const venta = {
    loteId: parseInt(loteId),
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
    console.log('Respuesta del servidor:', res.status, res.statusText); // Depuración
    const responseText = await res.text();
    console.log('Respuesta cruda:', responseText); // Depuración
    if (!res.ok) {
      const errorData = responseText ? JSON.parse(responseText).error || responseText : 'Error desconocido';
      console.error('Error del servidor:', errorData);
      alert('Error al guardar venta: ' + errorData);
      return;
    }
    const data = JSON.parse(responseText);
    console.log('Venta guardada:', data);
    document.getElementById('ventaForm').reset();
    cargarVentas();
    alert('Venta guardada exitosamente');
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cantidad = selectedOption.dataset.cantidad || 0;
      document.getElementById('cantidadVendida').value = cantidad;
    });
  }
  cargarLotesForSelect();
  cargarVentas();
});

// Funciones para editar y eliminar (implementar si es necesario)
async function editarVenta(id) {
  // Implementación similar a guardarVenta, ajusta según necesites
  console.log('Editar venta ID:', id);
}

async function eliminarVenta(id) {
  // Implementación para eliminar
  console.log('Eliminar venta ID:', id);
}