if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('SW aktif'))
    .catch(err => console.error('SW gagal:', err));
}

document.addEventListener("DOMContentLoaded", async () => {
  const daysRail = document.getElementById("daysRail");
  const daysContainer = document.getElementById("daysContainer");
  const status = document.getElementById("status");
  const classBtns = document.querySelectorAll(".class-btn");

  let schedules = {};

  try {
    const res = await fetch("jadwal.json");
    schedules = await res.json();
  } catch (e) {
    status.textContent = "Gagal memuat jadwal pelajaran!";
    console.error(e);
    return;
  }

  const WEEK_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  function getTodayName() {
    const n = new Date().getDay();
    return n >= 1 && n <= 5 ? WEEK_ORDER[n - 1] : null;
  }

  function parseRangeToMinutes(range) {
    if (!range || !range.includes("-")) return [0, 0];
    const [a, b] = range.split("-").map((s) => s.trim());
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return [ah * 60 + am, bh * 60 + bm];
  }

  function highlightActivePeriods() {
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const todayName = getTodayName();

    document
      .querySelectorAll(".copy-today-card tr.active")
      .forEach((tr) => tr.classList.remove("active"));

    const trs = document.querySelectorAll(
      `.copy-today-card[data-day="${todayName}"] [data-range]`
    );
    trs.forEach((tr) => {
      const [start, end] = JSON.parse(tr.getAttribute("data-range"));
      tr.classList.toggle("active", curMins >= start && curMins <= end);
    });
  }

  function populateDaysRail(selectedClassData, todayName) {
    daysRail.innerHTML = "";
    WEEK_ORDER.forEach((day) => {
      const pill = document.createElement("button");
      pill.className = "day-pill " + (day === todayName ? "today" : "");
      pill.innerHTML = `
        <div class="day-name">${day}${
          day === todayName ? " • Hari Ini" : ""
        }</div>
        <div class="day-sub">${
          selectedClassData[day] ? selectedClassData[day].length : 0
        } Jam</div>`;

      pill.addEventListener("click", () => {
        const card = document.querySelector(
          `[data-day="${day}"]:not(.copy-today-card)`
        );
        if (card)
          card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      daysRail.appendChild(pill);
    });
  }

  function renderDayCard(day, selectedKey, slots, isCopy = false) {
    const card = document.createElement("article");
    card.className = "day-card" + (isCopy ? " copy-today-card" : "");
    card.setAttribute("data-day", day);

    const hdr = document.createElement("div");
    hdr.className = "day-header";
    hdr.innerHTML = `
      <div class="day-title">${day}${isCopy ? " • Hari Ini" : ""}</div>
      <div class="day-meta">${selectedKey} — ${slots.length} Jam</div>`;
    card.appendChild(hdr);

    const horiz = document.createElement("div");
    horiz.className = "horizontal-scroll";
    const tbl = document.createElement("table");
    tbl.className = "table";
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Jam Ke</th><th>Waktu</th><th>Kode</th><th>Mapel</th><th>Guru</th>
        </tr>
      </thead>`;
    const tbody = document.createElement("tbody");

    const customSlots = [];

    if (day === "Senin") {
      customSlots.push({ label: "Upacara Bendera", waktu: "06:30 - 07:15" });
    } else if (day === "Jumat") {
      customSlots.push({ label: "Sholat Dhuha", waktu: "06:30 - 07:30" });
    } else {
      customSlots.push({ label: "Sholat Dhuha", waktu: "06:30 - 07:15" });
    }

    let fullSlots = [...slots];

    fullSlots.unshift({
      jamKe: "",
      waktu: customSlots[0].waktu,
      code: "",
      mapel: customSlots[0].label,
      guru: "",
      isCustom: true,
    });

    fullSlots = fullSlots.flatMap((slot) => {
      const arr = [slot];

      if (day === "Jumat") {
        if (slot.jamKe === 2) {
          arr.push({
            jamKe: "",
            waktu: "08:50 - 09:20",
            mapel: "Istirahat",
            isCustom: true,
          });
        }
      } else {
        if (slot.jamKe === 4)
          arr.push({
            jamKe: "",
            waktu: "09:55 - 10:15",
            mapel: "Istirahat",
            isCustom: true,
          });
        if (slot.jamKe === 7)
          arr.push({
            jamKe: "",
            waktu: "12:15 - 12:45",
            mapel: "Istirahat / Sholat Dzuhur",
            isCustom: true,
          });
      }

      return arr;
    });

    fullSlots.forEach((slot) => {
      const [start, end] = parseRangeToMinutes(slot.waktu);
      const tr = document.createElement("tr");
      tr.setAttribute("data-range", JSON.stringify([start, end]));
      if (slot.isCustom) tr.classList.add("custom-slot");

      tr.innerHTML = `
        <td>${slot.jamKe || ""}</td>
        <td>${slot.waktu}</td>
        <td>${slot.code || ""}</td>
        <td>${slot.mapel}</td>
        <td>${slot.guru || ""}</td>`;
      tbody.appendChild(tr);
    });

    tbl.appendChild(tbody);
    horiz.appendChild(tbl);
    card.appendChild(horiz);

    return card;
  }

  function renderSchedule(selectedKey) {
    daysContainer.innerHTML = "";
    const selected = schedules[selectedKey];
    if (!selected) {
      status.textContent = "Tidak ada jadwal untuk " + selectedKey;
      return;
    }

    status.style.display = "none";
    const today = getTodayName();
    populateDaysRail(selected, today);

    const order = WEEK_ORDER;

    if (today && selected[today]) {
      const copyCard = renderDayCard(today, selectedKey, selected[today], true);
      daysContainer.appendChild(copyCard);
    }

    order.forEach((day, idx) => {
      const slots = Array.isArray(selected[day]) ? selected[day] : [];
      const card = renderDayCard(day, selectedKey, slots, false);
      card.style.animationDelay = `${idx * 70}ms`;
      daysContainer.appendChild(card);
    });

    highlightActivePeriods();
    if (window.__jadwalInterval) clearInterval(window.__jadwalInterval);
    window.__jadwalInterval = setInterval(highlightActivePeriods, 15000);
  }

  const emojiMap = {
    TJKT: "💻",
    TO: "🔧",
    FARMASI: "💊",
    APHP: "🌿",
  };

  classBtns.forEach((btn) => {
    const key = btn.getAttribute("data-class") || "";
    const text = key.toUpperCase();

    for (const [jurusan, emoji] of Object.entries(emojiMap)) {
      if (text.includes(jurusan)) {
        btn.textContent = `${emoji} ${btn.textContent}`;
      }
    }

    if (text.includes("TJKT")) btn.classList.add("tjkt");
    else if (text.includes("TO")) btn.classList.add("to");
    else if (text.includes("FARMASI")) btn.classList.add("farmasi");
    else if (text.includes("APHP")) btn.classList.add("aphp");

    if (text.startsWith("10")) btn.classList.add("kelas10");
    else if (text.startsWith("11")) btn.classList.add("kelas11");
    else if (text.startsWith("12")) btn.classList.add("kelas12");
  });

  classBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      classBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.getAttribute("data-class");
      localStorage.setItem("lastClass", key);
      renderSchedule(key);
    });
  });

  const lastClass = localStorage.getItem("lastClass");

  if (lastClass && schedules[lastClass]) {
    document
      .querySelector(`.class-btn[data-class="${lastClass}"]`)
      ?.classList.add("active");
    renderSchedule(lastClass);
  } else {
    status.style.display = "block";
    status.textContent =
      "Silakan pilih kelas terlebih dahulu untuk melihat jadwal.";
    daysContainer.innerHTML = "";
  }
});
