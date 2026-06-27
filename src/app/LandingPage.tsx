import { Link } from 'react-router-dom';
import { MessageSquare, MapPin, Shield, Brain, ArrowRight } from 'lucide-react';
import { Starfield } from './participant/Starfield';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col justify-between overflow-hidden">
      
      {/* Starfield background animation */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Starfield bgColor="#0F0F10" starColor="rgba(255, 255, 255, 0.45)" quantity={256} speed={0.25} />
      </div>
      
      {/* Background ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-indigo/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center font-bold text-lg text-white shadow-lg">
            H
          </div>
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            HackConnect
          </span>
        </div>
        <div>
          <Link
            to="/admin/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-700 px-4 py-2 rounded-lg"
          >
            Admin Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 flex flex-col lg:flex-row items-center gap-12 my-auto z-10">
        
        {/* Left column - Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 mb-6 text-xs text-brand-indigo font-medium">
            <Brain size={14} /> AI-Powered Event Networking
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Build your team.<br />
            Meet your match.<br />
            <span className="bg-gradient-to-r from-brand-indigo to-brand-purple bg-clip-text text-transparent">
              Without the spam.
            </span>
          </h1>
          
          <p className="text-lg text-zinc-400 mb-8 max-w-lg mx-auto lg:mx-0">
            HackConnect connects hackathon participants through smart matching, secure private chat rooms, and manual location coordination. Your privacy is priority #1.
          </p>

          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <Link
              to="/login"
              className="btn-primary-gradient px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 group text-white"
            >
              Get Started as Participant
              <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right column - Feature Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mx-auto">
          
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div className="w-12 h-12 rounded-xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo mb-6">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">AI Matchmaking</h3>
              <p className="text-sm text-zinc-400">
                Overlapping skill and interest analysis automatically matches you with compatible team members.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center text-brand-emerald mb-6">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Private Event Chat</h3>
              <p className="text-sm text-zinc-400">
                Message rooms are generated only after mutual connections are approved. Chat history is cleared after the event.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div className="w-12 h-12 rounded-xl bg-brand-amber/10 flex items-center justify-center text-brand-amber mb-6">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Location Sharing</h3>
              <p className="text-sm text-zinc-400">
                Voluntary zone checking prevents inaccurate indoor GPS. Share location coordinates safely with friends.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div className="w-12 h-12 rounded-xl bg-brand-rose/10 flex items-center justify-center text-brand-rose mb-6">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Privacy & Blocking</h3>
              <p className="text-sm text-zinc-400">
                Emails and phone numbers are hidden. Instantly block users to sever messaging and visibility.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-sm text-zinc-500 z-10 px-6">
        <p>&copy; {new Date().getFullYear()} HackConnect. Built for hackers, by hackers.</p>
      </footer>
    </div>
  );
}
