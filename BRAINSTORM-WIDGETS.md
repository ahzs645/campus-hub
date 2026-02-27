# Widget Brainstorm

Ideas for new widget types and feature enhancements for Campus Hub.

## New Widget Ideas

### Campus Life

| Widget | Description | Data Source |
|--------|-------------|-------------|
| **Room Schedule** | Classroom/meeting room bookings with timeline view ("Room 204 - Available until 2:00 PM") | iCal, 25Live, EMS API |
| **Cafeteria Menu** | Daily dining hall menu with meal period tabs (breakfast, lunch, dinner) | RSS/JSON feed |
| **Library Status** | Study room availability, hours, and occupancy | LibCal or library API |
| **Parking Availability** | Lot capacity with color-coded indicators (green/yellow/red) | JSON API |
| **Laundry Status** | Washer/dryer availability for residence halls | Laundry system API |

### Information & Alerts

| Widget | Description | Data Source |
|--------|-------------|-------------|
| **Emergency Alert** | High-priority full-screen overlay that interrupts all other content when active | JSON polling endpoint |
| **Countdown Timer** | Countdown to a target event (finals, graduation, semester start) with label | Static config (target date) |
| **Announcement Board** | Rich-text static announcements with markdown, auto-rotating multiple messages | JSON/RSS or static config |
| **Directory / Wayfinding** | Building floor map or department directory with listings | JSON/static config |
| **Lost & Found** | Scrolling feed of lost items | JSON/RSS feed |

### Social & Engagement

| Widget | Description | Data Source |
|--------|-------------|-------------|
| **Social Media Wall** | Aggregated campus posts from Instagram/X/Mastodon filtered by hashtag | Social API or aggregator |
| **Quote of the Day** | Rotating inspirational or educational quotes | JSON feed or built-in |
| **Poll Results** | Live poll/survey results with animated bar charts | JSON endpoint |
| **Student Spotlight** | Rotating student profiles (photo, name, achievement) | JSON feed |

### Data & Environment

| Widget | Description | Data Source |
|--------|-------------|-------------|
| **Air Quality / UV Index** | AQI, pollen count, UV index display | Environmental API |
| **Noise Level** | Ambient noise indicator for quiet zones | IoT sensor API |
| **Energy Dashboard** | Campus sustainability metrics (energy usage, solar generation) with charts | JSON API |
| **Sports Scoreboard** | Live game scores or upcoming athletics schedule | RSS/JSON feed |

### Utility

| Widget | Description | Data Source |
|--------|-------------|-------------|
| **Analog Clock** | Classic analog clock face (complements existing digital clock) | System time |
| **Countdown Collection** | Multiple small countdowns in one widget ("Days until..." for several events) | Static config |
| **Embedded PDF** | Display a PDF flyer or schedule with auto-page rotation | PDF URL |
| **Simple Chart** | Bar/line/pie chart from a JSON data endpoint | JSON API |
| **Printer Queue** | 3D printer or print station queue status for makerspaces/labs | JSON API |

## Feature Enhancements

### Conditional Visibility
Show/hide widgets based on time-of-day or day-of-week. For example, the cafeteria menu widget only appears during meal hours, or a "Good morning" greeting switches to "Good afternoon."

### Widget Transitions
Animated transitions when `widget-stack` rotates between children — slide, flip, zoom effects in addition to the existing fade.

### Accessibility Mode
High-contrast themes, larger font options, and screen-reader-friendly markup for ADA compliance on interactive kiosk displays.

### Data Source Templates
Pre-configured API URL templates for common campus systems: 25Live (room scheduling), LibCal (library), EMS (event management), PaperCut (printing), etc. Lower the barrier for new deployments.

### Alert Priority System
Allow any widget to be interrupted or overlaid by an emergency alert widget. The emergency alert widget could take over the full screen or display as a persistent banner.

### Multi-Language Support (i18n)
Internationalization for widget labels, date/time formatting, and content. Useful for campuses with diverse populations.

### Touch Interactivity
Optional touch-enabled mode for kiosk displays — tap to expand event details, navigate a wayfinding map, or scroll through a longer list.

### Scheduled Playlists
Extend the existing playlist feature with time-based scheduling — show one layout config during business hours and another overnight, or rotate different configs for different days of the week.
