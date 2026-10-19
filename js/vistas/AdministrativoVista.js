const actualizarVistaAdminNestor = () => {
  const container = document.getElementById('adminStudentOverviewContainer');
  if (!container) return;

  let totalAlumnos = 0;
  let html = `<table class="admin-payments-table" style="width:100%; border-collapse:collapse; margin-top:10px; color: #000000;">
    <thead>
      <tr style="background:#f1f5f9; text-align:left; color: #000000;">
        <th style="padding:10px; color: #000000; font-weight:bold;">Año</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Cédula</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Nombre</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Período</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Fecha</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Estado Pago</th>
        <th style="padding:10px; color: #000000; font-weight:bold; text-align:center;">Acciones de Pago y Boleta</th>
      </tr>
    </thead>
    <tbody style="color: #000000;">`;

  for (let year = 1; year <= 5; year++) {
    const list = (attendanceData.years[year]?.students || []).filter((student) => !isRemovedStudent(student));
    list.forEach(st => {
      const pago = obtenerPagoPeriodo(st);
      if (!coincideConFiltrosPago(st, pago)) return;
      totalAlumnos++;
      let badgeStyle = "background:#fee2e2; color:#dc2626;";
      let estadoTexto = "No pago";

      if (pago.status === 'pago') {
        badgeStyle = "background:#dcfce7; color:#15803d;";
        estadoTexto = "Pago Completo";
      } else if (pago.status === 'abono') {
        badgeStyle = "background:#fef9c3; color:#a16207;";
        estadoTexto = `Abonó: $${pago.amount}`;
      }

      const boletaEstudianteAutorizada = String(st.BoletaVisible || '').toUpperCase().trim() === 'SI';
      const btnBoletaEstilo = boletaEstudianteAutorizada 
        ? "background-color: #16a34a; color: white;" 
        : "background-color: #0284c7; color: white;";
      const textoBotonBoleta = boletaEstudianteAutorizada ? 'desautorizar boleta' : 'autorizar boleta';
      const botonBoleta = canManageBoletas()
        ? `<button style="${btnBoletaEstilo} border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;" aria-pressed="${boletaEstudianteAutorizada}" onclick="autorizarBoletaEstudiante('${st.id}', ${year})">${textoBotonBoleta}</button>`
        : '';

      html += `
        <tr style="border-bottom:1px solid #e2e8f0; color: #000000;">
          <td data-label="Año" style="padding:8px; color: #000000;">${year}° Año</td>
          <td data-label="Cédula" style="padding:8px; color: #000000;">${canViewStudentPersonalData() ? st.cedula || 'No registrada' : 'Oculto'}</td>
          <td data-label="Nombre" style="padding:8px; font-weight:bold; color: #000000;">${st.name}</td>
          <td data-label="Período" style="padding:8px; color: #000000;">${PERIODOS_PAGO.find(periodo => periodo.id === periodoPagoActual)?.label || periodoPagoActual}</td>
          <td data-label="Fecha" style="padding:8px; color: #000000;">${pago.date || 'Sin fecha'}</td>
          <td data-label="Estado Pago" style="padding:8px;">
            <span class="badge-pago" style="${badgeStyle}">${estadoTexto}</span>
          </td>
          <td data-label="Acciones de pago y boleta" style="padding:8px; text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button class="btn-pago-verde" onclick="cambiarEstadoPago('${st.id}', ${year}, 'pago')">$ Pago</button>
              <button class="btn-pago-rojo" onclick="cambiarEstadoPago('${st.id}', ${year}, 'no_pago')">No pago</button>
              <button class="btn-pago-amarillo" onclick="abrirModalAbono('${st.id}', ${year}, '${st.name}')">$ Abono</button>
              ${botonBoleta}
            </div>
          </td>
        </tr>`;
    });
  }

  html += `</tbody></table><p style="margin-top:12px; font-weight:bold; color:#000000;">Total Estudiantes en Sistema: ${totalAlumnos}</p>`;
  container.innerHTML = html;
};

