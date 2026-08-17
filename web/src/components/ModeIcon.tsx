'use client';

import DirectionsBike from '@mui/icons-material/DirectionsBike';
import DirectionsBus from '@mui/icons-material/DirectionsBus';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import DirectionsSubway from '@mui/icons-material/DirectionsSubway';
import DirectionsWalk from '@mui/icons-material/DirectionsWalk';
import LocalTaxi from '@mui/icons-material/LocalTaxi';
import PedalBike from '@mui/icons-material/PedalBike';
import TwoWheeler from '@mui/icons-material/TwoWheeler';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { useColorScheme } from '@mui/material/styles';
import { modeTone } from '@/theme/tokens';
import type { ModeId } from '@/lib/types';

const ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  walk: DirectionsWalk,
  bike: PedalBike,
  motorbike: TwoWheeler,
  rickshaw: DirectionsBike,
  auto: LocalTaxi,
  car: DirectionsCar,
  bus: DirectionsBus,
  metro: DirectionsSubway,
};

const MODE_ICON: Record<string, string> = {
  walk: 'walk',
  bicycle: 'bike',
  bike_own: 'motorbike',
  bike_hail: 'motorbike',
  rickshaw: 'rickshaw',
  cng: 'auto',
  car_own: 'car',
  car_hail: 'car',
  bus: 'bus',
  metro: 'metro',
};

export function useModeColor(mode: ModeId | string) {
  const { mode: scheme, systemMode } = useColorScheme();
  const resolved = scheme === 'system' ? systemMode ?? 'light' : scheme ?? 'light';
  return modeTone[mode]?.[resolved as 'light' | 'dark'] ?? 'currentColor';
}

export default function ModeIcon({
  mode,
  ...props
}: { mode: ModeId | string } & SvgIconProps) {
  const Icon = ICONS[MODE_ICON[mode] ?? mode] ?? DirectionsWalk;
  return <Icon {...props} />;
}
