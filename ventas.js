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
    const res = await fetch(`${window.API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    const ventas = await res.json();
    console.log('Ventas recibidas:', ventas);
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
  if (!loteSelect) {
    console.error('Elemento loteSelect no encontrado');
    alert('Error: El select de lotes no está disponible.');
    return;
  }
  const loteId = loteSelect.value;
  const cantidadVendida = parseInt(document.getElementById('cantidadVendida').value);
  const peso = parseFloat(document.getElementById('peso').value);
  const precio = parseFloat(document.getElementById('precio').value);
  const fecha = document.getElementById('fecha').value;
  const cliente = document.getElementById('cliente').value || 'Sin cliente';

  console.log('Datos del formulario antes de enviar:', { loteId, cantidadVendida, peso, precio, fecha, cliente });

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
    console.log('URL de la petición:', `${window.API_URL}/ventas`);
    const startTime = Date.now();
    const res = await fetch(`${window.API_URL}/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(venta)
    });
    const endTime = Date.now();
    console.log(`Tiempo de respuesta: ${endTime - startTime}ms`);
    console.log('Respuesta del servidor antes de texto:', res.status, res.statusText);
    const responseText = await res.text();
    console.log('Respuesta cruda:', responseText);
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

async function editarVenta(id) {
  try {
    console.log('Intentando editar venta con id:', id);
    const res = await fetch(`${window.API_URL}/ventas/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de editarVenta - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const venta = await res.json();
    console.log('Datos recibidos para edición:', venta);
    document.getElementById('loteSelect').value = venta.loteId;
    document.getElementById('cantidadVendida').value = venta.cantidadVendida;
    document.getElementById('peso').value = venta.peso;
    document.getElementById('precio').value = venta.precio;
    document.getElementById('fecha').value = venta.fecha.split('T')[0];
    document.getElementById('cliente').value = venta.cliente || '';
    document.getElementById('ventaForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedVenta = {
        loteId: parseInt(document.getElementById('loteSelect').value),
        cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
        peso: parseFloat(document.getElementById('peso').value),
        precio: parseFloat(document.getElementById('precio').value),
        fecha: document.getElementById('fecha').value,
        cliente: document.getElementById('cliente').value || 'Sin cliente'
      };
      const putRes = await fetch(`${window.API_URL}/ventas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedVenta)
      });
      console.log('Respuesta de PUT - Status:', putRes.status, 'Status Text:', putRes.statusText);
      if (putRes.ok) {
        document.getElementById('ventaForm').reset();
        document.getElementById('ventaForm').onsubmit = guardarVenta;
        cargarVentas();
      } else {
        throw new Error(`HTTP error! status: ${putRes.status}`);
      }
    };
  } catch (error) {
    console.error('Error al editar venta:', error);
    alert('Error al editar venta: ' + error.message);
  }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres eliminar esta venta?')) {
    try {
      console.log('Intentando eliminar venta con id:', id);
      const res = await fetch(`${window.API_URL}/ventas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Respuesta de eliminarVenta - Status:', res.status, 'Status Text:', res.statusText);
      if (res.ok) {
        cargarVentas();
      } else {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (error) {
      console.error('Error al eliminar venta:', error);
      alert('Error al eliminar venta: ' + error.message);
    }
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

// Vincula el evento submit al formulario
document.getElementById('ventaForm').onsubmit = guardarVenta;