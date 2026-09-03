const ROOMS = ["Abhishek Pandey's Cabin", "Ajay Panjnani's Cabin", "Ajay Bhamare's Cabin", "Conference Room"];
const START = 9 * 60 + 30, END = 18 * 60 + 30, STEP = 15;
const STORAGE_KEY = "absli-workspace-bookings-v1";
const slots = Array.from({ length: (END - START) / STEP }, (_, i) => START + i * STEP);
let selectedSlots = new Set();
let cancellingId = null;

const $ = (id) => document.getElementById(id);
const isoToday = () => new Date().toISOString().slice(0, 10);
const readBookings = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveBookings = (bookings) => localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
const timeText = (minutes) => { const h = Math.floor(minutes / 60), m = minutes % 60; return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const timeValue = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const parseTime = (value) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
const prettyDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function toast(message, error = false) { const el = document.createElement("div"); el.className = `toast${error ? " error" : ""}`; el.textContent = message; $("toastRegion").append(el); setTimeout(() => el.remove(), 3500); }
function overlaps(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && aEnd > bStart; }
function roomFree(room, date, start, end, excludeId) { return !readBookings().some(b => b.room === room && b.date === date && b.id !== excludeId && overlaps(start, end, parseTime(b.start), parseTime(b.end))); }
function populateSelects() {
  ["room", "roomFilter"].forEach(id => { const select = $(id); ROOMS.forEach(room => { const o = new Option(room, room); select.add(o); }); });
  slots.concat([END]).forEach(min => { const option = new Option(timeText(min), timeValue(min)); $("startTime").add(option.cloneNode(true)); $("endTime").add(option); });
}
function renderTimeline() {
  const date = $("selectedDate").value, bookings = readBookings().filter(b => b.date === date);
  $("dateSummary").textContent = prettyDate(date);
  const grid = $("timeline"); grid.innerHTML = "";
  const corner = document.createElement("div"); corner.className = "corner time-label"; grid.append(corner);
  slots.forEach((min, index) => { const label = document.createElement("div"); label.className = "time-label"; label.textContent = index % 4 === 0 ? timeText(min) : ""; grid.append(label); });
  ROOMS.forEach(room => {
    const roomLabel = document.createElement("div"); roomLabel.className = "room-label"; roomLabel.textContent = room; grid.append(roomLabel);
    const current = bookings.filter(b => b.room === room);
    slots.forEach((min, index) => {
      const slot = document.createElement("button"); slot.type = "button"; slot.className = "slot"; slot.dataset.room = room; slot.dataset.time = min;
      const booking = current.find(b => min >= parseTime(b.start) && min < parseTime(b.end));
      const selected = selectedSlots.has(`${room}-${min}`);
      if (booking) { const first = min === parseTime(booking.start), last = min + STEP === parseTime(booking.end); slot.classList.add(first ? "booked-start" : last ? "booked-end" : "booked-middle", "unavailable"); slot.title = `${booking.title} — ${booking.organizer}`; if (first) { const label = document.createElement("span"); label.className = "booking-label"; label.textContent = booking.title; slot.append(label); } }
      else if (selected) slot.classList.add("selected");
      else slot.title = `Book ${room} at ${timeText(min)}`;
      slot.addEventListener("click", () => { if (!booking) openBooking(room, min); }); grid.append(slot);
    });
  });
}
function renderBookings() {
  const roomFilter = $("roomFilter").value, query = $("searchBookings").value.toLowerCase();
  const list = readBookings().filter(b => b.date >= isoToday()).filter(b => roomFilter === "all" || b.room === roomFilter).filter(b => `${b.title} ${b.organizer} ${b.room}`.toLowerCase().includes(query)).sort((a,b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const wrap = $("bookingsList"); wrap.innerHTML = "";
  if (!list.length) { wrap.innerHTML = `<div class="empty-state">No upcoming bookings yet.</div>`; return; }
  list.forEach(b => { const d = new Date(`${b.date}T12:00:00`); const card = document.createElement("article"); card.className = "booking-card"; card.innerHTML = `<div class="booking-date"><strong>${d.getDate()}</strong><small>${d.toLocaleDateString("en-IN",{month:"short"})}</small></div><div class="booking-info"><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.room)} · ${timeText(parseTime(b.start))} – ${timeText(parseTime(b.end))} · ${escapeHtml(b.organizer)}</p></div><button class="cancel-booking" data-id="${b.id}" type="button">Cancel</button>`; wrap.append(card); });
  wrap.querySelectorAll(".cancel-booking").forEach(btn => btn.addEventListener("click", () => { cancellingId = btn.dataset.id; $("cancelDialogBox").showModal(); }));
}
function escapeHtml(v) { const el = document.createElement("div"); el.textContent = v; return el.innerHTML; }
function setTimeOptions(startMin) { [...$("endTime").options].forEach(o => o.disabled = parseTime(o.value) <= startMin); if (parseTime($("endTime").value) <= startMin) $("endTime").value = timeValue(startMin + STEP); }
function openBooking(room, start) { selectedSlots.clear(); if (room && start !== undefined) selectedSlots.add(`${room}-${start}`); $("formError").textContent = ""; $("bookingDate").value = $("selectedDate").value; $("room").value = room || ROOMS[0]; $("startTime").value = timeValue(start ?? START); setTimeOptions(start ?? START); $("bookingDialog").showModal(); renderTimeline(); }
function closeBooking() { selectedSlots.clear(); $("bookingForm").reset(); $("bookingDialog").close(); renderTimeline(); }

populateSelects();
$("selectedDate").min = isoToday(); $("selectedDate").value = isoToday();
$("bookingDate").min = isoToday();
renderTimeline(); renderBookings();
$("selectedDate").addEventListener("change", () => { selectedSlots.clear(); renderTimeline(); });
$("openBookingBtn").addEventListener("click", () => openBooking());
$("closeDialog").addEventListener("click", closeBooking); $("cancelDialog").addEventListener("click", closeBooking);
$("startTime").addEventListener("change", e => setTimeOptions(parseTime(e.target.value)));
$("roomFilter").addEventListener("change", renderBookings); $("searchBookings").addEventListener("input", renderBookings);
$("bookingForm").addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.currentTarget), data = Object.fromEntries(f); const start = parseTime(data.startTime), end = parseTime(data.endTime); const error = $("formError");
  if (end <= start) { error.textContent = "Choose an end time after the start time."; return; }
  if (!roomFree(data.room, data.bookingDate, start, end)) { error.textContent = "This room is already booked at that time. Choose another time."; return; }
  const bookings = readBookings(); bookings.push({ id: crypto.randomUUID(), title: data.meetingTitle.trim() || "Meeting", organizer: data.organizer.trim(), room: data.room, date: data.bookingDate, start: data.startTime, end: data.endTime, createdAt: Date.now() }); saveBookings(bookings); closeBooking(); renderBookings(); toast("Room booked successfully.");
});
$("keepBooking").addEventListener("click", () => $("cancelDialogBox").close());
$("confirmCancel").addEventListener("click", () => { if (!cancellingId) return; saveBookings(readBookings().filter(b => b.id !== cancellingId)); cancellingId = null; $("cancelDialogBox").close(); renderTimeline(); renderBookings(); toast("Booking cancelled. The room is free again."); });
