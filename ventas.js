// --- Variables Globales ---
let listaClientes = [];

// --- Lógica de Carga (BLINDADA) ---

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if(!select) return;
    
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    
    // Solo mostramos lotes disponibles para vender, o todos si prefieres
    lotes.filter(lote => lote.estado === 'disponible').forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      option.dataset.cantidad = lote.cantidad;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes:', error);
  }
}

async function cargarClientes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/clientes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
        listaClientes = await res.json();
        // Si tienes un select simple (backup), lo llenamos también
        // const select = document.getElementById('clienteSelect');
        // if(select) { ... llenar ... }
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error);
  }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // CORRECCIÓN: Añadido granjaId al fetch
    const res = await fetch(`${window.API_URL}/ventas?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');
        // Usamos las relaciones incluidas por el backend
        const nombreLote = venta.Lote ? venta.Lote.loteId : 'N/A';
        const nombreCliente = venta.Cliente ? venta.Cliente.nombre : 'N/A';
        
        tr.innerHTML = `
          <td>${nombreLote}</td>
          <td>${nombreCliente}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>${venta.precio.toFixed(2)}</td>
          <td>${new Date(venta.fecha).toLocaleDateString()}</td>
          <td>
            <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro">Revertir</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No hay ventas registradas.</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nueva Venta';
  document.getElementById('ventaForm').reset();
  document.getElementById('ventaId').value = '';
  document.getElementById('clienteId').value = ''; // Limpiar ID oculto
  // Limpiar el input visual del buscador
  const searchInput = document.getElementById('clienteSearch');
  if(searchInput) searchInput.value = '';
  
  document.getElementById('formTitle').textContent = 'Registrar Venta';
}

// --- Funciones CRUD ---

async function guardarVenta(e) {
  e.preventDefault();
  
  const ventaId = document.getElementById('ventaId').value;
  if (ventaId) {
      alert('Edición no soportada. Revierta la venta y créela de nuevo.');
      return;
  }
  
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const loteId = document.getElementById('loteSelect').value;
  const clienteId = document.getElementById('clienteId').value; // Usamos el ID del buscador

  if (!loteId || !clienteId) {
    alert('Por favor selecciona un Lote y un Cliente válido (de la lista).');
    return;
  }

  const venta = {
    loteId: parseInt(loteId),
    clienteId: parseInt(clienteId),
    cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
    peso: parseFloat(document.getElementById('peso').value),
    precio: parseFloat(document.getElementById('precio').value),
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId // CORRECCIÓN: Enviamos el ID de la granja
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(venta)
    });

    if (!res.ok) {
      const errorText = await res.json();
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
      return;
    }
    
    cerrarFormulario();
    await cargarVentas();
    await cargarLotesForSelect(); // Actualizar stock
    
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres REVERTIR esta venta? Esto devolverá el stock al lote.')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      const res = await fetch(`${window.API_URL}/ventas/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        cargarVentas();
        cargarLotesForSelect();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('Error al revertir venta:', error);
    }
  }
}

// --- LÓGICA DE BÚSQUEDA DE CLIENTE (V 3.1) ---
function setupClienteSearch() {
    const searchInput = document.getElementById('clienteSearch');
    const resultsContainer = document.getElementById('clienteResults');
    const dropdown = document.getElementById('clienteDropdown');
    const hiddenInput = document.getElementById('clienteId');

    if(!searchInput || !resultsContainer) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        hiddenInput.value = ''; // Reset ID si escribe
        
        if (query.length < 1) {
            resultsContainer.innerHTML = '';
            dropdown.classList.remove('is-open');
            return;
        }
        
        const filtrados = listaClientes.filter(c => 
            c.nombre.toLowerCase().includes(query) || 
            c.identificacion.includes(query)
        );
        
        resultsContainer.innerHTML = '';
        if (filtrados.length > 0) {
            filtrados.forEach(c => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `<strong>${c.nombre}</strong> <span>(${c.identificacion})</span>`;
                item.onclick = () => {
                    searchInput.value = c.nombre;
                    hiddenInput.value = c.id;
                    dropdown.classList.remove('is-open');
                };
                resultsContainer.appendChild(item);
            });
            dropdown.classList.add('is-open');
        } else {
            dropdown.classList.remove('is-open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) dropdown.classList.remove('is-open');
    });
}

// --- LÓGICA MODAL RÁPIDO CLIENTE ---
function setupQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    const openBtn = document.getElementById('openQuickAddCliente');
    const closeBtn = document.getElementById('closeQuickAddModal');
    const form = document.getElementById('quickAddForm');

    if(openBtn) openBtn.addEventListener('click', () => modal.classList.add('is-open'));
    if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
    
    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const granjaId = getSelectedGranjaId();
            const nuevoCliente = {
                nombre: document.getElementById('quick_nombre').value,
                tipoIdentificacion: document.getElementById('quick_tipoIdentificacion').value,
                identificacion: document.getElementById('quick_identificacion').value,
                granjaId: granjaId
            };

            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${window.API_URL}/clientes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(nuevoCliente)
                });

                if (res.ok) {
                    const creado = await res.json();
                    modal.classList.remove('is-open');
                    form.reset();
                    await cargarClientes(); // Refrescar lista
                    // Autoseleccionar
                    document.getElementById('clienteSearch').value = creado.nombre;
                    document.getElementById('clienteId').value = creado.id;
                } else {
                    alert('Error al crear cliente');
                }
            } catch(e) { console.error(e); }
        };
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  
  if (granja) {
      const header = document.querySelector('header h1');
      if(header) header.textContent = `Ventas (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');
  const formContainer = document.getElementById('formContainer');

  // Lógica para autocompletar cantidad máxima
  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cantidadInput = document.getElementById('cantidadVendida');
      if (selectedOption && selectedOption.dataset.cantidad) {
         cantidadInput.placeholder = `Máx: ${selectedOption.dataset.cantidad}`;
         // Opcional: cantidadInput.value = selectedOption.dataset.cantidad;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    if(toggleBtn) {
        toggleBtn.style.display = 'block';
        toggleBtn.addEventListener('click', () => {
          const isOpen = formContainer.classList.contains('is-open');
          if (isOpen) {
            cerrarFormulario();
          } else {
            form.reset();
            document.getElementById('ventaId').value = '';
            document.getElementById('formTitle').textContent = 'Registrar Venta';
            abrirFormulario();
          }
        });
    }
    if(cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if(form) form.onsubmit = guardarVenta;
    
    setupClienteSearch();
    setupQuickAddModal();

  } else {
    if(toggleBtn) toggleBtn.style.display = 'none';
  }
  
  cargarLotesForSelect();
  cargarClientes();
  cargarVentas();
});