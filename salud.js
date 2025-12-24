// --- Variables Globales ---
let inventarioSanitario = []; // Memoria caché del inventario

// --- 1. Lógica de Carga ---

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
    const lotesActivos = lotes.filter(l => l.estado === 'disponible' || l.estado === 'ocupado');

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Aves: ${lote.cantidadActual || lote.cantidad})`;
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;
    const res = await fetch(`${window.API_URL}/salud?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const salud = await res.json();
    const tbody = document.getElementById('saludTableBody');
    tbody.innerHTML = '';
    if (Array.isArray(salud) && salud.length > 0) {
      salud.forEach(s => {
        const tr = document.createElement('tr');
        const fechaVisual = s.fecha ? new Date(s.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : 'N/A';
        const cantidadVisual = Number.isInteger(s.cantidad) ? s.cantidad : parseFloat(s.cantidad).toFixed(4);

        tr.innerHTML = `
          <td>${s.loteId ? (s.Lote ? s.Lote.loteId : s.loteId) : 'N/A'}</td>
          <td><span class="badge" style="background-color: ${getColorTipo(s.tipo)}">${s.tipo}</span></td>
          <td>${s.nombre}</td>
          <td>${s.productoAplicado || '-'}</td>
          <td>${cantidadVisual}</td>
          <td>${fechaVisual}</td>
          <td><button onclick="eliminarSalud(${s.id})" class="btn btn-sm btn-peligro">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
      });
    } else { tbody.innerHTML = '<tr><td colspan="7">No hay registros.</td></tr>'; }
  } catch (error) { console.error(error); }
}

function getColorTipo(tipo) {
    if(tipo === 'Vacunación') return '#3498db';
    if(tipo === 'Tratamiento') return '#e67e22';
    if(tipo === 'Mortalidad') return '#e74c3c';
    return '#95a5a6';
}

// --- 2. Gestión Inteligente de Inventario ---

async function precargarInventarioSanitario() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const items = await res.json();
      // Guardamos todo lo que sea sanitario
      inventarioSanitario = items.filter(i => ['Vacuna', 'Medicina', 'Otro'].includes(i.categoria));
    }
  } catch (e) { console.error("Error cargando inventario sanitario", e); }
}

function filtrarYMostrarInsumos(tipoEvento) {
  const select = document.getElementById('vacunaSelect');
  select.innerHTML = '<option value="">Seleccione Producto</option>';

  let filtrados = [];
  // Lógica de filtrado según tipo de evento
  if (tipoEvento === 'Vacunación') {
    filtrados = inventarioSanitario.filter(i => i.categoria === 'Vacuna');
  } else if (tipoEvento === 'Tratamiento') {
    filtrados = inventarioSanitario.filter(i => i.categoria === 'Medicina' || i.categoria === 'Otro');
  } else {
    return; // Si es Mortalidad u otro, no mostramos nada
  }

  filtrados.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    const unidad = item.unidadMedida || 'Unidades';
    
    option.textContent = `${item.producto}`;
    
    // Guardamos DATOS CLAVE en el dataset para usarlos al guardar
    option.dataset.stock = item.cantidad; // Stock actual (ej: 4)
    option.dataset.unidad = unidad;       // Unidad base (ej: lb)
    option.dataset.nombre = item.producto;
    
    select.appendChild(option);
  });
}

// --- 3. CONVERSOR DE UNIDADES (CORREGIDO) ---
function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || unidadInput === 'base') return cantidadInput;

  // Normalizar strings
  const uIn = unidadInput.toLowerCase().trim().replace(/s$/, ''); // gramos -> gramo
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, ''); // libras -> libra

  if (uIn === uBase) return cantidadInput;

  console.log(`Intentando convertir: ${cantidadInput} ${uIn} a ${uBase}`);

  // --- LÓGICA DE PESO ---
  
  // DESTINO: LIBRAS (lb)
  if (uBase === 'lb' || uBase === 'libra') {
    if (uIn === 'kg' || uIn === 'kilo' || uIn === 'kilogramo') return cantidadInput * 2.20462;
    if (uIn === 'g' || uIn === 'gr' || uIn === 'gramo') return cantidadInput / 453.592; // <--- ESTO FALTABA
    if (uIn === 'oz' || uIn === 'onza') return cantidadInput / 16;
    if (uIn === 'qq') return cantidadInput * 100;
  }

  // DESTINO: KILOGRAMOS (kg)
  if (uBase === 'kg' || uBase === 'kilo' || uBase === 'kilogramo') {
    if (uIn === 'g' || uIn === 'gr' || uIn === 'gramo') return cantidadInput / 1000;
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 2.20462;
    if (uIn === 'qq') return cantidadInput * 45.36;
  }

  // DESTINO: GRAMOS (g)
  if (uBase === 'g' || uBase === 'gr' || uBase === 'gramo') {
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput * 1000;
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput * 453.592;
  }

  // --- LÓGICA DE VOLUMEN ---
  
  // DESTINO: LITROS (l)
  if (uBase === 'l' || uBase === 'litro' || uBase === 'lt') {
    if (uIn === 'ml' || uIn === 'cc' || uIn === 'mililitro') return cantidadInput / 1000;
    if (uIn === 'gal' || uIn === 'galon') return cantidadInput * 3.785;
  }

  // DESTINO: MILILITROS (ml)
  if (uBase === 'ml' || uBase === 'cc' || uBase === 'mililitro') {
    if (uIn === 'l' || uIn === 'litro' || uIn === 'lt') return cantidadInput * 1000;
  }

  console.warn(`No se encontró conversión directa de ${uIn} a ${uBase}. Se envía valor original.`);
  return cantidadInput;
}

// --- 4. Funciones CRUD ---

async function guardarSalud(e) {
  e.preventDefault();
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = document.getElementById('tipo').value;
  let cantidadInput = parseFloat(document.getElementById('cantidad').value);
  const unidadAplicacion = document.getElementById('unidadAplicacion').value;
  
  // Elementos de inventario
  const vacunaSelect = document.getElementById('vacunaSelect');
  const vacunaGroup = document.getElementById('vacunaGroup');
  
  let vacunaId = null;
  let productoAplicado = 'N/A';
  let cantidadFinal = cantidadInput; // Por defecto es lo que escribió el usuario

  // Lógica si es Tratamiento o Vacunación (implica inventario)
  if ((tipo === 'Vacunación' || tipo === 'Tratamiento') && vacunaSelect.value) {
    
    vacunaId = parseInt(vacunaSelect.value);
    
    // Recuperamos la info del DATASET del option seleccionado
    const opcion = vacunaSelect.options[vacunaSelect.selectedIndex];
    const unidadBase = opcion.dataset.unidad;
    const stockActual = parseFloat(opcion.dataset.stock);
    productoAplicado = opcion.dataset.nombre;

    // 1. Convertir
    cantidadFinal = calcularCantidadBase(cantidadInput, unidadAplicacion, unidadBase);
    
    console.log(`Stock: ${stockActual} ${unidadBase} | Pedido: ${cantidadInput} ${unidadAplicacion} -> ${cantidadFinal.toFixed(4)} ${unidadBase}`);

    // 2. Validar Stock (Frontend)
    // Usamos un pequeño margen de error para flotantes
    if (cantidadFinal > (stockActual + 0.0001)) {
        alert(`❌ Stock Insuficiente.\n\nInventario: ${stockActual} ${unidadBase}\nNecesitas: ${cantidadFinal.toFixed(4)} ${unidadBase}\n(${cantidadInput} ${unidadAplicacion})`);
        return; // Detenemos aquí, no enviamos al backend
    }
  }

  // Cálculo de fechas
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;
  const fechaEvento = new Date(document.getElementById('fecha').value);
  let fechaRetiroCalculada = null;
  if (diasRetiro > 0) {
    const f = new Date(fechaEvento); // Copia
    f.setDate(f.getDate() + diasRetiro);
    fechaRetiroCalculada = f.toISOString().split('T')[0];
  }

  const payload = {
    loteId: parseInt(document.getElementById('loteId').value),
    tipo: tipo,
    nombre: document.getElementById('nombre').value,
    cantidad: cantidadFinal, // ENVIAMOS LA CANTIDAD CONVERTIDA
    vacunaId: vacunaId,
    productoAplicado: productoAplicado,
    fecha: document.getElementById('fecha').value,
    fechaRetiro: fechaRetiroCalculada,
    granjaId: granjaId
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/salud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Evento registrado con éxito');
      cerrarFormularioSalud();
      await cargarSalud();
      await precargarInventarioSanitario(); // Actualizar stock en memoria inmediatamente
      
      // Si fue mortalidad, recargar lotes para actualizar conteo de aves
      if (tipo === 'Mortalidad') await cargarLotesForSelect();
    } else {
      const errorText = await res.json();
      alert('Error del servidor: ' + (errorText.error || 'Desconocido'));
    }
  } catch (error) { console.error(error); alert('Error de conexión'); }
}

async function eliminarSalud(id) {
  if (confirm('¿Eliminar este evento? Nota: El stock NO se revierte automáticamente.')) {
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

// --- UI Helpers ---
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

  // Resetear vista
  const vacunaGroup = document.getElementById('vacunaGroup');
  if (vacunaGroup) vacunaGroup.style.display = 'none';
  if (document.getElementById('stockInfo')) document.getElementById('stockInfo').textContent = '';
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  if (granja) document.querySelector('header h1').textContent = `Salud (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('saludForm');

  // Elementos UI
  const tipoSelect = document.getElementById('tipo');
  const vacunaSelect = document.getElementById('vacunaSelect');
  const nombreInput = document.getElementById('nombre');
  const stockInfo = document.getElementById('stockInfo');

  // 1. Listener Tipo
  if (tipoSelect) {
    tipoSelect.addEventListener('change', () => {
      const tipo = tipoSelect.value;
      const vacunaGroup = document.getElementById('vacunaGroup');
      
      if (tipo === 'Vacunación' || tipo === 'Tratamiento') {
        vacunaGroup.style.display = 'block';
        if(vacunaSelect) vacunaSelect.required = true;
        filtrarYMostrarInsumos(tipo);
      } else {
        vacunaGroup.style.display = 'none';
        if(vacunaSelect) {
            vacunaSelect.value = "";
            vacunaSelect.required = false;
        }
        if (stockInfo) stockInfo.textContent = "";
      }
    });
  }

  // 2. Listener Producto (Para mostrar stock)
  if (vacunaSelect) {
    vacunaSelect.addEventListener('change', () => {
      const opt = vacunaSelect.options[vacunaSelect.selectedIndex];
      if (opt && opt.dataset.nombre) {
        nombreInput.value = opt.dataset.nombre; // Autocompletar nombre
        if (stockInfo) {
            stockInfo.textContent = `Stock: ${opt.dataset.stock} ${opt.dataset.unidad}`;
            // Cambiar color si stock es bajo
            stockInfo.style.color = parseFloat(opt.dataset.stock) < 5 ? 'red' : 'var(--color-secundario)';
        }
      }
    });
  }

  if (toggleBtn) toggleBtn.onclick = () => {
      const isOpen = document.getElementById('formContainer').classList.contains('is-open');
      if(isOpen) cerrarFormularioSalud();
      else abrirFormularioSalud();
  };

  if (cancelBtn) cancelBtn.onclick = cerrarFormularioSalud;
  if (form) form.onsubmit = guardarSalud;

  cargarLotesForSelect();
  cargarSalud();
  precargarInventarioSanitario();
});
```

### ¿Qué corregí? (La Magia Matemática) 🧮

En la función `calcularCantidadBase`, agregué este bloque vital que faltaba:

```javascript
// Si la base es Libras (lb)
if (uBase === 'lb' || uBase === 'libra') {
    // ...
    if (uIn === 'g' || uIn === 'gr' || uIn === 'gramo') return cantidadInput / 453.592; // <--- AQUÍ ESTÁ LA SOLUCIÓN
    // ...
}
