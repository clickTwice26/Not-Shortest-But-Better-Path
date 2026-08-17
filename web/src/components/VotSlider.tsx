'use client';

import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SavingsIcon from '@mui/icons-material/Savings';
import BoltIcon from '@mui/icons-material/Bolt';

/**
 * The product, in one control. Drag it and the recommendation flips from a
 * ride-hail to CNG -> metro -> rickshaw.
 *
 *   generalized_cost = cost_bdt + vot * duration_min
 */

const MARKS = [
  { value: 0.5, label: '' },
  { value: 2, label: '' },
  { value: 4, label: '' },
  { value: 8, label: '' },
];

export default function VotSlider({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
}) {
  const stance =
    value <= 1 ? 'On a budget' : value <= 3 ? 'Balanced' : value <= 5.5 ? 'In a hurry' : 'Time is money';

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="overline" color="text.secondary">
          What is a minute worth?
        </Typography>
        <Typography variant="subtitle2" color="primary.main">
          {stance} · ৳{value.toFixed(1)}/min
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <SavingsIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Slider
          value={value}
          min={0.5}
          max={8}
          step={0.5}
          marks={MARKS}
          onChange={(_, v) => onChange(v as number)}
          onChangeCommitted={(_, v) => onCommit?.(v as number)}
          valueLabelDisplay="off"
          aria-label="Value of time in taka per minute"
        />
        <BoltIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </Stack>
    </Box>
  );
}
