
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
      option.value = lote.loteId;
      option.textContent = lote.loteId + ' (Cantidad: ' + lote.cantidad + ')'; // Mostrar cantidad en la opción
      option.dataset.cantidad = lote.cantidad; // Almacenar cantidad para auto-relleno
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
        <td>${venta.cantidadVendida}</td>
        <td>${venta.peso}</td>
        <td>${venta.precio}</td>
        <td>${new Date(venta.fecha).toLocaleDateString()}</td>
        <td>${venta.cliente}</td>
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
  const loteId = document.getElementById('loteSelect').value;
  const cantidadVendida = parseInt(document.getElementById('cantidadVendida').value);
  const peso = parseFloat(document.getElementById('peso').value);
  const precio = parseFloat(document.getElementById('precio').value);
  const fecha = document.getElementById('fecha').value;
  const cliente = document.getElementById('cliente').value;

  if (!loteId || isNaN(cantidadVendida) || isNaN(peso) || isNaN(precio) || !fecha) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  const venta = {
    loteId,
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

// Evento para auto-rellenar cantidadVendida al seleccionar un lote
document.addEventListener('DOMContentLoaded', () => {
  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cantidad = selectedOption.dataset.cantidad || 0;
      document.getElementById('cantidadVendida').value = cantidad;
    });
  }
  cargarLotesForSelect(); // Llama a la función para llenar el select
  cargarVentas(); // Llama a la función para llenar la tabla
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