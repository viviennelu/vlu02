import architectureSrc from '../assets/images/sample_architecture_1794129061529.jpg';
import botanicalSrc from '../assets/images/sample_botanical_1794129062294.jpg';
import coastalSrc from '../assets/images/sample_coastal_1794129062323.jpg';

export interface SampleImage {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  src: string;
  description: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-arch',
    title: 'Brutalist Terracotta & Sky',
    subtitle: 'Cast Shadows · Limestone · Cobalt Blue',
    category: 'Architecture',
    src: architectureSrc,
    description: 'Crisp geometric planes, sun-warmed clay plaster, and deep Aegean daylight.',
  },
  {
    id: 'sample-botanical',
    title: 'Botanical Greenhouse Mist',
    subtitle: 'Monstera Leaves · Vermilion Blooms · Damp Glass',
    category: 'Flora',
    src: botanicalSrc,
    description: 'Deep forest greens, soft overcast silver light, and vibrant tropical accents.',
  },
  {
    id: 'sample-coastal',
    title: 'Nordic Basalt & Twilight Tide',
    subtitle: 'Basalt Sea Stacks · Indigo Swell · Dusty Rose Horizon',
    category: 'Landscape',
    src: coastalSrc,
    description: 'Crashing seafoam, cool oceanic slate, and pale twilight gradient.',
  },
];
