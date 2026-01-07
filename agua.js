// --- Variables Globales ---
let inventarioTratamiento = []; // Solo Medicinas y Vacunas

// ==========================================
// 1. CARGA DE DATOS E INVENTARIO
// ==========================================

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
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    // FILTRO: Disponibles u Ocupados
    const lotesActivos = lotes.filter(l => l.estado === 'disponible' || l.estado === 'ocupado');

    if (lotesActivos.length === 0) {
      select.innerHTML = '<option value="">No hay lotes activos</option>';
      return;
    }

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes:', error);
  }
}

// Carga productos para el tratamiento (Solo Medicina y Vacuna)
async function cargarInventarioTratamiento() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const items = await res.json();
      // FILTRO ESTRICTO: Solo Medicina y Vacuna (Excluye 'Otro', 'Alimento', etc.)
      inventarioTratamiento = items.filter(i => ['Medicina', 'Vacuna'].includes(i.categoria));
    }
  } catch (e) { console.error("Error cargando inventario:", e); }
}

async function cargarAgua() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/agua?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('aguaTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No hay registros.</td></tr>';
      return;
    }

    data.forEach(a => {
      const tr = document.createElement('tr');
      // Intentamos mostrar el nombre del lote si viene populado
      const loteNombre = a.Lote ? a.Lote.loteId : (a.loteId || 'N/A');

      tr.innerHTML = `
        <td>${loteNombre}</td>
        <td>${a.cantidad} L</td>
        <td>${new Date(a.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="eliminarAgua(${a.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

// ==========================================
// 2. LÓGICA DE FILAS DINÁMICAS (TRATAMIENTO)
// ==========================================

function agregarFilaTratamiento() {
  const container = document.getElementById('treatmentContainer');
  const rowId = Date.now(); // ID único temporal

  const div = document.createElement('div');
  div.className = 'treatment-row';
  div.id = `row-${rowId}`;

  // 1. Selector de Producto
  let options = '<option value="">Seleccione...</option>';
  inventarioTratamiento.forEach(item => {
    // Guardamos datos clave en dataset
    options += `<option value="${item.id}" 
                            data-unidad="${item.unidadMedida || 'Unidades'}" 
                            data-stock="${item.cantidad}"
                            data-nombre="${item.producto}">
                        ${item.producto} (Stock: ${item.cantidad} ${item.unidadMedida || ''})
                    </option>`;
  });

  div.innerHTML = `
        <!-- Producto -->
        <div>
            <select class="form-control prod-select" onchange="actualizarFila(${rowId})">
                ${options}
            </select>
            <small class="stock-info" style="color: #e67e22; font-size: 0.8em;"></small>
        </div>

        <!-- Dosis -->
        <div>
            <input type="number" class="form-control dosis-input" step="0.001" placeholder="0.00" oninput="actualizarFila(${rowId})">
        </div>

        <!-- Unidad Dosis -->
        <div>
            <select class="form-control unit-select" onchange="actualizarFila(${rowId})">
                <option value="g">Gramos (g)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="lb">Libras (lb)</option>
                <option value="l">Litros (l)</option>
                <option value="kg">Kilos (kg)</option>
                <option value="cc">cc</option>
            </select>
        </div>

        <!-- Total Calculado (Read Only) -->
        <div>
            <input type="text" class="form-control total-display" readonly placeholder="0.00" style="background: #e9ecef;">
        </div>

        <!-- Botón Borrar -->
        <div>
            <button type="button" class="btn btn-peligro btn-sm" onclick="eliminarFila(${rowId})" title="Quitar">×</button>
        </div>
    `;

  container.appendChild(div);
}

function eliminarFila(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (row) row.remove();
}

function actualizarFila(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (!row) return;

  const litrosAgua = parseFloat(document.getElementById('cantidadAgua').value) || 0;
  const dosis = parseFloat(row.querySelector('.dosis-input').value) || 0;
  const unidadDosis = row.querySelector('.unit-select').value;
  const totalDisplay = row.querySelector('.total-display');
  const selectProd = row.querySelector('.prod-select');
  const stockInfo = row.querySelector('.stock-info');

  // 1. Mostrar Stock seleccionado
  if (selectProd.selectedIndex > 0) {
    const opt = selectProd.options[selectProd.selectedIndex];
    stockInfo.textContent = `Disp: ${opt.dataset.stock} ${opt.dataset.unidad}`;
  } else {
    stockInfo.textContent = '';
  }

  // 2. Calcular Total
  // Formula: Litros Agua * Dosis
  const totalNecesario = litrosAgua * dosis;

  // Mostrar resultado preliminar
  if (totalNecesario > 0) {
    totalDisplay.value = `${totalNecesario.toFixed(4)} ${unidadDosis}`;
  } else {
    totalDisplay.value = '';
  }
}

// Recalcular TODAS las filas cuando cambian los litros de agua
function recalcularTodosTotales() {
  const rows = document.querySelectorAll('.treatment-row');
  rows.forEach(row => {
    const idPart = row.id.split('-')[1];
    actualizarFila(idPart);
  });
}

// ==========================================
// 3. CONVERSOR DE UNIDADES (Reutilizado de Salud)
// ==========================================
function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || unidadInput === 'base') return cantidadInput;

  const uIn = unidadInput.toLowerCase().trim().replace(/s$/, '');
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, '');

  if (uIn === uBase) return cantidadInput;

  // --- PESO ---
  if (uBase === 'lb' || uBase === 'libra') {
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput * 2.20462;
    if (uIn === 'g' || uIn === 'gr' || uIn === 'gramo') return cantidadInput / 453.592;
    if (uIn === 'oz') return cantidadInput / 16;
  }
  if (uBase === 'kg' || uBase === 'kilo') {
    if (uIn === 'g' || uIn === 'gr') return cantidadInput / 1000;
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 2.20462;
  }
  if (uBase === 'g' || uBase === 'gramo') {
    if (uIn === 'kg') return cantidadInput * 1000;
    if (uIn === 'lb') return cantidadInput * 453.592;
  }

  // --- VOLUMEN ---
  if (uBase === 'l' || uBase === 'litro' || uBase === 'lt') {
    if (uIn === 'ml' || uIn === 'cc' || uIn === 'mililitro') return cantidadInput / 1000;
    if (uIn === 'gal') return cantidadInput * 3.785;
  }
  if (uBase === 'ml' || uBase === 'cc') {
    if (uIn === 'l' || uIn === 'litro') return cantidadInput * 1000;
  }

  return cantidadInput;
}

// ==========================================
// 4. GUARDADO MAESTRO (AGUA + SALUD)
// ==========================================

async function guardarTodo(e) {
  e.preventDefault();

  // --- A. VALIDACIÓN PREVIA ---
  const granjaId = getSelectedGranjaId();
  const token = localStorage.getItem('token');
  const loteId = document.getElementById('loteSelect').value;
  const cantidadAgua = parseFloat(document.getElementById('cantidadAgua').value);
  const fecha = document.getElementById('fecha').value;

  if (!loteId || !cantidadAgua || !fecha) return alert("Completa los datos del agua");

  // Recolectar Tratamientos
  const filas = document.querySelectorAll('.treatment-row');
  const tratamientosAProcesar = [];

  for (let row of filas) {
    const select = row.querySelector('.prod-select');
    const dosisVal = parseFloat(row.querySelector('.dosis-input').value);
    const unidadDosis = row.querySelector('.unit-select').value;

    if (select.value && dosisVal > 0) {
      const opt = select.options[select.selectedIndex];
      const stock = parseFloat(opt.dataset.stock);
      const unidadBase = opt.dataset.unidad;
      const nombreProd = opt.dataset.nombre;

      // Calculamos el total real necesario
      const totalRequeridoInput = cantidadAgua * dosisVal;
      // Convertimos a unidad base
      const cantidadFinalBase = calcularCantidadBase(totalRequeridoInput, unidadDosis, unidadBase);

      if (cantidadFinalBase > (stock + 0.0001)) {
        return alert(`❌ Stock Insuficiente para ${nombreProd}.\nNecesitas: ${cantidadFinalBase.toFixed(4)} ${unidadBase}\nTienes: ${stock}`);
      }

      tratamientosAProcesar.push({
        inventarioId: parseInt(select.value),
        productoAplicado: nombreProd,
        cantidad: cantidadFinalBase,
        tipo: 'Tratamiento' // Categoría fija para esto
      });
    }
  }

  // --- B. ENVIAR DATOS ---
  try {
    const btn = document.querySelector('button[type="submit"]');
    btn.textContent = "Guardando...";
    btn.disabled = true;

    // 1. Guardar Agua
    const aguaPayload = { granjaId, loteId, cantidad: cantidadAgua, fecha };
    const resAgua = await fetch(`${window.API_URL}/agua`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(aguaPayload)
    });

    if (!resAgua.ok) throw new Error("Error guardando el agua");

    // 2. Guardar Tratamientos (Iterativo)
    // Nota: Idealmente el backend soportaría bulkCreate, pero usaremos un loop seguro por ahora
    for (let trat of tratamientosAProcesar) {
      const saludPayload = {
        granjaId,
        loteId,
        tipo: 'Tratamiento',
        nombre: `Tratamiento Agua (${cantidadAgua}L)`,
        productoAplicado: trat.productoAplicado,
        cantidad: trat.cantidad,
        inventarioId: trat.inventarioId,
        fecha: fecha,
        descripcion: `Aplicado automáticamente desde módulo Agua`
      };

      await fetch(`${window.API_URL}/salud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(saludPayload)
      });
    }

    alert("Registro de Agua y Tratamientos guardado exitosamente.");
    cerrarFormulario();
    cargarAgua();
    cargarInventarioTratamiento(); // Refrescar stocks en memoria

  } catch (error) {
    console.error(error);
    alert("Error en el proceso de guardado: " + error.message);
  } finally {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = "Guardar Todo"; btn.disabled = false; }
  }
}

async function eliminarAgua(id) {
  if (confirm('¿Eliminar registro?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/agua/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarAgua();
    } catch (error) {
      alert('Error de conexión al eliminar');
    }
  }
}

// --- UI Helpers ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
  // Poner fecha hoy por defecto
  document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Consumo';
  document.getElementById('aguaForm').reset();
  document.getElementById('aguaId').value = '';
  // Limpiar filas dinámicas
  document.getElementById('treatmentContainer').innerHTML = '';
}

// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Consumo de Agua (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('aguaForm');
  const btnAdd = document.getElementById('btnAddTreatment');
  const inputAgua = document.getElementById('cantidadAgua');

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else abrirFormulario();
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarTodo; // Usamos la nueva función maestra

    // Botón para agregar fila
    if (btnAdd) btnAdd.onclick = agregarFilaTratamiento;

    // Listener para recalcular todo si cambia el agua
    if (inputAgua) inputAgua.addEventListener('input', recalcularTodosTotales);

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarAgua();
  cargarInventarioTratamiento();
});