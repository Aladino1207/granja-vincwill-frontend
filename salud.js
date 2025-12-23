/// --- Variables Globales ---
let inventarioSanitario = [];

// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const lotes = await res.json();
    const select = document.getElementById('loteId');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    // FILTRO: Solo disponibles (o ocupados si lo prefieres)
    // Mostramos estado para claridad
    const lotesActivos = lotes.filter(l => l.estado !== 'vendido' && l.estado !== 'archivado');

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (${lote.estado}) - Aves: ${lote.cantidadActual || lote.cantidad}`;
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarVacunasForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const inventario = await res.json();
    inventarioSanitario = inventario; // Guardamos en global para conversiones

    const vacunaSelect = document.getElementById('vacunaSelect'); // Para Vacunación
    const insumoSelect = document.getElementById('insumoSelect'); // Para Tratamiento

    if (vacunaSelect) {
      vacunaSelect.innerHTML = '<option value="">Selecciona Vacuna</option>';
      const vacunas = inventario.filter(i => i.categoria === 'Vacuna' && i.cantidad > 0);
      vacunas.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `${v.producto} (Stock: ${v.cantidad} ${v.unidadMedida})`;
        // Datos para la conversión automática
        opt.dataset.nombre = v.producto;
        opt.dataset.stock = v.cantidad;
        opt.dataset.unidad = v.unidadMedida;
        vacunaSelect.appendChild(opt);
      });
    }

    if (insumoSelect) {
      insumoSelect.innerHTML = '<option value="">Selecciona Insumo</option>';
      // Filtramos Medicina, Otro, etc.
      const insumos = inventario.filter(i => (i.categoria === 'Medicina' || i.categoria === 'Otro') && i.cantidad > 0);
      insumos.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.id;
        opt.textContent = `${i.producto} (Stock: ${i.cantidad} ${i.unidadMedida})`;
        opt.dataset.nombre = i.producto;
        opt.dataset.stock = i.cantidad;
        opt.dataset.unidad = i.unidadMedida;
        insumoSelect.appendChild(opt);
      });
    }

  } catch (error) { console.error('Error cargando inventario:', error); }
}

async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/salud?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const registros = await res.json();
    const tbody = document.getElementById('saludTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    registros.forEach(reg => {
      const tr = document.createElement('tr');
      // Intentamos mostrar la unidad original si el backend la devolviera, 
      // pero por ahora mostramos lo que se guardó (cantidadBase)
      const nombreLote = reg.Lote ? reg.Lote.loteId : 'General';

      tr.innerHTML = `
        <td>${nombreLote}</td>
        <td><span class="badge" style="background:${getColorTipo(reg.tipo)}">${reg.tipo}</span></td>
        <td>${reg.productoAplicado}</td>
        <td>${reg.cantidad}</td> <!-- Mostramos la cantidad base -->
        <td>${new Date(reg.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="eliminarSalud(${reg.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

function getColorTipo(tipo) {
  if (tipo === 'Vacunacion') return '#3498db';
  if (tipo === 'Tratamiento') return '#e67e22';
  if (tipo === 'Mortalidad') return '#e74c3c';
  return '#95a5a6';
}

// --- INTELIGENCIA DE FILTRADO DE INSUMOS ---
async function precargarInventarioSanitario() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const items = await res.json();
      // Guardamos en memoria solo lo que nos sirve (Vacunas y Medicinas)
      inventarioSanitario = items.filter(i => i.categoria === 'Vacuna' || i.categoria === 'Medicina' || i.categoria === 'Otro');
    }
  } catch (e) { console.error("Error cargando inventario sanitario", e); }
}

function filtrarYMostrarInsumos(tipoEvento) {
  const select = document.getElementById('vacunaSelect');
  select.innerHTML = '<option value="">Seleccione Producto</option>';

  let filtrados = [];

  if (tipoEvento === 'Vacunación') {
    // Mostrar SOLO Vacunas
    filtrados = inventarioSanitario.filter(i => i.categoria === 'Vacuna');
  } else if (tipoEvento === 'Tratamiento') {
    // Mostrar Medicinas (y Otros por si acaso)
    filtrados = inventarioSanitario.filter(i => i.categoria === 'Medicina' || i.categoria === 'Otro');
  } else {
    // Si es Mortalidad u Otro, no mostramos nada o todo (depende de tu lógica, aquí ocultamos)
    return;
  }

  filtrados.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    const unidad = item.unidadMedida || 'Unidades';
    option.textContent = `${item.producto} (Stock: ${item.cantidad} ${unidad})`;

    // Datos para la calculadora
    option.dataset.unidad = unidad;
    option.dataset.nombre = item.producto;
    select.appendChild(option);
  });
}

// --- Conversor de Unidades ---
function calcularCantidadBase(cantidad, unidadUso, unidadBase) {
  if (!unidadUso || !unidadBase) return cantidad;

  // Normalizar texto (minusculas, sin espacios, quitar 's' final para plurales)
  const uUso = unidadUso.toLowerCase().trim().replace(/s$/, ''); // gramos -> gramo
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, ''); // libras -> libra

  // 1. Si son iguales, no tocar
  if (uUso === uBase || uUso === 'unidad' || uBase === 'unidad') return parseFloat(cantidad);

  // Mapeo de alias comunes a estándar
  const mapUnit = (u) => {
    if (['g', 'gr', 'gramo'].includes(u)) return 'g';
    if (['kg', 'kilo', 'kilogramo'].includes(u)) return 'kg';
    if (['lb', 'libra'].includes(u)) return 'lb';
    if (['oz', 'onza'].includes(u)) return 'oz';
    if (['l', 'lt', 'litro'].includes(u)) return 'l';
    if (['ml', 'mililitro', 'cc'].includes(u)) return 'ml';
    if (['gl', 'gal', 'galon'].includes(u)) return 'gal';
    return u;
  };

  const from = mapUnit(uUso);
  const to = mapUnit(uBase);
  const val = parseFloat(cantidad);

  console.log(`Convirtiendo ${val} ${from} -> ${to}`);

  // --- PESO ---
  // Base Libra (lb)
  if (to === 'lb') {
    if (from === 'g') return val / 453.592;
    if (from === 'kg') return val * 2.20462;
    if (from === 'oz') return val / 16;
  }
  // Base Kilogramo (kg)
  if (to === 'kg') {
    if (from === 'g') return val / 1000;
    if (from === 'lb') return val / 2.20462;
    if (from === 'oz') return val / 35.274;
  }
  // Base Gramo (g)
  if (to === 'g') {
    if (from === 'kg') return val * 1000;
    if (from === 'lb') return val * 453.592;
  }

  // --- VOLUMEN ---
  // Base Litro (l)
  if (to === 'l') {
    if (from === 'ml') return val / 1000;
    if (from === 'gal') return val * 3.78541;
  }
  // Base Mililitro (ml)
  if (to === 'ml') {
    if (from === 'l') return val * 1000;
    if (from === 'gal') return val * 3785.41;
  }
  // Base Galón (gal)
  if (to === 'gal') {
    if (from === 'l') return val / 3.78541;
    if (from === 'ml') return val / 3785.41;
  }

  // Si llegamos aquí, no se encontró conversión válida
  console.warn(`⚠️ No existe conversión definida de ${from} a ${to}. Se enviará el valor original.`);
  return val;
}

// --- UI Logic ---
function abrirFormularioSalud() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';
}
function cerrarFormularioSalud() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Registrar Nuevo Evento';

  const form = document.getElementById('saludForm');
  if (form) form.reset();

  if (document.getElementById('saludId')) document.getElementById('saludId').value = '';

  const title = document.getElementById('formTitle');
  if (title) title.textContent = 'Registrar Evento de Salud';

  // Ocultar campo vacuna
  if (document.getElementById('vacunaGroup')) {
    document.getElementById('vacunaGroup').style.display = 'none';
  }
  if (document.getElementById('stockInfo')) {
    document.getElementById('stockInfo').textContent = '';
  }
}

// --- Funciones CRUD (BLINDADAS) ---

async function guardarSalud(e) {
  e.preventDefault();
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = document.getElementById('tipo').value;
  let cantidadInput = parseFloat(document.getElementById('cantidad').value);
  const unidadAplicacion = document.getElementById('unidadAplicacion').value;

  // Lógica de Inventario y Conversión
  const vacunaSelect = document.getElementById('vacunaSelect');
  const vacunaGroup = document.getElementById('vacunaGroup');
  let vacunaId = null;
  let cantidadFinal = cantidadInput;

  if (vacunaSelect && vacunaSelect.value && vacunaGroup.style.display !== 'none') {
    vacunaId = parseInt(vacunaSelect.value);
    const opcionSeleccionada = vacunaSelect.options[vacunaSelect.selectedIndex];
    const unidadBase = opcionSeleccionada.dataset.unidad;
    cantidadFinal = calcularCantidadBase(cantidadInput, unidadAplicacion, unidadBase);
  }

  // Retiro
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;
  const fechaEvento = new Date(document.getElementById('fecha').value);
  let fechaRetiroCalculada = null;
  if (diasRetiro > 0) {
    fechaEvento.setDate(fechaEvento.getDate() + diasRetiro);
    fechaRetiroCalculada = fechaEvento;
  }

  const salud = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: tipo,
    nombre: document.getElementById('nombre').value,
    cantidad: cantidadFinal,
    vacunaId: vacunaId,
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId
  };

  const url = `${window.API_URL}/salud`; // Solo POST por ahora
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(salud)
    });
    if (res.ok) {
      cerrarFormularioSalud(); // <--- LLAMADA CORREGIDA
      await cargarSalud();
      await precargarInventarioSanitario(); // Recargar stock en memoria
      if (salud.tipo === 'Mortalidad') await cargarLotesForSelect();
    } else {
      const errorText = await res.json();
      alert('Error: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) { alert('Error de conexión'); }
} async function guardarSalud(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = document.getElementById('tipoEvento').value;
  const loteId = document.getElementById('loteId').value;
  const fecha = document.getElementById('fecha').value;
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;

  // Calcular fecha de retiro
  let fechaRetiro = null;
  if (diasRetiro > 0 && fecha) {
    const f = new Date(fecha);
    f.setDate(f.getDate() + diasRetiro);
    fechaRetiro = f.toISOString().split('T')[0];
  }

  // Preparar payload
  const payload = {
    granjaId,
    tipo,
    loteId,
    fecha,
    diasRetiro,
    fechaRetiro,
    descripcion: document.getElementById('descripcion').value
  };

  // Logica por tipo
  if (tipo === 'Mortalidad') {
    const cantidad = parseInt(document.getElementById('cantidad').value);
    if (!cantidad || cantidad <= 0) return alert('Ingresa una cantidad válida');
    payload.productoAplicado = 'N/A';
    payload.cantidad = cantidad; // Cantidad de aves muertas
    payload.costoTotal = 0; // La mortalidad es pérdida, no costo directo de bolsillo aquí
  }
  else {
    // Vacunación o Tratamiento (Requiere Inventario)
    let inventarioId, cantidadUso, unidadUso;

    if (tipo === 'Vacunacion') {
      inventarioId = document.getElementById('vacunaSelect').value;
      cantidadUso = parseFloat(document.getElementById('dosis').value);
      unidadUso = document.getElementById('unidadDosis').value;
    } else {
      inventarioId = document.getElementById('insumoSelect').value;
      cantidadUso = parseFloat(document.getElementById('cantidadTratamiento').value);
      unidadUso = document.getElementById('unidadTratamiento').value;
    }

    if (!inventarioId) return alert("Selecciona un producto del inventario");

    // Buscar el item en memoria para saber su unidad base y stock
    const item = inventarioSanitario.find(i => i.id == inventarioId);
    if (!item) return alert("Error identificando el producto");

    // --- AQUÍ OCURRE LA MAGIA MATEMÁTICA ---
    const cantidadBase = calcularCantidadBase(cantidadUso, unidadUso, item.unidadMedida);

    console.log(`Stock: ${item.cantidad} ${item.unidadMedida} | Uso: ${cantidadUso} ${unidadUso} => Base: ${cantidadBase.toFixed(4)} ${item.unidadMedida}`);

    if (cantidadBase > item.cantidad) {
      return alert(`Error: Stock insuficiente de ${item.producto}. Tienes ${item.cantidad} ${item.unidadMedida}, necesitas ${cantidadBase.toFixed(4)} ${item.unidadMedida}.`);
    }

    payload.productoAplicado = item.producto;
    payload.inventarioId = parseInt(inventarioId);
    payload.cantidad = cantidadBase; // Enviamos lo convertido al backend
  }

  try {
    const res = await fetch(`${window.API_URL}/salud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Registro guardado correctamente');
      cerrarFormularioSalud();
      cargarSalud();
      // Recargar inventario para actualizar stocks en los selects
      cargarVacunasForSelect();
    } else {
      const errData = await res.json();
      alert('Error: ' + (errData.error || 'No se pudo guardar'));
    }
  } catch (error) {
    console.error(error);
    alert('Error de conexión');
  }
}

async function editarSalud(id) {
  // Lógica de edición (simplificada: solo carga datos)
  // Nota: Editar transacciones de inventario es complejo.
  // Recomendación: Mejor borrar y crear de nuevo.
  alert("Para corregir inventario, por favor elimine este evento y créelo de nuevo. Eliminar no Revierte el Stock automaticamente");
}

async function eliminarSalud(id) {
  if (confirm('¿Eliminar evento?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/salud/${id}?granjaId=${granjaId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      cargarSalud();
    } catch (error) { alert('Error al eliminar'); }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Salud (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('saludForm');

  // Elementos para lógica dinámica
  const tipoSelect = document.getElementById('tipo');
  const vacunaSelect = document.getElementById('vacunaSelect');
  const nombreInput = document.getElementById('nombre');
  const stockInfo = document.getElementById('stockInfo');

  // 1. Escuchar cambios en el Tipo de Evento
  if (tipoSelect) {
    tipoSelect.addEventListener('change', () => {
      const tipo = tipoSelect.value;
      const vacunaGroup = document.getElementById('vacunaGroup');

      if (tipo === 'Vacunación' || tipo === 'Tratamiento') {
        vacunaGroup.style.display = 'flex';
        vacunaSelect.required = true;
        // Filtrar la lista
        filtrarYMostrarInsumos(tipo);
      } else {
        vacunaGroup.style.display = 'none';
        vacunaSelect.value = "";
        vacunaSelect.required = false;
        if (stockInfo) stockInfo.textContent = "";
      }
    });
  }

  // 2. Autocompletar nombre al seleccionar vacuna
  if (vacunaSelect) {
    vacunaSelect.addEventListener('change', () => {
      const opt = vacunaSelect.options[vacunaSelect.selectedIndex];
      if (opt && opt.dataset.nombre) {
        nombreInput.value = opt.dataset.nombre;
        if (stockInfo) stockInfo.textContent = `Disponible: ${opt.dataset.stock} ${opt.dataset.unidad}`;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) {
          cerrarFormularioSalud(); // <--- LLAMADA CORREGIDA
        } else {
          if (document.getElementById('saludForm')) document.getElementById('saludForm').reset();
          if (document.getElementById('vacunaGroup')) document.getElementById('vacunaGroup').style.display = 'none';
          abrirFormularioSalud(); // <--- LLAMADA CORREGIDA
        }
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormularioSalud); // <--- LLAMADA CORREGIDA
    if (form) form.onsubmit = guardarSalud;

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarSalud();
  precargarInventarioSanitario(); // Cargar lista de medicinas al inicio
});