// One script, three platforms. Each page sets <body data-platform="..."> and this file
// builds the same screen with that company's name, colour and login.
(function () {
  "use strict";

  var PLATFORMS = {
    quickride: { name: "QuickRide", icon: "🚕", kind: "Ride-hailing", role: "driver", color: "#96610f", email: "admin@quickride.demo" },
    homefix:   { name: "HomeFix",   icon: "🔧", kind: "Home services", role: "technician", color: "#2563c9", email: "admin@homefix.demo" },
    fooddash:  { name: "FoodDash",  icon: "🍱", kind: "Food delivery", role: "delivery partner", color: "#c2410c", email: "admin@fooddash.demo" }
  };
  var DEMO_PASSWORD = "demo123"; // demo accounts only
  var CATEGORIES = ["sexual_harassment", "sexual_assault", "stalking", "physical_assault", "verbal_abuse", "threats_intimidation", "voyeurism"];
  var SAMPLE = { name: "Ravi Kumar", phone: "98765 01234", idToken: "DL-0420" };

  var id = document.body.dataset.platform;
  var P = PLATFORMS[id];
  var API = new URLSearchParams(location.search).get("api") || "https://oneban.onrender.com";
  var STORE_KEY = "oneban-demo-" + id;
  var TOKEN_KEY = "oneban-token-" + id;

  // ---------- small helpers ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "class") node.className = attrs[k];
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.append(c); });
    return node;
  }
  function label(s) { return String(s).replace(/_/g, " "); }
  function digits(s) { return String(s).replace(/\D/g, "").slice(-10); }
  function read(store, key, fallback) { try { return JSON.parse(store.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function write(store, key, value) { try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }

  var workers = read(localStorage, STORE_KEY, []);
  function saveWorkers() { write(localStorage, STORE_KEY, workers); }

  // ---------- talking to the OneBan API ----------
  async function request(path, body, token) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    var res = await fetch(API + path, { method: "POST", headers: headers, body: JSON.stringify(body) });
    var data = await res.json().catch(function () { return {}; });
    return { status: res.status, data: data };
  }
  async function getToken(fresh) {
    var token = fresh ? null : read(sessionStorage, TOKEN_KEY, null);
    if (token) return token;
    var r = await request("/auth/login", { email: P.email, password: DEMO_PASSWORD });
    if (r.status !== 200) throw new Error(r.data.error || "Could not sign in to the safety network");
    write(sessionStorage, TOKEN_KEY, r.data.token);
    return r.data.token;
  }
  // Signs in as this platform, and signs in again once if the saved login has expired
  async function network(path, body) {
    var r = await request(path, body, await getToken(false));
    if (r.status === 401) r = await request(path, body, await getToken(true));
    if (r.status >= 400) throw new Error(r.data.error || "The safety network returned an error");
    return r.data;
  }

  // ---------- page ----------
  document.documentElement.style.setProperty("--brand", P.color);
  var app = document.getElementById("app");
  var result = el("div", { class: "result", role: "status", "aria-live": "polite" });
  var list = el("div", { class: "workers" });
  var toast = el("div", { class: "toast", role: "status", "aria-live": "polite" });

  var nameIn = el("input", { id: "f-name", required: true, autocomplete: "off", placeholder: "Full name" });
  var phoneIn = el("input", { id: "f-phone", required: true, inputmode: "tel", autocomplete: "off", placeholder: "10-digit mobile number" });
  var idIn = el("input", { id: "f-id", autocomplete: "off", placeholder: "e.g. DL-0420" });
  var submitBtn = el("button", { class: "primary", type: "submit", text: "Submit application" });

  function field(labelText, input, hint) {
    return el("label", { class: "field", for: input.id }, [
      el("span", { text: labelText }), input, hint ? el("small", { text: hint }) : null
    ]);
  }

  function setBusy(message) {
    result.className = "result busy";
    result.replaceChildren(el("p", { text: message }));
  }

  async function apply(e) {
    e.preventDefault();
    var applicant = { name: nameIn.value.trim(), phone: phoneIn.value.trim(), idToken: idIn.value.trim() };
    if (digits(applicant.phone).length !== 10) {
      result.className = "result error";
      result.replaceChildren(el("p", { text: "Enter a 10-digit mobile number." }));
      phoneIn.focus();
      return;
    }
    submitBtn.disabled = true;
    setBusy("Checking the OneBan safety network…");
    var slow = setTimeout(function () {
      setBusy("Waking the server. The first check after a quiet spell can take up to a minute…");
    }, 4000);

    try {
      var body = { phone: applicant.phone };
      if (applicant.idToken) body.idToken = applicant.idToken;
      var data = await network("/check", body);

      if (data.match) {
        result.className = "result blocked";
        result.replaceChildren(
          el("h3", { text: "Application stopped" }),
          el("p", { text: applicant.name + " matches " + data.incidents.length + (data.incidents.length === 1 ? " report" : " reports") + " on the safety network:" }),
          el("ul", {}, data.incidents.map(function (inc) {
            return el("li", {}, [
              el("b", { text: label(inc.category) }),
              document.createTextNode(" · " + inc.severity + " severity · banned by "),
              el("b", { text: inc.reportedBy }),
              document.createTextNode(" on " + inc.date)
            ]);
          })),
          el("p", { class: "fine", text: "Not approved. Sent to " + P.name + "'s trust and safety team for review." })
        );
      } else {
        applicant.status = "active";
        workers.unshift(applicant);
        saveWorkers();
        renderWorkers();
        result.className = "result ok";
        result.replaceChildren(
          el("h3", { text: "Approved" }),
          el("p", { text: "No reports on the safety network. " + applicant.name + " can start as a " + P.role + "." })
        );
        e.target.reset();
      }
    } catch (err) {
      result.className = "result error";
      result.replaceChildren(el("p", { text: err.message === "Failed to fetch" ? "Could not reach the safety network. Check the connection and try again." : err.message }));
    } finally {
      clearTimeout(slow);
      submitBtn.disabled = false;
    }
  }

  // ----- ban dialog -----
  var banTarget = null;
  var categorySel = el("select", { id: "b-cat" }, CATEGORIES.map(function (c) { return el("option", { value: c, text: label(c) }); }));
  var severitySel = el("select", { id: "b-sev" }, ["high", "medium", "low"].map(function (s) { return el("option", { value: s, text: s }); }));
  var cityIn = el("input", { id: "b-city", value: "Delhi" });
  var verifiedBox = el("input", { type: "checkbox", id: "b-verified" });
  var confirmBtn = el("button", { class: "danger", type: "submit", text: "Ban and share with network", disabled: true });
  var banError = el("p", { class: "dialog-error", role: "alert" });
  var banTitle = el("h3", {});
  verifiedBox.addEventListener("change", function () { confirmBtn.disabled = !verifiedBox.checked; });

  var dialog = el("dialog", { class: "ban-dialog" }, [
    el("form", { onsubmit: confirmBan }, [
      banTitle,
      el("p", { class: "fine", text: "Only a keyed hash of the phone and ID number is shared. The name and number stay inside " + P.name + "." }),
      field("Offence", categorySel),
      field("Severity", severitySel),
      field("City", cityIn),
      el("label", { class: "checkline", for: "b-verified" }, [verifiedBox, el("span", { text: "This complaint was investigated and verified" })]),
      banError,
      el("div", { class: "dialog-actions" }, [
        el("button", { type: "button", text: "Cancel", onclick: function () { dialog.close(); } }),
        confirmBtn
      ])
    ])
  ]);

  function openBan(worker) {
    banTarget = worker;
    banTitle.textContent = "Ban " + worker.name + "?";
    banError.textContent = "";
    verifiedBox.checked = false;
    confirmBtn.disabled = true;
    dialog.showModal();
  }

  async function confirmBan(e) {
    e.preventDefault();
    confirmBtn.disabled = true;
    banError.textContent = "";
    try {
      var body = { phone: banTarget.phone, category: categorySel.value, severity: severitySel.value, city: cityIn.value.trim() || "Unknown" };
      if (banTarget.idToken) body.idToken = banTarget.idToken;
      await network("/signal", body);
      banTarget.status = "banned";
      saveWorkers();
      renderWorkers();
      dialog.close();
      showToast(banTarget.name + " is banned. Every other platform on the network will now be warned.");
    } catch (err) {
      banError.textContent = err.message === "Failed to fetch" ? "Could not reach the safety network. Try again." : err.message;
      confirmBtn.disabled = !verifiedBox.checked;
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 6000);
  }

  function renderWorkers() {
    if (!workers.length) {
      list.replaceChildren(el("p", { class: "empty", text: "No " + P.role + "s yet. Approve an application to see it here." }));
      return;
    }
    list.replaceChildren.apply(list, workers.map(function (w) {
      var banned = w.status === "banned";
      return el("div", { class: "worker" + (banned ? " is-banned" : "") }, [
        el("div", { class: "who" }, [
          el("b", { text: w.name }),
          el("span", { text: w.phone + (w.idToken ? " · " + w.idToken : "") })
        ]),
        el("span", { class: "pill " + (banned ? "pill-banned" : "pill-active"), text: banned ? "Banned" : "Active" }),
        banned ? null : el("button", { class: "danger-outline", type: "button", text: "Report & ban", onclick: function () { openBan(w); } })
      ]);
    }));
  }

  function nav() {
    return el("nav", { class: "switcher", "aria-label": "Demo platforms" }, [
      el("a", { class: "switch-home", href: "index.html" + location.search, text: "OneBan demo" })
    ].concat(Object.keys(PLATFORMS).map(function (key) {
      var p = PLATFORMS[key];
      return el("a", { href: key + ".html" + location.search, class: key === id ? "current" : "", "aria-current": key === id ? "page" : null, text: p.icon + " " + p.name });
    })));
  }

  app.append(
    nav(),
    el("header", { class: "brand" }, [
      el("div", {}, [el("h1", { text: P.icon + " " + P.name }), el("p", { text: P.kind + " · partner onboarding" })]),
      el("span", { class: "badge", text: "Protected by OneBan" })
    ]),
    el("main", { class: "columns" }, [
      el("section", { class: "card" }, [
        el("h2", { text: "Apply as a " + P.role }),
        el("form", { onsubmit: apply, novalidate: false }, [
          field("Full name", nameIn),
          field("Mobile number", phoneIn),
          field("Driving licence / ID number", idIn, "Optional, but it catches people who change their SIM."),
          el("div", { class: "form-actions" }, [
            submitBtn,
            el("button", { type: "button", class: "link", text: "Fill sample applicant", onclick: function () {
              nameIn.value = SAMPLE.name; phoneIn.value = SAMPLE.phone; idIn.value = SAMPLE.idToken;
            } })
          ])
        ]),
        result
      ]),
      el("section", { class: "card" }, [
        el("div", { class: "card-head" }, [
          el("h2", { text: "Admin · " + P.name + " " + P.role + "s" }),
          el("button", { type: "button", class: "link", text: "Clear list", onclick: function () {
            workers = []; saveWorkers(); renderWorkers();
          } })
        ]),
        list,
        el("p", { class: "fine", text: "Clearing this list only resets this page. Bans already shared with the network stay there." })
      ])
    ]),
    dialog,
    toast
  );
  renderWorkers();
})();
