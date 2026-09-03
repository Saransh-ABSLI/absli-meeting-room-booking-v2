const ROOMS = [
  "Abhishek Pandey's Cabin",
  "Ajay Panjnani's Cabin",
  "Ajay Bhamare's Cabin",
  "Conference Room"
];

const SUPABASE_URL = "https://xiupfpnogfrtcxnitdiu.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pPK60oxH3lbdqLcohvJHRA_ILAMG1Gw";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const START = 9 * 60 + 30;
const END = 18 * 60 + 30;
const STEP = 15;
const slots = Array.from(
  { length: (END - START) / STEP },
  (_, i) => START + i * STEP
);

let selectedSlots = new Set();

const $ = (id) => document.getElementById(id);
const isoToday = () => new Date().toISOString().slice(0, 10);

const timeText = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
};

const timeValue = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;

const parseTime = (value) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

const prettyDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

function toast(message, error = false) {
  const el = document.createElement("div");
  el.className = `toast${error ? " error" : ""}`;
  el.textContent = message;
  $("toastRegion").append(el);
  setTimeout(() => el.remove(), 3500);
}

function escapeHtml(value) {
  const el = document.createElement("div");
  el.textContent = value;
  return el.innerHTML;
}

async function readBookings() {
  const { data, error } = await supabaseClient
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    toast(`Could not load bookings: ${error.message}`, true);
    return [];
  }

  return data.map((booking) => ({
    id: booking.id,
    title: booking.title,
    organizer: booking.organizer,
    room: booking.room,
    date: booking.booking_date,
    start: booking.start_time.slice(0, 5),
    end: booking.end_time.slice(0, 5)
  }));
}

function populateSelects() {
  ["room", "roomFilter"].forEach((id) => {
    const select = $(id);

    ROOMS.forEach((room) => {
      select.add(new Option(room, room));
    });
  });

  slots.concat([END]).forEach((minutes) => {
    const option = new Option(timeText(minutes), timeValue(minutes));
    $("startTime").add(option.cloneNode(true));
    $("endTime").add(option);
  });
}

async function renderTimeline() {
  const date = $("selectedDate").value;
  const bookings = (await readBookings()).filter(
    (booking) => booking.date === date
  );

  $("dateSummary").textContent = prettyDate(date);

  const grid = $("timeline");
  grid.innerHTML = "";

  const corner = document.createElement("div");
  corner.className = "corner time-label";
  grid.append(corner);

  slots.forEach((minutes, index) => {
    const label = document.createElement("div");
    label.className = "time-label";
    label.textContent = index % 4 === 0 ? timeText(minutes) : "";
    grid.append(label);
  });

  ROOMS.forEach((room) => {
    const roomLabel = document.createElement("div");
    roomLabel.className = "room-label";
    roomLabel.textContent = room;
    grid.append(roomLabel);

    const roomBookings = bookings.filter((booking) => booking.room === room);

    slots.forEach((minutes) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "slot";
      slot.dataset.room = room;
      slot.dataset.time = minutes;

      const booking = roomBookings.find(
        (item) =>
          minutes >= parseTime(item.start) &&
          minutes < parseTime(item.end)
      );

      const selected = selectedSlots.has(`${room}-${minutes}`);

      if (booking) {
        const first = minutes === parseTime(booking.start);
        const last = minutes + STEP === parseTime(booking.end);

        slot.classList.add(
          first ? "booked-start" : last ? "booked-end" : "booked-middle",
          "unavailable"
        );

        slot.title = `${booking.title} — ${booking.organizer}`;

        if (first) {
          const label = document.createElement("span");
          label.className = "booking-label";
          label.textContent = booking.title;
          slot.append(label);
        }
      } else if (selected) {
        slot.classList.add("selected");
      } else {
        slot.title = `Book ${room} at ${timeText(minutes)}`;
      }

      slot.addEventListener("click", () => {
        if (!booking) openBooking(room, minutes);
      });

      grid.append(slot);
    });
  });
}

async function renderBookings() {
  const roomFilter = $("roomFilter").value;
  const query = $("searchBookings").value.toLowerCase();

  const list = (await readBookings())
    .filter((booking) => booking.date >= isoToday())
    .filter((booking) => roomFilter === "all" || booking.room === roomFilter)
    .filter((booking) =>
      `${booking.title} ${booking.organizer} ${booking.room}`
        .toLowerCase()
        .includes(query)
    );

  const wrap = $("bookingsList");
  wrap.innerHTML = "";

  if (!list.length) {
    wrap.innerHTML =
      '<div class="empty-state">No upcoming bookings yet.</div>';
    return;
  }

  list.forEach((booking) => {
    const date = new Date(`${booking.date}T12:00:00`);
    const card = document.createElement("article");

    card.className = "booking-card";
    card.innerHTML = `
      <div class="booking-date">
        <strong>${date.getDate()}</strong>
        <small>${date.toLocaleDateString("en-IN", {
          month: "short"
        })}</small>
      </div>
      <div class="booking-info">
        <h3>${escapeHtml(booking.title)}</h3>
        <p>
          ${escapeHtml(booking.room)} ·
          ${timeText(parseTime(booking.start))} –
          ${timeText(parseTime(booking.end))} ·
          ${escapeHtml(booking.organizer)}
        </p>
      </div>
    `;

    wrap.append(card);
  });
}

function setTimeOptions(startMinutes) {
  [...$("endTime").options].forEach((option) => {
    option.disabled = parseTime(option.value) <= startMinutes;
  });

  if (parseTime($("endTime").value) <= startMinutes) {
    $("endTime").value = timeValue(startMinutes + STEP);
  }
}

function openBooking(room, start) {
  selectedSlots.clear();

  if (room && start !== undefined) {
    selectedSlots.add(`${room}-${start}`);
  }

  $("formError").textContent = "";
  $("bookingDate").value = $("selectedDate").value;
  $("room").value = room || ROOMS[0];
  $("startTime").value = timeValue(start ?? START);

  setTimeOptions(start ?? START);
  $("bookingDialog").showModal();

  void renderTimeline();
}

function closeBooking() {
  selectedSlots.clear();
  $("bookingForm").reset();
  $("bookingDialog").close();
  void renderTimeline();
}

populateSelects();

$("selectedDate").min = isoToday();
$("selectedDate").value = isoToday();
$("bookingDate").min = isoToday();

void renderTimeline();
void renderBookings();

$("selectedDate").addEventListener("change", () => {
  selectedSlots.clear();
  void renderTimeline();
});

$("openBookingBtn").addEventListener("click", () => openBooking());

$("closeDialog").addEventListener("click", closeBooking);
$("cancelDialog").addEventListener("click", closeBooking);

$("startTime").addEventListener("change", (event) => {
  setTimeOptions(parseTime(event.target.value));
});

$("roomFilter").addEventListener("change", () => void renderBookings());
$("searchBookings").addEventListener("input", () => void renderBookings());

$("bookingForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const data = Object.fromEntries(form.entries());
  const start = parseTime(data.startTime);
  const end = parseTime(data.endTime);
  const errorMessage = $("formError");

  if (end <= start) {
    errorMessage.textContent = "Choose an end time after the start time.";
    return;
  }

  const { error } = await supabaseClient.rpc("create_booking", {
    p_title: data.meetingTitle || "",
    p_organizer: data.organizer.trim(),
    p_room: data.room,
    p_booking_date: data.bookingDate,
    p_start_time: data.startTime,
    p_end_time: data.endTime
  });

  if (error) {
    errorMessage.textContent =
      error.message || "Could not save the booking. Please try again.";
    return;
  }

  closeBooking();
  void renderBookings();
  toast("Room booked successfully.");
});
