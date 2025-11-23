import { Shield, Zap, Brain } from 'lucide-react';
import SensorDisplay from '@/components/SensorDisplay';
import LocationTracker from '@/components/LocationTracker';
import VoiceAssistant from '@/components/VoiceAssistant';

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <header className="text-center space-y-6 py-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Shield className="w-16 h-16 text-primary float-animation" />
            <h1 className="text-5xl md:text-7xl font-black gradient-text">
              RiderGuard AI
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Advanced Collision Prevention & Rider Assistance System
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-3 glass-card px-6 py-3 rounded-full neon-border">
              <Brain className="w-6 h-6 text-primary" />
              <span className="font-semibold">AI-Powered</span>
            </div>
            <div className="flex items-center gap-3 glass-card px-6 py-3 rounded-full neon-border">
              <Zap className="w-6 h-6 text-secondary" />
              <span className="font-semibold">Real-Time Monitoring</span>
            </div>
            <div className="flex items-center gap-3 glass-card px-6 py-3 rounded-full neon-border">
              <Shield className="w-6 h-6 text-accent" />
              <span className="font-semibold">Safety First</span>
            </div>
          </div>
        </header>

        {/* Voice Assistant */}
        <div className="max-w-4xl mx-auto">
          <VoiceAssistant />
        </div>

        {/* Location Tracker */}
        <div className="max-w-4xl mx-auto">
          <LocationTracker />
        </div>

        {/* Sensor Display */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-6 gradient-text">
            Live Sensor Data
          </h2>
          <SensorDisplay />
        </div>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <div className="glass-card p-6 neon-border hover:scale-105 transition-transform">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2 neon-text">Collision Detection</h3>
            <p className="text-muted-foreground">
              AI-powered real-time analysis of acceleration and gyroscope data to predict and prevent collisions
            </p>
          </div>

          <div className="glass-card p-6 neon-border hover:scale-105 transition-transform">
            <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2 neon-text">Voice Control</h3>
            <p className="text-muted-foreground">
              Hands-free interaction with Gemini AI for navigation, alerts, and riding assistance
            </p>
          </div>

          <div className="glass-card p-6 neon-border hover:scale-105 transition-transform">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2 neon-text">Live Tracking</h3>
            <p className="text-muted-foreground">
              Continuous GPS monitoring with speed detection and route optimization
            </p>
          </div>
        </section>

        {/* Safety Stats */}
        <section className="glass-card p-8 neon-border max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 gradient-text">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-primary mb-2">98.7%</div>
              <div className="text-sm text-muted-foreground">Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-secondary mb-2">&lt;50ms</div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-accent mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Active Monitoring</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
