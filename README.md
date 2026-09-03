# ABSLI Workspace Booking

A standalone internal meeting-room booking interface built with vanilla HTML, CSS, and JavaScript. It requires no framework or build tooling.

## Run locally

From this directory, run:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Reservations are saved in this browser's LocalStorage. They survive refreshes on the same browser/device, but are not shared with other users until a backend is added.

## Included behavior

- 4 named rooms and 15-minute availability schedule from 9:30 AM–6:30 PM
- Overlap prevention and start/end-time validation
- Required email and form validation
- Click-to-book schedule, filtered active reservations, cancellation confirmation, and toast feedback
- Responsive visual design using the ABSLI-inspired color palette
