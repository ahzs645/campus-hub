# Widget Ideas for Campus Hub

A brainstorm of new widget ideas organized by category. Each idea considers what would be useful on campus digital signage displays and what fits naturally into the existing widget architecture (self-contained component + options panel, URL-configurable props, responsive scaling).

---

## Academic & Scheduling

### 1. Countdown Timer
A configurable countdown to a specific date/time — finals week, spring break, graduation, application deadlines, etc. Could show days/hours/minutes/seconds with an optional label and celebration animation when it hits zero.

**Why it fits:** Simple, glanceable, and universally useful on campus displays. No external API needed.

### 2. Room Schedule / Availability
Shows the current and upcoming bookings for a specific room (classroom, meeting room, study space). Highlights whether the room is currently free or occupied with a clear visual indicator. Could pull from a JSON endpoint or iCal feed.

**Why it fits:** Extremely practical when mounted outside rooms. Leverages the existing iCal/JSON fetching infrastructure.

### 3. Exam Schedule
Displays upcoming exams filtered by department, course, or date range. Sourced from a JSON endpoint. Could highlight "today's exams" prominently.

**Why it fits:** High-value seasonal content during midterms/finals.

---

## Social & Community

### 4. Social Media Feed
Aggregates recent posts from the institution's social accounts (Instagram, X/Twitter, Bluesky) via a JSON proxy. Shows images, text, and engagement counts in a scrolling card layout.

**Why it fits:** Keeps signage feeling alive and current. Follows the same JSON-fetch + polling pattern as existing widgets.

### 5. Lost & Found Board
A feed of recently reported lost or found items, sourced from a JSON endpoint. Each entry shows an optional image, description, location, and date. Could cycle through entries automatically.

**Why it fits:** Practical campus utility that benefits from high-visibility signage placement.

### 6. Student Club / Org Spotlight
Rotates through featured student organizations showing their logo, description, meeting times, and a QR code to their page. Sourced from a JSON feed.

**Why it fits:** Promotes campus engagement. Combines existing patterns (QR code generation, image display, carousel rotation).

### 7. Shoutouts / Kudos Board
Displays public shoutouts or thank-you messages submitted by students and staff. Could moderate via a simple JSON API. Messages rotate with a fade or slide transition.

**Why it fits:** Builds community. Lightweight to implement — just a styled text carousel.

---

## Health, Safety & Environment

### 8. Campus Alert / Emergency Banner
A high-priority overlay or banner widget that can display emergency alerts, weather warnings, or campus safety notices. Supports severity levels (info, warning, critical) with corresponding color coding. Polls a JSON endpoint and only shows when there is an active alert.

**Why it fits:** Critical for campus safety. Could integrate with existing campus alert systems. Naturally overlays other widgets.

### 9. Pollen / Allergy Forecast
Shows daily pollen count and allergy severity sourced from a public API. Displays the dominant allergen type (tree, grass, ragweed) and a severity scale.

**Why it fits:** Useful health info, especially for outdoor-adjacent displays. Simple API integration.

### 10. UV Index
Displays the current UV index with a visual scale and sun protection recommendations. Complements the existing weather widget for outdoor signage.

**Why it fits:** Small, single-purpose — good as a compact companion widget.

---

## Campus Services & Utilities

### 11. Parking Availability
Shows real-time availability of campus parking lots/garages. Displays lot name, capacity, and spots remaining with color-coded status (green/yellow/red). Sourced from a JSON endpoint.

**Why it fits:** High-demand info for commuter campuses. Perfect for entrance/lobby displays.

### 12. Printer / Lab Status
Shows which computer labs or printers are online, busy, or offline. Could show queue depth for print stations. Sourced from a JSON endpoint.

**Why it fits:** Saves students trips to occupied labs. Practical utility widget.

### 13. Laundry Room Status
For residential campuses — shows washer/dryer availability by building. Displays machine status (available, in use, cycle time remaining). Many campuses already have APIs for this via services like CSCPay or LaundryView.

**Why it fits:** Extremely popular with residential students. Clear visual display.

### 14. Campus Map / Wayfinding
A static or interactive map image showing a "You Are Here" marker and key landmarks. Can highlight specific buildings, departments, or event locations. Uses the existing Image widget pattern with labeled overlay points from a JSON config.

**Why it fits:** Natural fit for lobby and entrance signage.

---

## Data & Analytics

### 15. Stats / KPI Dashboard
Displays numeric statistics with optional trend indicators (up/down arrows). Configurable title, value, unit, and comparison period. Useful for enrollment numbers, library visits, sustainability metrics, etc. Sourced from a JSON endpoint.

**Why it fits:** Flexible and reusable. Institutions love displaying impact metrics.

### 16. Chart / Graph Widget
Renders simple bar, line, or pie charts from a JSON data source. Supports labels, colors, and auto-scaling. Could use a lightweight charting approach (CSS-based or canvas).

**Why it fits:** Pairs with the Stats widget for richer data storytelling. Useful for sustainability dashboards, enrollment trends, etc.

### 17. Poll / Survey Results
Displays live results of an active poll or survey as a bar chart or pie chart. Could show the question, response options, and percentage breakdown. Sourced from a JSON endpoint and polled on an interval.

**Why it fits:** Interactive feel even on a non-touch display. Pair with a QR code so viewers can vote from their phone.

---

## Fun & Engagement

### 18. Daily Trivia / Fun Fact
Displays a rotating trivia question or fun fact, sourced from a JSON feed or a public API. Could reveal the answer after a configurable delay. Can be themed to campus history, academic subjects, or general knowledge.

**Why it fits:** Adds personality to displays. Lightweight and delightful.

### 19. Photo of the Day
Features a daily highlighted photo — campus photography, student submissions, nature shots, or pulled from a curated feed. Shows the image with an optional caption and photographer credit.

**Why it fits:** Visually striking on signage. Builds on the existing Image widget with auto-rotation logic.

### 20. Spotify / Now Playing
Shows what's currently playing on a campus radio station or curated Spotify playlist. Displays album art, track name, and artist. Could use Spotify's public API or a JSON proxy.

**Why it fits:** Adds ambient personality to common spaces like student unions or cafeterias.

### 21. Joke / Quote of the Day
Displays a daily inspirational quote or joke with attribution. Can pull from a public API or a curated JSON list. Rotates on a configurable interval.

**Why it fits:** Low-effort, high-charm. Keeps displays feeling fresh.

---

## Transportation & Logistics

### 22. Bike Share / Scooter Availability
Shows nearby bike share or e-scooter dock availability using GBFS (General Bikeshare Feed Specification), which is an open standard supported by most providers. Displays station name, available bikes, and open docks.

**Why it fits:** Complements the existing BusConnection widget for multi-modal transit info. GBFS is a well-defined, open standard.

### 23. Campus Shuttle Tracker
A simplified map or list view showing campus shuttle positions and ETAs to key stops. Sourced from GTFS-realtime (already a dependency) or a campus-specific API.

**Why it fits:** Natural extension of the existing BusConnection widget and GTFS infrastructure.

---

## Operational & Administrative

### 24. Hours of Operation
Displays today's hours for a specific facility (library, gym, dining hall, health center) with clear open/closed status. Highlights any special hours or closures. Sourced from a JSON config or endpoint.

**Why it fits:** One of the most-asked questions on any campus. Perfect for building entrance signage.

### 25. Directory / Contact List
Shows a scrollable or paginated list of department contacts, office locations, and phone numbers. Can filter by building or department. Sourced from a JSON endpoint.

**Why it fits:** Useful for administrative building lobbies and info kiosks.

### 26. Maintenance / Outage Status
Displays current campus service outages or planned maintenance (network, water, HVAC, elevators). Shows status, affected area, and estimated resolution time. Sourced from a JSON endpoint.

**Why it fits:** Keeps the campus community informed. High-visibility placement reduces support calls.

---

## Summary Table

| # | Widget | Complexity | External API? | Priority |
|---|--------|-----------|---------------|----------|
| 1 | Countdown Timer | Low | No | High |
| 2 | Room Schedule | Medium | iCal/JSON | High |
| 3 | Exam Schedule | Medium | JSON | Medium |
| 4 | Social Media Feed | Medium | JSON proxy | Medium |
| 5 | Lost & Found Board | Low | JSON | Low |
| 6 | Club Spotlight | Low | JSON | Medium |
| 7 | Shoutouts / Kudos | Low | JSON | Low |
| 8 | Campus Alert Banner | Medium | JSON | High |
| 9 | Pollen Forecast | Low | API | Low |
| 10 | UV Index | Low | API | Low |
| 11 | Parking Availability | Medium | JSON | High |
| 12 | Printer / Lab Status | Medium | JSON | Medium |
| 13 | Laundry Room Status | Medium | JSON/API | Medium |
| 14 | Campus Map | Medium | Static + JSON | Medium |
| 15 | Stats / KPI Dashboard | Low | JSON | High |
| 16 | Chart Widget | High | JSON | Medium |
| 17 | Poll Results | Medium | JSON | Medium |
| 18 | Daily Trivia | Low | JSON/API | Low |
| 19 | Photo of the Day | Low | JSON | Low |
| 20 | Spotify / Now Playing | Medium | API | Low |
| 21 | Quote of the Day | Low | JSON/API | Low |
| 22 | Bike Share Availability | Medium | GBFS | Low |
| 23 | Shuttle Tracker | High | GTFS-RT | Medium |
| 24 | Hours of Operation | Low | JSON | High |
| 25 | Directory / Contacts | Low | JSON | Medium |
| 26 | Maintenance Status | Low | JSON | Medium |
