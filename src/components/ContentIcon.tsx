import {
  Leaf, Heart, Recycle, Users, Shield, Sun, Sparkles, Droplets, Globe, Award, Mail, Phone, MapPin, Clock,
  FlaskConical, ShieldCheck, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  leaf: Leaf, heart: Heart, recycle: Recycle, users: Users, shield: Shield, sun: Sun, sparkles: Sparkles,
  droplets: Droplets, globe: Globe, award: Award, mail: Mail, phone: Phone, pin: MapPin, clock: Clock,
  flask: FlaskConical, check: ShieldCheck,
};

/** Maps an icon name stored in editable content to a Lucide icon. */
export function ContentIcon({ name, className = 'h-4 w-4', strokeWidth = 1.6 }: { name: string; className?: string; strokeWidth?: number }) {
  const I = MAP[name] ?? Leaf;
  return <I className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
