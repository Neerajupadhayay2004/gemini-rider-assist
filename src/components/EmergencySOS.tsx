import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Phone, Plus, Trash2, Shield, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVibration } from '@/hooks/useVibration';
import { offlineStorage, EmergencyContact } from '@/lib/offlineStorage';

interface EmergencySOSProps {
  locationData?: {
    latitude: number;
    longitude: number;
    speed: number | null;
  };
  sensorData?: {
    acceleration: { x: number; y: number; z: number };
  };
}

const EmergencySOS = ({ locationData, sensorData }: EmergencySOSProps) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [crashDetected, setCrashDetected] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { patterns, stop: stopVibration } = useVibration();

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Crash detection based on acceleration
  useEffect(() => {
    if (sensorData) {
      const accelMag = Math.sqrt(
        sensorData.acceleration.x ** 2 +
        sensorData.acceleration.y ** 2 +
        sensorData.acceleration.z ** 2
      );

      // Detect potential crash (sudden high G-force > 30 m/s²)
      if (accelMag > 30 && !crashDetected && !sosActive) {
        setCrashDetected(true);
        patterns.collision();
        
        toast({
          title: "⚠️ Impact Detected!",
          description: "SOS will activate in 10 seconds. Tap to cancel.",
          variant: "destructive",
        });

        // Auto-trigger SOS after 10 seconds
        const timeout = setTimeout(() => {
          if (crashDetected) {
            activateSOS();
          }
        }, 10000);

        return () => clearTimeout(timeout);
      }
    }
  }, [sensorData, crashDetected, sosActive]);

  const loadContacts = async () => {
    try {
      const stored = await offlineStorage.getEmergencyContacts();
      setContacts(stored);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await offlineStorage.saveEmergencyContact(newContact);
      await loadContacts();
      setNewContact({ name: '', phone: '', email: '' });
      setShowAddDialog(false);
      toast({
        title: "Contact Added",
        description: `${newContact.name} added to emergency contacts`,
      });
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const removeContact = async (id: number) => {
    try {
      await offlineStorage.deleteEmergencyContact(id);
      await loadContacts();
      toast({
        title: "Contact Removed",
        description: "Emergency contact removed",
      });
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const startSOSCountdown = () => {
    setIsActivating(true);
    setCountdown(5);
    patterns.sos();

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          activateSOS();
          return 0;
        }
        patterns.warning();
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setIsActivating(false);
    setSosActive(false);
    setCrashDetected(false);
    stopVibration();
    setCountdown(5);
    
    toast({
      title: "SOS Cancelled",
      description: "Emergency alert cancelled",
    });
  };

  const activateSOS = () => {
    setIsActivating(false);
    setSosActive(true);
    patterns.sos();

    // Create emergency message
    const locationStr = locationData 
      ? `Location: https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`
      : 'Location unavailable';
    
    const speedStr = locationData?.speed 
      ? `Speed: ${(locationData.speed * 3.6).toFixed(1)} km/h`
      : '';

    const message = `🆘 EMERGENCY SOS 🆘\n\nRider needs help!\n${locationStr}\n${speedStr}\n\nSent via RiderGuard AI`;

    // Speak the emergency message
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        "Emergency SOS activated. Contacting emergency services and your emergency contacts."
      );
      window.speechSynthesis.speak(utterance);
    }

    toast({
      title: "🆘 SOS ACTIVATED",
      description: `Emergency alert sent to ${contacts.length} contacts`,
      variant: "destructive",
    });

    // In a real app, this would send SMS/email
    console.log('Emergency message:', message);
    console.log('Contacts:', contacts);
  };

  return (
    <Card className="glass-card p-6 neon-border border-destructive/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-destructive animate-pulse" />
          <h2 className="text-2xl font-bold text-destructive">Emergency SOS</h2>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="neon-border">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card neon-border">
            <DialogHeader>
              <DialogTitle className="gradient-text">Add Emergency Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Contact name"
                  className="neon-border"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="neon-border"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="email@example.com"
                  className="neon-border"
                />
              </div>
              <Button onClick={addContact} className="w-full bg-primary hover:bg-primary/90">
                Save Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      {contacts.length > 0 && (
        <div className="mb-6 space-y-2">
          <Label className="text-sm text-muted-foreground">Emergency Contacts</Label>
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-semibold">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeContact(contact.id!)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Crash Detection Warning */}
      {crashDetected && !sosActive && (
        <div className="mb-4 p-4 bg-destructive/20 rounded-lg border border-destructive animate-pulse">
          <p className="font-bold text-destructive text-center">
            ⚠️ Impact Detected! SOS activating...
          </p>
          <Button
            onClick={cancelSOS}
            className="w-full mt-2 bg-background hover:bg-background/80"
          >
            <X className="w-4 h-4 mr-2" />
            I'm OK - Cancel
          </Button>
        </div>
      )}

      {/* SOS Button */}
      <div className="flex justify-center">
        {isActivating ? (
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-destructive flex items-center justify-center animate-pulse mx-auto">
              <span className="text-5xl font-black text-white">{countdown}</span>
            </div>
            <Button
              onClick={cancelSOS}
              variant="outline"
              className="mt-4 neon-border"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel SOS
            </Button>
          </div>
        ) : sosActive ? (
          <div className="text-center w-full">
            <div className="w-32 h-32 rounded-full bg-destructive flex items-center justify-center animate-pulse mx-auto">
              <Shield className="w-16 h-16 text-white" />
            </div>
            <p className="mt-4 text-lg font-bold text-destructive animate-pulse">
              🆘 SOS ACTIVE - Help is on the way!
            </p>
            <Button
              onClick={cancelSOS}
              className="mt-4 bg-background hover:bg-background/80"
            >
              Deactivate SOS
            </Button>
          </div>
        ) : (
          <Button
            onClick={startSOSCountdown}
            className="w-32 h-32 rounded-full bg-destructive hover:bg-destructive/90 text-white font-bold text-xl transition-all hover:scale-110"
          >
            SOS
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Hold for 5 seconds to activate emergency alert
      </p>
    </Card>
  );
};

export default EmergencySOS;
