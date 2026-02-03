// Demo presets for Campus Hub

import type { DisplayConfig } from './config';

export interface Preset {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: DisplayConfig;
}

export const DEMO_PRESETS: Preset[] = [
  {
    id: 'campus-classic',
    name: 'Campus Classic',
    description: 'Traditional campus display with clock, events, and news',
    icon: '🏫',
    config: {
      layout: [
        { id: 'clock-1', type: 'clock', x: 9, y: 0, w: 3, h: 1, props: { showSeconds: true, showDate: true, format24h: false } },
        { id: 'poster-1', type: 'poster-carousel', x: 0, y: 0, w: 6, h: 5, props: {
          rotationSeconds: 8,
          posters: [
            { imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800', title: 'Welcome to Campus', description: 'Spring Semester 2026' },
            { imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', title: 'Graduation Day', description: 'May 15th, 2026' },
            { imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800', title: 'Study Abroad Fair', description: 'March 20th, Student Center' },
          ]
        }},
        { id: 'events-1', type: 'events-list', x: 6, y: 1, w: 6, h: 4, props: {
          title: 'Upcoming Events',
          maxItems: 5,
          events: [
            { title: 'Career Fair', date: '2026-02-15', time: '10:00 AM', location: 'Main Hall' },
            { title: 'Basketball Game', date: '2026-02-16', time: '7:00 PM', location: 'Sports Arena' },
            { title: 'Guest Lecture: AI Ethics', date: '2026-02-18', time: '2:00 PM', location: 'Auditorium A' },
            { title: 'Club Rush', date: '2026-02-20', time: '11:00 AM', location: 'Student Plaza' },
          ]
        }},
        { id: 'news-ticker-1', type: 'news-ticker', x: 0, y: 7, w: 12, h: 1 },
      ],
      theme: { primary: '#035642', accent: '#B79527', background: '#022b21' },
      schoolName: 'Campus Hub',
      tickerEnabled: true,
    },
  },
  {
    id: 'media-showcase',
    name: 'Media Showcase',
    description: 'Video and image-focused display for visual content',
    icon: '🎬',
    config: {
      layout: [
        { id: 'youtube-1', type: 'youtube', x: 0, y: 0, w: 8, h: 5, props: {
          videoId: 'dQw4w9WgXcQ',
          autoplay: true,
          muted: true,
          loop: true,
        }},
        { id: 'image-1', type: 'image', x: 8, y: 0, w: 4, h: 2, props: {
          url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600',
          alt: 'Students studying',
          fit: 'cover',
        }},
        { id: 'image-2', type: 'image', x: 8, y: 2, w: 4, h: 3, props: {
          url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600',
          alt: 'Campus life',
          fit: 'cover',
        }},
        { id: 'clock-1', type: 'clock', x: 0, y: 5, w: 3, h: 1, props: { showSeconds: false, showDate: true } },
        { id: 'news-ticker-1', type: 'news-ticker', x: 0, y: 7, w: 12, h: 1 },
      ],
      theme: { primary: '#1a1a2e', accent: '#e94560', background: '#16213e' },
      schoolName: 'Media Center',
      tickerEnabled: true,
    },
  },
  {
    id: 'minimal-info',
    name: 'Minimal Info',
    description: 'Clean, minimalist layout with essential information',
    icon: '✨',
    config: {
      layout: [
        { id: 'clock-1', type: 'clock', x: 4, y: 2, w: 4, h: 2, props: { showSeconds: false, showDate: true, format24h: true } },
        { id: 'weather-1', type: 'weather', x: 4, y: 4, w: 4, h: 2, props: {
          location: 'New York',
          units: 'imperial',
        }},
      ],
      theme: { primary: '#0f0f0f', accent: '#ffffff', background: '#000000' },
      schoolName: 'Info Display',
      tickerEnabled: false,
    },
  },
  {
    id: 'events-focus',
    name: 'Events Focus',
    description: 'Large events list with supporting content',
    icon: '📅',
    config: {
      layout: [
        { id: 'events-1', type: 'events-list', x: 0, y: 0, w: 7, h: 5, props: {
          title: 'This Week on Campus',
          maxItems: 8,
          events: [
            { title: 'Monday Meditation', date: '2026-02-10', time: '7:00 AM', location: 'Wellness Center' },
            { title: 'Chess Club Meeting', date: '2026-02-10', time: '4:00 PM', location: 'Room 201' },
            { title: 'Open Mic Night', date: '2026-02-11', time: '8:00 PM', location: 'Campus Cafe' },
            { title: 'Research Symposium', date: '2026-02-12', time: '9:00 AM', location: 'Science Building' },
            { title: 'Yoga Class', date: '2026-02-12', time: '6:00 PM', location: 'Gym' },
            { title: 'Film Screening', date: '2026-02-13', time: '7:30 PM', location: 'Theater' },
            { title: 'Volunteer Day', date: '2026-02-14', time: '10:00 AM', location: 'Meet at Main Gate' },
            { title: 'Valentine Dance', date: '2026-02-14', time: '8:00 PM', location: 'Ballroom' },
          ]
        }},
        { id: 'clock-1', type: 'clock', x: 7, y: 0, w: 5, h: 1, props: { showSeconds: true, showDate: true } },
        { id: 'poster-1', type: 'poster-carousel', x: 7, y: 1, w: 5, h: 4, props: {
          rotationSeconds: 6,
          posters: [
            { imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600', title: 'Events This Week', description: 'Something for everyone!' },
            { imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600', title: 'Get Involved', description: 'Join a club today' },
          ]
        }},
        { id: 'news-ticker-1', type: 'news-ticker', x: 0, y: 7, w: 12, h: 1 },
      ],
      theme: { primary: '#2d3436', accent: '#00b894', background: '#1e272e' },
      schoolName: 'Events Board',
      tickerEnabled: true,
    },
  },
  {
    id: 'web-dashboard',
    name: 'Web Dashboard',
    description: 'Embed external websites and live content',
    icon: '🌐',
    config: {
      layout: [
        { id: 'web-1', type: 'web', x: 0, y: 0, w: 8, h: 5, props: {
          url: 'https://www.wikipedia.org',
          refreshInterval: 300,
        }},
        { id: 'clock-1', type: 'clock', x: 8, y: 0, w: 4, h: 1, props: { showSeconds: true, showDate: true } },
        { id: 'weather-1', type: 'weather', x: 8, y: 1, w: 4, h: 3, props: {
          location: 'Boston',
          units: 'imperial',
        }},
      ],
      theme: { primary: '#2c3e50', accent: '#3498db', background: '#1a252f' },
      schoolName: 'Web Dashboard',
      tickerEnabled: false,
    },
  },
  {
    id: 'slideshow-gallery',
    name: 'Photo Gallery',
    description: 'Beautiful slideshow with campus photos',
    icon: '🖼️',
    config: {
      layout: [
        { id: 'slideshow-1', type: 'slideshow', x: 0, y: 0, w: 9, h: 5, props: {
          duration: 5,
          transition: 'fade',
          showCaptions: true,
          showProgress: true,
          slides: [
            { url: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200', caption: 'Welcome to Our Campus' },
            { url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200', caption: 'State-of-the-Art Facilities' },
            { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200', caption: 'Celebrating Excellence' },
            { url: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=1200', caption: 'Beautiful Campus Grounds' },
            { url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200', caption: 'Global Opportunities' },
          ]
        }},
        { id: 'clock-1', type: 'clock', x: 9, y: 0, w: 3, h: 1, props: { showSeconds: false, showDate: true } },
        { id: 'events-1', type: 'events-list', x: 9, y: 1, w: 3, h: 4, props: {
          title: 'Today',
          maxItems: 4,
          events: [
            { title: 'Campus Tour', time: '10:00 AM' },
            { title: 'Info Session', time: '2:00 PM' },
            { title: 'Q&A Panel', time: '4:00 PM' },
          ]
        }},
        { id: 'news-ticker-1', type: 'news-ticker', x: 0, y: 7, w: 12, h: 1 },
      ],
      theme: { primary: '#1b4332', accent: '#d4a373', background: '#081c15' },
      schoolName: 'Photo Gallery',
      tickerEnabled: true,
    },
  },
];

export function getPreset(id: string): Preset | undefined {
  return DEMO_PRESETS.find((p) => p.id === id);
}
