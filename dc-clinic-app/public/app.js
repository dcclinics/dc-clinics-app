(function () {
  var catLabels = { todos: 'Todos', antes: 'Antes de tu cirugía', despues: 'Cuidados post-operatorios', procedimiento: 'Por procedimiento' };
  var playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  var state = { tab: 'inicio', agendaStep: 1, proc: null, day: null, slot: null, videoFilter: 'todos', procedures: [], days: [] };

  window.goTab = function (tab) {
    state.tab = tab;
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('active', s.dataset.screen === tab); });
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    if (tab === 'videos') renderVideos();
    if (tab === 'resultados') renderResultados();
  };

  window.agendaBack = function (step) {
    state.agendaStep = step;
    renderAgendaStep();
  };

  function buildNextDays(n) {
    var out = [];
    var dn = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    var d = new Date();
    for (var i = 0; i < n; i++) {
      var day = new Date(d);
      day.setDate(d.getDate() + i);
      out.push({ label: dn[day.getDay()], num: day.getDate(), iso: day.toISOString().slice(0, 10) });
    }
    return out;
  }

  function selectProc(name) {
    state.proc = name; state.day = null; state.slot = null; state.agendaStep = 2;
    state.days = buildNextDays(7);
    renderAgendaStep();
  }

  function selectDay(i) {
    state.day = i; state.slot = null;
    renderAgendaStep();
    loadSlots();
  }

  function selectSlot(time) {
    state.slot = time;
    updateConfirmBtn();
    renderSlots(state._lastSlots || []);
  }

  function updateConfirmBtn() {
    var btn = document.getElementById('confirm-btn');
    var name = document.getElementById('pname').value.trim();
    var phone = document.getElementById('pphone').value.trim();
    btn.disabled = !(state.day !== null && state.slot && name && phone);
  }

  async function loadSlots() {
    document.getElementById('slot-grid').textContent = 'Cargando…';
    var iso = state.days[state.day].iso;
    try {
      var res = await fetch('/api/availability?date=' + iso);
      var data = await res.json();
      state._lastSlots = data.slots || [];
      renderSlots(state._lastSlots);
    } catch (e) {
      document.getElementById('slot-grid').textContent = 'No se pudo cargar la disponibilidad.';
    }
  }

  function renderSlots(slots) {
    var grid = document.getElementById('slot-grid');
    if (!slots.length) { grid.innerHTML = '<div style="grid-column:1/-1;font-size:12.5px;color:var(--ink-faint)">No hay cupos ese día.</div>'; return; }
    grid.innerHTML = slots.map(function (s) {
      return '<button class="slot-btn ' + (state.slot === s ? 'sel' : '') + '" onclick="window.__selSlot(\'' + s + '\')">' + s + '</button>';
    }).join('');
  }

  window.__selProc = function (i) { selectProc(state.procedures[i].name); };
  window.__selDay = function (i) { selectDay(i); };
  window.__selSlot = function (t) { selectSlot(t); };

  function renderAgendaStep() {
    document.getElementById('step-1').style.display = state.agendaStep === 1 ? '' : 'none';
    document.getElementById('step-2').style.display = state.agendaStep === 2 ? '' : 'none';
    document.getElementById('step-3').style.display = state.agendaStep === 3 ? '' : 'none';

    if (state.agendaStep === 2) {
      document.getElementById('proc-selected-title').textContent = state.proc;
      document.getElementById('day-strip').innerHTML = state.days.map(function (d, i) {
        return '<button class="day-btn ' + (state.day === i ? 'sel' : '') + '" onclick="window.__selDay(' + i + ')"><div class="dn">' + d.label + '</div><div class="dd">' + d.num + '</div></button>';
      }).join('');
      updateConfirmBtn();
    }
  }

  window.agendaConfirm = async function () {
    var name = document.getElementById('pname').value.trim();
    var phone = document.getElementById('pphone').value.trim();
    var errEl = document.getElementById('agenda-err');
    errEl.textContent = '';
    try {
      var res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedure: state.proc,
          date: state.days[state.day].iso,
          time: state.slot,
          patient_name: name,
          patient_phone: phone
        })
      });
      var data = await res.json();
      if (!res.ok) { errEl.textContent = data.error || 'Algo salió mal.'; return; }

      if (data.checkout_url) {
        window.location.href = data.checkout_url; // va a pagar la valoración en Stripe
        return;
      }
      document.getElementById('confirm-msg').textContent = 'Tu cita de ' + state.proc + ' quedó para el ' + state.days[state.day].iso + ' a las ' + state.slot + '. Te llegará confirmación por WhatsApp.';
      state.agendaStep = 3;
      renderAgendaStep();
    } catch (e) {
      errEl.textContent = 'No se pudo conectar con el servidor.';
    }
  };

  document.addEventListener('input', function (e) {
    if (e.target && (e.target.id === 'pname' || e.target.id === 'pphone')) updateConfirmBtn();
  });

  async function renderVideos() {
    var pills = document.getElementById('video-pills');
    pills.innerHTML = Object.keys(catLabels).map(function (c) {
      return '<button class="fpill ' + (state.videoFilter === c ? 'sel' : '') + '" onclick="window.__setVFilter(\'' + c + '\')">' + catLabels[c] + '</button>';
    }).join('');

    var res = await fetch('/api/videos?category=' + state.videoFilter);
    var list = await res.json();
    var grid = document.getElementById('video-grid');
    grid.innerHTML = list.map(function (v) {
      return '<div class="vcard" onclick="' + (v.video_url ? 'window.open(\'' + v.video_url + '\',\'_blank\')' : '') + '"><div class="vthumb">' + playIcon + '</div>' +
        '<div class="vmeta"><div class="vt">' + v.title + '</div><div class="vd">' + v.duration + '</div><span class="vtag">' + catLabels[v.category] + '</span></div></div>';
    }).join('') || '<p style="font-size:12.5px;color:var(--ink-faint)">No hay videos en esta categoría todavía.</p>';
  }
  window.__setVFilter = function (c) { state.videoFilter = c; renderVideos(); };

  async function boot() {
    var res = await fetch('/api/procedures');
    state.procedures = await res.json();
    document.getElementById('proc-grid').innerHTML = state.procedures.map(function (p, i) {
      return '<button class="proc-card" onclick="window.__selProc(' + i + ')"><div class="dot"></div><p>' + p.name + '</p></button>';
    }).join('');

    var vres = await fetch('/api/videos');
    var videos = await vres.json();
    document.getElementById('home-videos').innerHTML = videos.slice(0, 4).map(function (v) {
      return '<div class="vcard" onclick="goTab(\'videos\')"><div class="vthumb">' + playIcon + '</div><div class="vmeta"><div class="vt">' + v.title + '</div><div class="vd">' + v.duration + '</div></div></div>';
    }).join('');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function renderResultados() {
    var wrap = document.getElementById('results-list');
    try {
      var res = await fetch('/api/testimonials');
      var list = await res.json();
      if (!list.length) {
        wrap.innerHTML = '<p class="result-empty">Todavía no hay testimonios publicados.</p>';
        return;
      }
      wrap.innerHTML = list.map(function (t) {
        return '<div class="result-card">' +
          '<img class="result-photo" src="' + t.photo_path + '" alt="Resultado de ' + escapeHtml(t.patient_name) + '" loading="lazy">' +
          '<div class="result-body">' +
          (t.procedure ? '<span class="result-tag">' + escapeHtml(t.procedure) + '</span>' : '') +
          '<p class="result-name">' + escapeHtml(t.patient_name) + '</p>' +
          (t.comment ? '<p class="result-comment">“' + escapeHtml(t.comment) + '”</p>' : '') +
          '</div></div>';
      }).join('');
    } catch (e) {
      wrap.innerHTML = '<p class="result-empty">No se pudieron cargar los resultados.</p>';
    }
  }

  boot();
})();
