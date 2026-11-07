/*
 * A Tope Burguer — comportamiento de la página.
 * Idioma, enlaces desde config, semáforo de horario en vivo, horario semanal,
 * menú y reseñas desde config, mapa diferido, menú móvil y formulario.
 */
(function () {
  "use strict";

  var C = window.ATOPE || {};
  var T = window.ATOPE_I18N || {};
  var L = C.links || {};
  var root = document.documentElement;
  var lang = "en";
  var WEEK = 10080;
  var DAY = 1440;

  /* ---------- utilidades ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function enc(s) { return encodeURIComponent(s); }

  function storage(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* almacenamiento bloqueado: se ignora */ }
    return null;
  }

  function t(key, vars) {
    var s = (T[lang] && T[lang][key]) || (T.en && T.en[key]) || "";
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; });
    }
    return s;
  }

  function locale() { return lang === "es" ? "es-US" : "en-US"; }

  function svg(name) {
    var p = {
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
      facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z"/>',
      tiktok: '<path d="M9 11a4.5 4.5 0 1 0 4.5 4.5V3c.6 2.6 2.6 4.6 5.5 5"/>'
    }[name] || "";
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + p + "</svg>";
  }

  /* ---------- idioma ---------- */
  function detectLang() {
    var saved = storage("atope-lang");
    if (saved === "es" || saved === "en") return saved;
    var list = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).toLowerCase();
      if (l.indexOf("es") === 0) return "es";
      if (l.indexOf("en") === 0) return "en";
    }
    return "en";
  }

  function applyText() {
    root.lang = lang;
    document.title = t("meta.title");
    var md = $('meta[name="description"]');
    if (md) md.setAttribute("content", t("meta.description"));

    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var kv = pair.split(":");
        if (kv.length === 2) el.setAttribute(kv[0].trim(), t(kv[1].trim()));
      });
    });
    $$("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
  }

  function setLang(next) {
    lang = next === "es" ? "es" : "en";
    storage("atope-lang", lang);
    render();
  }

  /* ---------- enlaces (todos salen de config.js) ---------- */
  function linkFor(key) {
    if (key === "maps") {
      if (L.maps) return L.maps;
      return C.address ? "https://www.google.com/maps/dir/?api=1&destination=" + enc(C.address) : "";
    }
    return L[key] || "";
  }

  function applyLinks() {
    $$("[data-link]").forEach(function (el) {
      var url = linkFor(el.getAttribute("data-link"));
      var note = $(".btn-note", el);
      if (url) {
        el.setAttribute("href", url);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
        el.removeAttribute("aria-disabled");
        el.classList.remove("is-pending");
        if (note) note.textContent = t("external");
        if (note) note.classList.add("sr-only");
      } else {
        el.removeAttribute("href");
        el.setAttribute("aria-disabled", "true");
        el.classList.add("is-pending");
        if (note) { note.textContent = t("btn.soon"); note.classList.remove("sr-only"); }
      }
    });

    var socials = ["instagram", "facebook", "tiktok"].filter(function (k) { return L[k]; });
    $$("[data-social]").forEach(function (ul) {
      ul.innerHTML = socials.map(function (k) {
        var name = k === "tiktok" ? "TikTok" : k.charAt(0).toUpperCase() + k.slice(1);
        return '<li><a class="social-link" href="' + L[k] + '" target="_blank" rel="noopener">' +
          svg(k) + '<span class="sr-only">' + name + " " + t("external") + "</span></a></li>";
      }).join("");
    });
    $$("[data-social-wrap]").forEach(function (el) { el.hidden = socials.length === 0; });
    $$("[data-needs]").forEach(function (el) {
      el.hidden = !linkFor(el.getAttribute("data-needs"));
    });
  }

  /* ---------- horario ---------- */
  function toMin(s) {
    var a = String(s).split(":");
    return (parseInt(a[0], 10) || 0) * 60 + (parseInt(a[1], 10) || 0);
  }

  function intervals() {
    var h = C.hours || {}, out = [];
    for (var d = 0; d < 7; d++) {
      var r = h[d];
      if (!r || r.length < 2) continue;
      var o = toMin(r[0]), c = toMin(r[1]);
      var e = c <= o ? c + DAY : c;
      out.push({ day: d, open: o, close: c, s: d * DAY + o, e: d * DAY + e });
    }
    return out;
  }

  function nowInStore() {
    var parts = {};
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: C.timezone || "America/Los_Angeles",
        weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    return { day: day, min: (parseInt(parts.hour, 10) % 24) * 60 + parseInt(parts.minute, 10) };
  }

  // Día del turno: de madrugada, si sigue abierto el turno de anoche, "hoy" es ayer.
  function serviceDay() {
    var n = nowInStore(), h = C.hours || {}, prev = (n.day + 6) % 7, r = h[prev];
    if (r && r.length > 1 && toMin(r[1]) <= toMin(r[0]) && n.min < toMin(r[1])) return prev;
    return n.day;
  }

  function fmtTime(min) {
    var h = Math.floor(min / 60) % 24, m = min % 60;
    var opts = { hour: "numeric", timeZone: "UTC" };
    if (m) opts.minute = "2-digit";
    return new Intl.DateTimeFormat(locale(), opts).format(new Date(Date.UTC(2020, 0, 1, h, m)));
  }

  function dayName(d) {
    // 5 de enero de 2020 fue domingo.
    return new Intl.DateTimeFormat(locale(), { weekday: "long", timeZone: "UTC" })
      .format(new Date(Date.UTC(2020, 0, 5 + d)));
  }

  function computeStatus() {
    var iv = intervals();
    if (!iv.length) return { state: "unknown", text: t("status.unknown"), short: "" };
    var n = nowInStore(), now = n.day * DAY + n.min, i, x;

    for (i = 0; i < iv.length; i++) {
      x = iv[i];
      if ((now >= x.s && now < x.e) || (now + WEEK >= x.s && now + WEEK < x.e)) {
        var oneC = Math.floor(x.close / 60) % 12 === 1; // "hasta la 1"
        return {
          state: "open",
          text: t("status.open", { until: t(oneC ? "status.until1" : "status.until"), time: fmtTime(x.close) }),
          short: t("status.short.open")
        };
      }
    }

    var best = null, bestDelta = Infinity;
    iv.forEach(function (y) {
      var d = y.s - now;
      if (d <= 0) d += WEEK;
      if (d < bestDelta) { bestDelta = d; best = y; }
    });
    var daysAhead = Math.floor((n.min + bestDelta) / DAY);
    var when = daysAhead === 0 ? t("status.today")
      : daysAhead === 1 ? t("status.tomorrow")
      : t("status.onDay", { day: dayName(best.day) });
    var oneO = Math.floor(best.open / 60) % 12 === 1; // "a la 1"
    return {
      state: "closed",
      text: t("status.closed", { when: when, at: t(oneO ? "status.at1" : "status.at"), time: fmtTime(best.open) }),
      short: t("status.short.closed")
    };
  }

  var firstStatus = true;
  function applyStatus() {
    var st = computeStatus();
    $$("[data-status]").forEach(function (el) {
      var txt = $(".status-text", el);
      if (txt) txt.textContent = st.text;
      if (firstStatus) {
        // Las luces se encienden una por una al cargar (ver CSS).
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { el.setAttribute("data-state", st.state); });
        });
      } else {
        el.setAttribute("data-state", st.state);
      }
    });
    $$("[data-status-short]").forEach(function (el) {
      el.hidden = !st.short;
      el.setAttribute("data-state", st.state);
      var txt = $(".status-text", el);
      if (txt) txt.textContent = st.short;
    });
    firstStatus = false;

    // Horario de hoy en el carril 2
    var h = C.hours || {}, today = h[serviceDay()];
    var line = !intervals().length ? t("lane.visit.unknown")
      : today ? t("lane.visit.today", { range: fmtTime(toMin(today[0])) + " – " + fmtTime(toMin(today[1])) })
      : t("lane.visit.closedToday");
    $$("[data-today]").forEach(function (el) { el.textContent = line; });
  }

  function applyHours() {
    var box = $("[data-hours]");
    if (!box) return;
    var h = C.hours || {};
    if (!intervals().length) {
      box.innerHTML = '<p class="muted">' + t("loc.hoursPending") + "</p>";
      return;
    }
    var today = serviceDay();
    var order = [1, 2, 3, 4, 5, 6, 0];
    box.innerHTML = '<dl class="hours">' + order.map(function (d) {
      var r = h[d];
      var range = r ? fmtTime(toMin(r[0])) + " – " + fmtTime(toMin(r[1])) : t("loc.closed");
      var cur = d === today ? ' class="is-today" aria-current="date"' : "";
      return "<div" + cur + "><dt>" + dayName(d) + "</dt><dd>" + range + "</dd></div>";
    }).join("") + "</dl>";
  }

  /* ---------- dirección y mapa ---------- */
  function applyLocation() {
    var addr = $("[data-address]");
    if (addr) addr.textContent = C.address || t("loc.addressPending");
    var phone = $("[data-phone]");
    if (phone) {
      phone.hidden = !C.phone;
      var a = $("a", phone);
      if (a && C.phone) {
        a.textContent = C.phone;
        a.setAttribute("href", "tel:" + C.phone.replace(/[^\d+]/g, ""));
      }
    }
    var canMap = !!(L.mapEmbed || C.address);
    var facade = $("[data-map]");
    if (facade && !facade.classList.contains("is-loaded")) {
      $(".map-load", facade).hidden = !canMap;
      $(".map-note", facade).hidden = !canMap;
      $(".map-pending", facade).hidden = canMap;
    }
    var frame = $("[data-map] iframe");
    if (frame) frame.title = t("loc.mapTitle");
  }

  function loadMap() {
    var facade = $("[data-map]");
    var src = L.mapEmbed || ("https://www.google.com/maps?q=" + enc(C.address || "") + "&output=embed");
    var f = document.createElement("iframe");
    f.src = src;
    f.title = t("loc.mapTitle");
    f.loading = "lazy";
    f.referrerPolicy = "no-referrer-when-downgrade";
    f.setAttribute("allowfullscreen", "");
    facade.innerHTML = "";
    facade.appendChild(f);
    facade.classList.add("is-loaded");
  }

  /* ---------- menú y reseñas (solo datos reales de config) ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pick(v) { return v && typeof v === "object" ? (v[lang] || v.en || v.es || "") : (v || ""); }

  function applyMenu() {
    var list = $("[data-menu]"), empty = $("[data-menu-empty]");
    var items = (C.menu || []).slice(0, 6);
    if (!list) return;
    list.hidden = !items.length;
    if (empty) empty.hidden = !!items.length;
    list.innerHTML = items.map(function (it) {
      return '<li class="menu-item"><p class="menu-row"><span class="menu-name">' + esc(it.name) +
        '</span><span class="menu-leader" aria-hidden="true"></span><span class="menu-price">' + esc(it.price) +
        "</span></p>" + (pick(it.desc) ? '<p class="menu-desc">' + esc(pick(it.desc)) + "</p>" : "") + "</li>";
    }).join("");
  }

  function applyReviews() {
    var reviews = (C.reviews || []).filter(function (r) { return r && r.text && r.author; });
    var list = $("[data-reviews]"), title = $("[data-proof-title]"), honest = $("[data-proof-honest]");
    if (title) title.textContent = t(reviews.length ? "proof.titleReviews" : "proof.title");
    if (honest) honest.hidden = !!reviews.length;
    if (!list) return;
    list.hidden = !reviews.length;
    list.innerHTML = reviews.map(function (r) {
      var src = r.source ? " " + t("proof.on") + " " + esc(r.source) : "";
      var cite = r.url
        ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.author) + src +
          '<span class="sr-only"> ' + t("external") + "</span></a>"
        : esc(r.author) + src;
      return '<li><figure class="review"><blockquote><p>' + esc(r.text) +
        "</p></blockquote><figcaption>— " + cite + "</figcaption></figure></li>";
    }).join("");
  }

  /* ---------- menú móvil ---------- */
  function initNav() {
    var header = $(".site-header"), btn = $(".nav-toggle");
    if (!header || !btn) return;
    function set(open) {
      header.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    $$(".site-nav a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { set(false); btn.focus(); }
    });
  }

  /* ---------- formulario ---------- */
  function initForm() {
    var form = $("#contact-form");
    if (!form) return;
    var out = $(".form-status", form);
    var send = $('button[type="submit"]', form);
    var fields = [
      { el: form.elements.name, key: "form.err.name" },
      { el: form.elements.email, key: "form.err.email" },
      { el: form.elements.message, key: "form.err.message" }
    ];

    function showError(f, show) {
      var msg = document.getElementById(f.el.id + "-error");
      f.el.setAttribute("aria-invalid", String(show));
      if (msg) { msg.textContent = show ? t(f.key) : ""; msg.hidden = !show; }
    }

    fields.forEach(function (f) {
      f.el.addEventListener("input", function () {
        if (f.el.getAttribute("aria-invalid") === "true") showError(f, !f.el.value.trim() || !f.el.checkValidity());
      });
    });

    function say(key, kind) {
      out.textContent = t(key);
      out.setAttribute("data-kind", kind);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) {
        var bad = !f.el.value.trim() || !f.el.checkValidity();
        showError(f, bad);
        if (bad && !firstBad) firstBad = f.el;
      });
      if (firstBad) { firstBad.focus(); return; }
      if (form.elements.company && form.elements.company.value) return; // trampa anti-spam

      var cfg = C.form || {};
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();

      if (cfg.endpoint) {
        send.disabled = true;
        send.textContent = t("form.sending");
        fetch(cfg.endpoint, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, email: email, message: message, lang: lang })
        }).then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          say("form.ok", "ok");
        }).catch(function () {
          say("form.err.network", "error");
        }).then(function () {
          send.disabled = false;
          send.textContent = t("form.send");
        });
      } else if (cfg.email) {
        window.location.href = "mailto:" + cfg.email +
          "?subject=" + enc("A Tope Burguer — " + name) +
          "&body=" + enc(message + "\n\n" + name + " <" + email + ">");
        say("form.mailto", "ok");
      } else {
        say("form.notConnected", "error");
      }
    });
  }

  /* ---------- arranque ---------- */
  function render() {
    applyText();
    applyLinks();
    applyStatus();
    applyHours();
    applyLocation();
    applyMenu();
    applyReviews();
  }

  lang = detectLang();
  render();

  $$("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });
  var mapBtn = $(".map-load");
  if (mapBtn) mapBtn.addEventListener("click", loadMap);
  var year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  initNav();
  initForm();
  setInterval(applyStatus, 60000);
})();
