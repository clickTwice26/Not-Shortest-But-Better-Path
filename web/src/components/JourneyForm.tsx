'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import TuneIcon from '@mui/icons-material/Tune';
import ComfortControls from './ComfortControls';
import ModeIcon from './ModeIcon';
import PlaceInput from './PlaceInput';
import VotSlider from './VotSlider';

const SELECTABLE_MODES = [
  { id: 'walk', label: 'Walk' },
  { id: 'rickshaw', label: 'Rickshaw' },
  { id: 'cng', label: 'CNG' },
  { id: 'bike_hail', label: 'Bike' },
  { id: 'car_hail', label: 'Car' },
  { id: 'bus', label: 'Bus' },
  { id: 'metro', label: 'Metro' },
];

const OWNABLE = [
  { id: 'bike_own', label: 'Motorbike' },
  { id: 'bicycle', label: 'Bicycle' },
  { id: 'car_own', label: 'Car' },
];

export interface JourneyFormValue {
  origin: string;
  destination: string;
  vot: number;
  comfort: number;
  modes: string[];
  owns: string[];
  avoid: string[];
}

export default function JourneyForm({
  value,
  onChange,
  onSubmit,
  loading,
  hideSubmit = false,
}: {
  value: JourneyFormValue;
  onChange: (v: JourneyFormValue) => void;
  onSubmit: () => void;
  loading: boolean;
  /** The dialog supplies its own action buttons. */
  hideSubmit?: boolean;
}) {
  const [showOptions, setShowOptions] = useState(hideSubmit);

  // Mirror form -> parent without stale closures.
  const set = <K extends keyof JourneyFormValue>(key: K, v: JourneyFormValue[K]) =>
    onChange({ ...value, [key]: v });

  const swap = () => onChange({ ...value, origin: value.destination, destination: value.origin });

  const canSubmit = Boolean(value.origin && value.destination) && !loading;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) onSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canSubmit, onSubmit]);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Stack spacing={1.5} sx={{ flex: 1 }}>
          <PlaceInput
            label="From"
            placeholder="Dhanmondi 27"
            value={value.origin}
            onChange={(v) => set('origin', v)}
            icon={<MyLocationIcon fontSize="small" color="primary" />}
          />
          <PlaceInput
            label="To"
            placeholder="EMK Center"
            value={value.destination}
            onChange={(v) => set('destination', v)}
            icon={<PlaceIcon fontSize="small" color="error" />}
          />
        </Stack>
        <IconButton onClick={swap} aria-label="Swap origin and destination">
          <SwapVertIcon />
        </IconButton>
      </Stack>

      <VotSlider value={value.vot} onChange={(v) => set('vot', v)} onCommit={onSubmit} />

      <ComfortControls
        comfort={value.comfort}
        avoid={value.avoid}
        onComfortChange={(v) => set('comfort', v)}
        onComfortCommit={onSubmit}
        onAvoidChange={(v) => onChange({ ...value, avoid: v })}
      />

      {!hideSubmit && (
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<SearchIcon />}
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {loading ? 'Planning…' : 'Update the plan'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => setShowOptions((v) => !v)}
            aria-label="Options"
            sx={{ minWidth: 48, px: 0 }}
          >
            <TuneIcon />
          </Button>
        </Stack>
      )}

      <Collapse in={showOptions}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Modes to consider
            </Typography>
            <ToggleButtonGroup
              value={value.modes}
              onChange={(_, v: string[]) => set('modes', v)}
              size="small"
              sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}
            >
              {SELECTABLE_MODES.map((m) => (
                <ToggleButton key={m.id} value={m.id} sx={{ gap: 0.75 }}>
                  <ModeIcon mode={m.id} sx={{ fontSize: 16 }} />
                  {m.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">
              I own a…
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              An owned vehicle can only start a trip — it stays parked at the station. Cars cannot
              park at MRT-6 stations.
            </Typography>
            <ToggleButtonGroup
              value={value.owns}
              onChange={(_, v: string[]) => set('owns', v)}
              size="small"
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              {OWNABLE.map((m) => (
                <ToggleButton key={m.id} value={m.id} sx={{ gap: 0.75 }}>
                  <ModeIcon mode={m.id} sx={{ fontSize: 16 }} />
                  {m.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

        </Stack>
      </Collapse>
    </Stack>
  );
}
