let listaProveedores = [];

console.log("inventario.js cargado");

// --- Lógica de Carga ---
async function cargarInventario() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    const tbody = document.getElementById('tablaInventario');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (inventario.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay inventario registrado en esta granja.</td></tr>';
      return;
    }

    inventario.forEach(item => {
      const tr = document.createElement('tr');
      const unidad = item.unidadMedida || 'Unidades';
      const totalEstimado = (item.cantidad * item.costo).toFixed(2);

      // Fecha corregida
      const fechaVisual = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : '-';

      // --- CORRECCIÓN VISUAL DE DECIMALES ---
      // Si tiene decimales largos, corta a 4. Si termina en ceros (ej: 10.0000), los quita.
      const cantidadVisual = parseFloat(item.cantidad).toFixed(4).replace(/\.?0+$/, "");

      // Botón "Agregar Stock" (+)
      const btnReabastecer = `
        <button onclick="abrirModalReabastecer(${item.id}, '${item.producto}', '${unidad}', ${item.proveedorId})" 
                class="btn btn-sm" 
                style="background-color: #27ae60; color: white; margin-right: 5px;" 
                title="Agregar Stock / Comprar Más">
            + Stock
        </button>
      `;

      // Botón Eliminar
      const btnEliminar = `
        <button onclick="eliminarInventario(${item.id})" class="btn btn-sm btn-peligro" title="Eliminar Producto">🗑️</button>
      `;

      tr.innerHTML = `
        <td><strong>${item.producto}</strong></td>
        <td>${item.Proveedor ? item.Proveedor.nombreCompania : '-'}</td>
        <td><span class="badge">${item.categoria}</span></td>
        <!-- AQUÍ SE APLICA LA VISUALIZACIÓN LIMPIA -->
        <td style="font-weight: bold; color: #2c3e50;">${cantidadVisual} ${unidad}</td>
        <td>$${parseFloat(item.costo).toFixed(2)}</td>
        <td>$${totalEstimado}</td>
        <td>${fechaVisual}</td>
        <td>
          <div style="display: flex;">
            ${btnReabastecer}
            ${btnEliminar}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

async function cargarProveedores() {
  try {
    const token = localStorage.getItem('token');
    // Proveedores son globales o por granja, el backend lo maneja
    const res = await fetch(`${window.API_URL}/proveedores`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      listaProveedores = await res.json();
      llenarSelectProveedores('proveedorSelect');
      llenarSelectProveedores('reab_proveedor'); // Llenar también el select del modal
    }
  } catch (e) { console.error(e); }
}

function llenarSelectProveedores(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  // Mantener la primera opción
  const firstOption = select.options[0];
  select.innerHTML = '';
  select.appendChild(firstOption);

  listaProveedores.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.nombreCompania;
    select.appendChild(option);
  });
}

// ==========================================
// 2. CREAR PRODUCTO (AHORA SOLO CATALOGO)
// ==========================================

async function guardarInventario(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const inventario = {
    granjaId,
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    proveedorId: document.getElementById('proveedorSelect').value || null,
    unidadMedida: document.getElementById('unidadMedida').value,

    // VALORES POR DEFECTO PARA CREACIÓN
    cantidad: 0,
    costo: 0,
    costoTotal: 0,
    fecha: new Date().toISOString() // Fecha de creación del registro
  };

  try {
    const res = await fetch(`${window.API_URL}/inventario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(inventario)
    });

    if (res.ok) {
      alert('Producto creado. Ahora usa "+ Stock" para ingresar compras.');
      cerrarFormulario();
      cargarInventario();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  } catch (error) { console.error(error); alert("Error de conexión"); }
}

async function eliminarInventario(id) {
  if (confirm('¿Eliminar este producto y todo su historial de stock?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/inventario/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarInventario();
    } catch (error) { console.error(error); }
  }
}

// ==========================================
// 3. LÓGICA DE REABASTECIMIENTO (+ STOCK)
// ==========================================

function abrirModalReabastecer(id, nombreProducto, unidad, proveedorIdActual) {
  const modal = document.getElementById('reabastecerModal');
  if (!modal) {
    alert("Error: No se encuentra el modal de reabastecimiento en el HTML.");
    return;
  }

  // Llenar datos ocultos y visuales
  document.getElementById('reabastecerId').value = id;

  const infoEl = document.getElementById('reabastecerInfo');
  if (infoEl) infoEl.textContent = `Producto: ${nombreProducto}`;

  const unidadEl = document.getElementById('reabastecerUnidad');
  if (unidadEl) unidadEl.textContent = unidad;

  // Resetear formulario del modal
  document.getElementById('reab_cantidad').value = '';
  document.getElementById('reab_costoTotal').value = '';
  document.getElementById('reab_factura').value = '';

  // Seleccionar proveedor actual por defecto si existe
  const selectProv = document.getElementById('reab_proveedor');
  if (selectProv && proveedorIdActual) selectProv.value = proveedorIdActual;

  modal.classList.add('is-open');
}

function cerrarModalReabastecer() {
  const modal = document.getElementById('reabastecerModal');
  if (modal) modal.classList.remove('is-open');
}

async function guardarReabastecimiento(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  const id = document.getElementById('reabastecerId').value;

  // Validación Numérica Segura (Igual que en Cargar)
  const cantidadNueva = parseFloat(document.getElementById('reab_cantidad').value);
  const costoTotalCompra = parseFloat(document.getElementById('reab_costoTotal').value);

  if (isNaN(cantidadNueva) || cantidadNueva <= 0) {
    return alert("Por favor ingresa una cantidad válida mayor a 0.");
  }
  if (isNaN(costoTotalCompra) || costoTotalCompra < 0) {
    return alert("Por favor ingresa un costo válido.");
  }

  const payload = {
    cantidadNueva: cantidadNueva,
    costoTotalCompra: costoTotalCompra,
    proveedorId: document.getElementById('reab_proveedor').value || null,
    numeroFactura: document.getElementById('reab_factura').value,
    granjaId: granjaId
  };

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    const txtOriginal = btn.textContent;
    btn.textContent = "Procesando...";
    btn.disabled = true;

    const res = await fetch(`${window.API_URL}/inventario/${id}/reabastecer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      // Formateo visual para el mensaje de éxito
      const nuevoStock = parseFloat(data.nuevoStock).toFixed(4).replace(/\.?0+$/, "");
      const nuevoCosto = parseFloat(data.nuevoCosto).toFixed(4);

      alert(`✅ Stock actualizado.\n\nNuevo Stock Total: ${nuevoStock}\nNuevo Costo Promedio: $${nuevoCosto}`);

      cerrarModalReabastecer();
      cargarInventario(); // Recargar la tabla principal
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || "No se pudo actualizar"));
    }

    btn.textContent = txtOriginal;
    btn.disabled = false;

  } catch (err) {
    console.error(err);
    alert("Error de conexión");
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
      btn.textContent = "Confirmar Compra e Ingreso";
      btn.disabled = false;
    }
  }
}

// --- UI Helpers ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Nuevo Producto';
  document.getElementById('inventarioForm').reset();
}

// --- Proveedor Rápido ---
function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const btnOpen = document.getElementById('btnQuickAddProveedor');
  const btnClose = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');

  if (btnOpen) btnOpen.onclick = () => modal.classList.add('is-open');
  if (btnClose) btnClose.onclick = () => modal.classList.remove('is-open');

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      // ... (Lógica existente de quick add - simplificada aquí)
      alert("Función Proveedor Rápido pendiente de integrar con backend global");
      modal.classList.remove('is-open');
    };
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) document.querySelector('header h1').textContent = `Inventario (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('inventarioForm');

  // Modal Reabastecer listeners
  const closeReab = document.getElementById('closeReabastecerModal');
  const formReab = document.getElementById('reabastecerForm');
  if (closeReab) closeReab.onclick = cerrarModalReabastecer;
  if (formReab) formReab.onsubmit = guardarReabastecimiento;

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.onclick = () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else abrirFormulario();
      };
    }
    if (cancelBtn) cancelBtn.onclick = cerrarFormulario;
    if (form) form.onsubmit = guardarInventario;

    setupQuickAddModal();
  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarProveedores();
  cargarInventario();
});