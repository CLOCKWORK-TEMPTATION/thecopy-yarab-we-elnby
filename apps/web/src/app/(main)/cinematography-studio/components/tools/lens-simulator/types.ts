export interface LensPreset {
  id: string;
  name: string;
  nameAr: string;
  brand: string;
  focalLength: number;
  maxAperture: number;
  characteristics: string[];
  famousFilms?: string[];
}

export interface LensSettings {
  focalLength: number;
  aperture: number;
  distortion: number;
  showBokeh: boolean;
  isAnamorphic: boolean;
  selectedPreset: string | null;
}

export interface LensSimulatorToolProps {
  className?: string;
  onLensChange?: (lens: {
    focalLength: number;
    aperture: number;
    distortion: number;
  }) => void;
}

export interface LensType {
  type: string;
  typeAr: string;
  description: string;
}
