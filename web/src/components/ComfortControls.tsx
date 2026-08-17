'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import BlockIcon from '@mui/icons-material/Block';
import PaidIcon from '@mui/icons-material/Paid';
import ModeIcon from './ModeIcon';

/**
 * The bus is always cheapest. Without a comfort weight the planner would
 * recommend it every single time, which is not how anyone actually travels.
 *
 *   generalized_cost = fare + vot * minutes + comfort_weight * discomfort_minutes
 */

const AVOIDABLE = [
  { id: 'bus', label: 'Bus' },
  { id: 'rickshaw', label: 'Rickshaw' },
  { id: 'cng', label: 'CNG' },
  { id: 'bike_hail', label: 'Bike' },
];

export default function ComfortControls({
  comfort,
  avoid,
  onComfortChange,
  onComfortCommit,
  onAvoidChange,
}: {
  comfort: number;
  avoid: string[];
  onComfortChange: (v: number) => void;
  onComfortCommit?: (v: number) => void;
  onAvoidChange: (v: string[]) => void;
}) {
  const stance =
    comfort <= 0.4
      ? "Don't care"
      : comfort <= 1.5
        ? 'Prefer comfort'
        : comfort <= 3.5
          ? 'Comfort matters'
          : 'No crowded buses';

  const toggle = (id: string) =>
    onAvoidChange(avoid.includes(id) ? avoid.filter((m) => m !== id) : [...avoid, id]);

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="overline" color="text.secondary">
          How much is comfort worth?
        </Typography>
        <Typography variant="subtitle2" color="primary.main">
          {stance}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <PaidIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Slider
          value={comfort}
          min={0}
          max={6}
          step={0.5}
          onChange={(_, v) => onComfortChange(v as number)}
          onChangeCommitted={(_, v) => onComfortCommit?.(v as number)}
          valueLabelDisplay="off"
          aria-label="Value of comfort in taka per minute"
        />
        <AirlineSeatReclineNormalIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          Avoid
        </Typography>
        {AVOIDABLE.map((m) => {
          const on = avoid.includes(m.id);
          return (
            <Chip
              key={m.id}
              size="small"
              clickable
              onClick={() => toggle(m.id)}
              color={on ? 'error' : 'default'}
              variant={on ? 'filled' : 'outlined'}
              icon={on ? <BlockIcon /> : <ModeIcon mode={m.id} sx={{ fontSize: 16 }} />}
              label={m.label}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
