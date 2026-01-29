import React, { useState, useEffect } from 'react';

// ============ CONFIGURATION ============
const CONFIG = {
  posterRotationSeconds: 10, // Change this to adjust rotation speed
  schoolName: "Campus Hub",
  tickerSpeed: 30, // seconds for one complete scroll (lower = faster)
};

// ============ PLACEHOLDER DATA ============
// Replace these with WordPress API calls later

const POSTERS = [
  {
    id: 1,
    title: "Spring Festival 2025",
    subtitle: "March 15-17 | Main Quad",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop",
  },
  {
    id: 2,
    title: "Career Fair",
    subtitle: "Meet 50+ employers | March 20",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
  },
  {
    id: 3,
    title: "Basketball Championship",
    subtitle: "Finals this Saturday | 7PM",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop",
  },
  {
    id: 4,
    title: "Art Exhibition Opening",
    subtitle: "Student Gallery | Free Entry",
    image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=600&fit=crop",
  },
];

const EVENTS = [
  { id: 1, title: "Club Fair", date: "Mar 10", time: "11:00 AM", location: "Student Center" },
  { id: 2, title: "Guest Lecture: AI Ethics", date: "Mar 11", time: "2:00 PM", location: "Hall B" },
  { id: 3, title: "Open Mic Night", date: "Mar 12", time: "7:00 PM", location: "Coffee House" },
  { id: 4, title: "Study Abroad Info Session", date: "Mar 13", time: "3:30 PM", location: "Room 204" },
  { id: 5, title: "Yoga on the Lawn", date: "Mar 14", time: "8:00 AM", location: "West Lawn" },
];

const NEWS = [
  { id: 1, title: "New Library Hours Start Next Week", category: "Campus", time: "2h ago" },
  { id: 2, title: "Research Team Wins National Grant", category: "Achievement", time: "5h ago" },
  { id: 3, title: "Dining Hall Menu Updates for Spring", category: "Services", time: "1d ago" },
  { id: 4, title: "Registration Opens for Summer Courses", category: "Academic", time: "1d ago" },
];

const TICKER_ITEMS = [
  { id: 1, label: "REMINDER", text: "Library closes at 10PM tonight for maintenance" },
  { id: 2, label: "WEATHER", text: "Rain expected this afternoon — bring an umbrella!" },
  { id: 3, label: "SPORTS", text: "Basketball team advances to regional finals — Game Saturday 7PM" },
  { id: 4, label: "ALERT", text: "Parking Lot B closed tomorrow for resurfacing" },
  { id: 5, label: "EVENT", text: "Free pizza at Student Center — 12PM today while supplies last" },
];

// ============ COMPONENTS ============

const Clock = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="text-right">
      <div className="text-3xl font-bold" style={{ color: '#B79527' }}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-sm opacity-80">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
};

const PosterCarousel = ({ posters, rotationSeconds }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => (prev + 1) % 100);
    }, (rotationSeconds * 1000) / 100);
    
    const rotationInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % posters.length);
      setProgress(0);
    }, rotationSeconds * 1000);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(rotationInterval);
    };
  }, [posters.length, rotationSeconds]);
  
  const current = posters[currentIndex];
  
  return (
    <div className="relative h-full rounded-2xl overflow-hidden shadow-2xl">
      <img 
        src={current.image} 
        alt={current.title}
        className="w-full h-full object-cover transition-opacity duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <h2 className="text-5xl font-bold text-white mb-2">{current.title}</h2>
        <p className="text-2xl text-white/90">{current.subtitle}</p>
      </div>
      
      {/* Progress dots */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        {posters.map((_, idx) => (
          <div 
            key={idx}
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{ 
              backgroundColor: idx === currentIndex ? '#B79527' : 'rgba(255,255,255,0.4)',
              transform: idx === currentIndex ? 'scale(1.2)' : 'scale(1)'
            }}
          />
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-black/30">
        <div 
          className="h-full transition-all duration-100"
          style={{ width: `${progress}%`, backgroundColor: '#B79527' }}
        />
      </div>
    </div>
  );
};

const EventsList = ({ events }) => (
  <div className="h-full flex flex-col min-h-0">
    <h3 className="flex-shrink-0 text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#B79527' }}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      Upcoming Events
    </h3>
    <div className="flex-1 space-y-2 overflow-y-auto min-h-0 hide-scrollbar">
      {events.map(event => (
        <div 
          key={event.id} 
          className="p-2.5 rounded-lg border-l-4"
          style={{ backgroundColor: 'rgba(3, 86, 66, 0.3)', borderColor: '#B79527' }}
        >
          <div className="font-semibold text-white text-sm">{event.title}</div>
          <div className="text-xs opacity-80 flex items-center gap-2 mt-1">
            <span className="font-medium" style={{ color: '#B79527' }}>{event.date}</span>
            <span>{event.time}</span>
            <span className="opacity-60">• {event.location}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const NewsList = ({ news }) => (
  <div className="h-full flex flex-col min-h-0">
    <h3 className="flex-shrink-0 text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#B79527' }}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
      Latest News
    </h3>
    <div className="flex-1 space-y-2 overflow-y-auto min-h-0 hide-scrollbar">
      {news.map(item => (
        <div 
          key={item.id} 
          className="p-2 rounded-lg"
          style={{ backgroundColor: 'rgba(3, 86, 66, 0.3)' }}
        >
          <div className="font-semibold text-white text-sm leading-tight">{item.title}</div>
          <div className="text-xs mt-1 flex items-center gap-2">
            <span 
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: '#B79527', color: '#035642' }}
            >
              {item.category}
            </span>
            <span className="opacity-60">{item.time}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const NewsTicker = ({ items, speed }) => {
  const tickerContent = [...items, ...items]; // Duplicate for seamless loop
  
  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: '#B79527' }}>
      {/* Breaking News Label */}
      <div 
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 font-bold text-sm uppercase tracking-wider"
        style={{ backgroundColor: '#035642', color: '#B79527' }}
      >
        <span className="animate-pulse mr-2">●</span>
        Breaking
      </div>
      
      {/* Scrolling Content */}
      <div 
        className="flex whitespace-nowrap py-3 pl-32"
        style={{
          animation: `ticker ${speed}s linear infinite`,
        }}
      >
        {tickerContent.map((item, idx) => (
          <div key={idx} className="inline-flex items-center mx-8">
            <span 
              className="px-2 py-0.5 rounded text-xs font-bold uppercase mr-2"
              style={{ backgroundColor: '#035642', color: '#B79527' }}
            >
              {item.label}
            </span>
            <span className="font-medium" style={{ color: '#035642' }}>
              {item.text}
            </span>
            <span className="mx-8 opacity-50" style={{ color: '#035642' }}>•</span>
          </div>
        ))}
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

// ============ MAIN APP ============

export default function CampusHub() {
  return (
    <div 
      className="w-full h-screen flex flex-col text-white overflow-hidden"
      style={{ backgroundColor: '#035642' }}
    >
      {/* Hide scrollbars globally */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {/* Header */}
      <header className="flex-shrink-0 flex justify-between items-center px-6 py-4">
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: '#B79527' }}>●</span> {CONFIG.schoolName}
        </h1>
        <Clock />
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex gap-4 px-6 pb-4 min-h-0 overflow-hidden">
        {/* Left: Poster Carousel */}
        <div className="flex-1 min-w-0">
          <PosterCarousel 
            posters={POSTERS} 
            rotationSeconds={CONFIG.posterRotationSeconds} 
          />
        </div>
        
        {/* Right: Events & News */}
        <div className="w-80 flex flex-col gap-4 min-h-0">
          <div className="flex-[3] bg-black/20 rounded-2xl p-4 min-h-0 overflow-hidden">
            <EventsList events={EVENTS} />
          </div>
          <div className="flex-[2] bg-black/20 rounded-2xl p-4 min-h-0 overflow-hidden">
            <NewsList news={NEWS} />
          </div>
        </div>
      </div>
      
      {/* Bottom Ticker */}
      <div className="flex-shrink-0">
        <NewsTicker items={TICKER_ITEMS} speed={CONFIG.tickerSpeed} />
      </div>
    </div>
  );
}
