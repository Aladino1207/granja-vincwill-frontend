// URL base de la API (ajusta según tu configuración)
const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para cargar lotes:', token); // Depuración
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
    console.log('Token usado:', token); // Depuración
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
  console.log('Intentando guardar venta...'); // Depuración
  // Verificar que todos los elementos existan antes de acceder a .value
  const loteIdInput = document.getElementById('loteId');
  const cantidadVendidaInput = document.getElementById('cantidadVendida');
  const pesoInput = document.getElementById('peso');
  const precioInput = document.getElementById('precio');
  const fechaInput = document.getElementById('fecha');
  const clienteInput = document.getElementById('cliente');

  if (!loteIdInput || !cantidadVendidaInput || !pesoInput || !precioInput || !fechaInput || !clienteInput) {
    console.error('Uno o más campos del formulario no fueron encontrados:', {
      loteId: loteIdInput,
      cantidadVendida: cantidadVendidaInput,
      peso: pesoInput,
      precio: precioInput,
      fecha: fechaInput,
      cliente: clienteInput
    });
    alert('Error: Algunos campos del formulario no están disponibles. Verifica el HTML.');
    return;
  }

  const venta = {
    loteId: parseInt(loteIdInput.value),
    cantidadVendida: parseInt(cantidadVendidaInput.value),
    peso: parseFloat(pesoInput.value),
    precio: parseFloat(precioInput.value),
    fecha: fechaInput.value,
    cliente: clienteInput.value
  };

  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para guardar:', token); // Depuración
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
    console.log('Token usado para editar:', token); // Depuración
    const res = await fetch(`${API_URL}/ventas/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const venta = await res.json();
    document.getElementById('loteId').value = venta.loteId;
    document.getElementById('cantidadVendida').value = venta.cantidadVendida;
    document.getElementById('peso').value = venta.peso;
    document.getElementById('precio').value = venta.precio;
    document.getElementById('fecha').value = venta.fecha.split('T')[0];
    document.getElementById('cliente').value = venta.cliente;
    document.getElementById('ventaForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedVenta = {
        loteId: parseInt(document.getElementById('loteId').value),
        cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
        peso: parseFloat(document.getElementById('peso').value),
        precio: parseFloat(document.getElementById('precio').value),
        fecha: document.getElementById('fecha').value,
        cliente: document.getElementById('cliente').value
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
      console.log('Token usado para eliminar:', token); // Depuración
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
      ventaForm.onsubmit = guardarVenta; // Vincula el evento explícitamente
    } else {
      console.error('Elemento ventaForm no encontrado');
    }
    const ventaTable = document.getElementById('ventaTable');
    if (ventaTable) {
      ventaTable.style.display = 'table';
    } else {
      console.error('Elemento ventaTable no encontrado');
    }
    cargarLotesForSelect(); // Carga lotes en el select
    cargarVentas(); // Carga ventas al iniciar
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