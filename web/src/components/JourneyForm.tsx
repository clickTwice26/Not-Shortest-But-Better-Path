'use client';

import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import TuneIcon from '@mui/icons-material/Tune';
import ModeIcon from './ModeIcon';
import VotSlider from './VotSlider';
import type { Place } from '@/lib/types';

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
  modes: string[];
  owns: string[];
}

export default function JourneyForm({
  places,
  value,
  onChange,
  onSubmit,
  onNaturalSubmit,
  loading,
}: {
  places: Place[];
  value: JourneyFormValue;
  onChange: (v: JourneyFormValue) => void;
  onSubmit: () => void;
  onNaturalSubmit: (text: string) => void;
  loading: boolean;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [natural, setNatural] = useState('');
  const names = places.map((p) => p.name);

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
          <Autocomplete
            freeSolo
            options={names}
            value={value.origin}
            onInputChange={(_, v) => set('origin', v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="From"
                placeholder="Dhanmondi 27"
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    startAdornment: (
                      <InputAdornment position="start">
                        <MyLocationIcon fontSize="small" color="primary" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          />
          <Autocomplete
            freeSolo
            options={names}
            value={value.destination}
            onInputChange={(_, v) => set('destination', v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="To"
                placeholder="Uttara Sector 7"
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PlaceIcon fontSize="small" color="error" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          />
        </Stack>
        <IconButton onClick={swap} aria-label="Swap origin and destination">
          <SwapVertIcon />
        </IconButton>
      </Stack>

      <VotSlider value={value.vot} onChange={(v) => set('vot', v)} onCommit={onSubmit} />

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<SearchIcon />}
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          {loading ? 'Planning…' : 'Find the cheap way'}
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

          <Box>
            <Typography variant="overline" color="text.secondary">
              Or just say it
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={natural}
              onChange={(e) => setNatural(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && natural.trim()) onNaturalSubmit(natural.trim());
              }}
              placeholder="Farmgate theke Uttara, taka bachate chai but 40 min er beshi na"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AutoAwesomeIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => natural.trim() && onNaturalSubmit(natural.trim())}
                        disabled={!natural.trim() || loading}
                      >
                        Parse
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Stack>
      </Collapse>
    </Stack>
  );
}
