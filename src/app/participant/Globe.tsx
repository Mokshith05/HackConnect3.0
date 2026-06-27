import React from 'react';
import type { Profile } from '../../types';

interface GlobeProps {
  participants?: Profile[];
  onlineUsers?: string[];
  onSelectProfile?: (profile: Profile) => void;
}

// 12 well-spaced, non-overlapping coordinate slots on the 350px globe
const SLOTS = [
  // Inner Ring (radius: ~55px)
  { angle: 30, radius: 55, scale: 0.85 },
  { angle: 150, radius: 60, scale: 0.85 },
  { angle: 270, radius: 50, scale: 0.85 },

  // Middle Ring (radius: ~95px)
  { angle: 0, radius: 100, scale: 0.95 },
  { angle: 72, radius: 95, scale: 0.95 },
  { angle: 144, radius: 105, scale: 0.95 },
  { angle: 216, radius: 90, scale: 0.95 },
  { angle: 288, radius: 100, scale: 0.95 },

  // Outer Ring (radius: ~140px)
  { angle: 36, radius: 135, scale: 1.1 },
  { angle: 110, radius: 130, scale: 1.05 },
  { angle: 180, radius: 142, scale: 1.15 },
  { angle: 252, radius: 135, scale: 1.05 },
  { angle: 324, radius: 140, scale: 1.1 }
];

export const Globe: React.FC<GlobeProps> = ({
  participants = [],
  onlineUsers = [],
  onSelectProfile
}) => {
  // Slice the participants list to display a maximum of 12 neat avatars
  const visibleParticipants = participants.slice(0, 12);

  return (
    <>
      <style>
        {`
          @keyframes earthRotate {
            0% { background-position: 0 0; }
            100% { background-position: 500px 0; }
          }
          @keyframes twinkling { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-slow { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-long { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-fast { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          
          @keyframes avatarFloat {
            0%, 100% { transform: translateY(0px) scale(var(--scale)); }
            50% { transform: translateY(-6px) scale(var(--scale)); }
          }
          
          @keyframes avatarPulse {
            0% { transform: scale(0.9) translate(-50%, -50%); opacity: 0.6; }
            50% { transform: scale(1.3) translate(-50%, -50%); opacity: 0.15; }
            100% { transform: scale(0.9) translate(-50%, -50%); opacity: 0.6; }
          }
        `}
      </style>
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        {/* Globe Wrapper with Stars */}
        <div className="relative w-[700px] h-[700px] flex items-center justify-center">

          {/* Background Stars */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute left-[15px] top-[50px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling 3s infinite" }}
            />
            <div
              className="absolute left-[40px] top-[320px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling-slow 2.5s infinite" }}
            />
            <div
              className="absolute right-[50px] top-[80px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling-long 4s infinite" }}
            />
            <div
              className="absolute right-[30px] top-[280px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling 3.5s infinite" }}
            />
            <div
              className="absolute left-[200px] top-[20px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling-fast 1.5s infinite" }}
            />
            <div
              className="absolute left-[180px] top-[375px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling-slow 2s infinite" }}
            />
            <div
              className="absolute left-[360px] top-[190px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling-long 4.5s infinite" }}
            />
            <div
              className="absolute left-[30px] top-[180px] w-1 h-1 bg-white rounded-full"
              style={{ animation: "twinkling-fast 2s infinite" }}
            />
          </div>

          {/* Rotating Globe Body */}
          <div
            className="relative w-[600px] h-[600px] rounded-full overflow-hidden shadow-[0_0_35px_rgba(99,102,241,0.25),-5px_0_15px_#c3f4ff_inset,15px_2px_35px_#000_inset,-24px_-2px_45px_#6366f133_inset,350px_0_44px_#00000066_inset]"
            style={{
              backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "left",
              animation: "earthRotate 45s linear infinite",
            }}
          >
            {/* Overlay glow for depth */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-indigo/10 via-transparent to-white/5 pointer-events-none" />

            {/* Render participants in well-spaced slots */}
            {visibleParticipants.map((p, index) => {
              const GLOBE_SIZE = 600; // or whatever your globe size is
              const CENTER = GLOBE_SIZE / 2;
              const AVATAR_SIZE = 100; // w-11 h-11
              const isOnline = onlineUsers.includes(p.id);
              const slot = SLOTS[index % SLOTS.length];

              // Calculate coordinates based on deterministic slots for 350px globe
              // Center is 175. Offset by 18px (half of avatar size 36px)
              const rad = slot.angle * (Math.PI / 180);
              const left =
                CENTER + slot.radius * Math.cos(rad) - AVATAR_SIZE / 2;

              const top =
                CENTER + slot.radius * Math.sin(rad) - AVATAR_SIZE / 2;

              const delay = (index * 0.4) % 4;
              const duration = 3.5 + (index * 0.2) % 2;

              return (
                <div
                  key={p.id}
                  className="absolute group z-20 cursor-pointer"
                  onClick={() => onSelectProfile?.(p)}
                  title={p.full_name} // standard browser tooltip
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    '--scale': slot.scale,
                    '--delay': `${delay}s`,
                    '--duration': `${duration}s`,
                    animation: 'avatarFloat var(--duration) ease-in-out var(--delay) infinite',
                  } as React.CSSProperties}
                >
                  {/* Glowing Connection Aura */}
                  <span
                    className={`absolute left-1/2 top-1/2 w-[46px] h-[46px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none ${isOnline ? 'bg-brand-emerald/30 border border-brand-emerald/40' : 'bg-brand-indigo/25 border border-brand-indigo/35'
                      }`}
                    style={{
                      animation: 'avatarPulse 3s ease-in-out infinite',
                      animationDelay: `${delay}s`,
                    }}
                  />

                  {/* Avatar Image */}
                  {/* Avatar Image */}
                  <img
                    src={p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.full_name}`}
                    alt={p.full_name}
                    className={`w-12 h-12 rounded-full border-[3px] object-cover relative z-10 transition-all duration-300 group-hover:scale-125 group-hover:z-30 ${isOnline
                        ? 'border-brand-emerald shadow-[0_0_14px_rgba(16,185,129,0.7)] group-hover:border-white'
                        : 'border-zinc-800 group-hover:border-brand-indigo'
                      }`}
                  />
                </div>
              );
            })}

          </div>
        </div>

        {/* Dynamic description of member count */}
        <div className="text-[11px] text-zinc-450 bg-zinc-950/60 border border-zinc-900 rounded-full px-4 py-1.5 font-medium tracking-wide">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-indigo mr-2 animate-ping" />
          <span className="text-white font-bold">{participants.length}</span> Members Registered on the Network Map
        </div>
      </div>
    </>
  );
};

export default Globe;
