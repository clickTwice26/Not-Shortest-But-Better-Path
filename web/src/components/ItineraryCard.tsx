'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SwapCallsIcon from '@mui/icons-material/SwapCalls';
import { alpha } from '@mui/material/styles';
import ModeIcon, { useModeColor } from './ModeIcon';
import { taka, minutes } from '@/lib/api';
import type { Itinerary, Leg } from '@/lib/types';

const LABELS: Record<string, { text: string; tone: 'primary' | 'info' | 'secondary' }> = {
  best_value: { text: 'Best value', tone: 'primary' },
  fastest: { text: 'Fastest', tone: 'info' },
  cheapest: { text: 'Cheapest', tone: 'secondary' },
};

function LegRow({ leg }: { leg: Leg }) {
  const color = useModeColor(leg.mode);
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: alpha(color, 0.14),
          color,
        }}
      >
        <ModeIcon mode={leg.mode} fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" noWrap>
          {leg.mode_label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {leg.from_name} → {leg.to_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {leg.distance_km.toFixed(1)} km · {minutes(leg.duration_min)}
          {leg.wait_min > 0 ? ` (incl. ${Math.round(leg.wait_min)} min wait)` : ''}
        </Typography>
      </Box>
      <Tooltip title={leg.cost_source} arrow placement="left">
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
          {leg.cost_bdt > 0 ? taka(leg.cost_bdt) : 'free'}
        </Typography>
      </Tooltip>
    </Stack>
  );
}

export default function ItineraryCard({
  itinerary,
  highlight = false,
}: {
  itinerary: Itinerary;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(highlight);
  const label = itinerary.label ? LABELS[itinerary.label] : undefined;
  const saves = itinerary.savings_vs_fastest;
  const costsMinutes = itinerary.minutes_vs_fastest;

  return (
    <Card
      sx={{
        borderColor: highlight ? 'primary.main' : 'divider',
        borderWidth: highlight ? 2 : 1,
        bgcolor: highlight ? 'primary.light' : 'background.surfaceContainerLow',
        color: highlight ? 'primary.dark' : 'inherit',
        transition: 'border-color .2s, background-color .2s',
      }}
    >
      <CardActionArea onClick={() => setOpen((v) => !v)} sx={{ p: 2.5, borderRadius: 'inherit' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            {label && (
              <Chip
                size="small"
                label={label.text}
                color={highlight ? 'default' : label.tone}
                variant={highlight ? 'filled' : 'outlined'}
                sx={{ mb: 1, ...(highlight && { bgcolor: 'primary.main', color: 'primary.contrastText' }) }}
              />
            )}
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              {itinerary.legs.map((leg, i) => (
                <Stack key={i} direction="row" spacing={0.75} alignItems="center">
                  {i > 0 && (
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>
                      →
                    </Typography>
                  )}
                  <LegChip leg={leg} />
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
              {taka(itinerary.cost_bdt)}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
              <ScheduleIcon sx={{ fontSize: 14, opacity: 0.7 }} />
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {minutes(itinerary.duration_min)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1.5 }}
        >
          {saves > 0 && (
            <Chip
              size="small"
              variant="outlined"
              label={
                costsMinutes > 0
                  ? `Saves ${taka(saves)} · costs ${Math.round(costsMinutes)} min`
                  : `Saves ${taka(saves)}`
              }
              sx={{ borderColor: 'currentColor', opacity: 0.9 }}
            />
          )}
          {itinerary.transfers > 0 && (
            <Chip
              size="small"
              variant="outlined"
              icon={<SwapCallsIcon />}
              label={`${itinerary.transfers} transfer${itinerary.transfers > 1 ? 's' : ''}`}
              sx={{ borderColor: 'divider' }}
            />
          )}
          <Chip
            size="small"
            variant="outlined"
            label={itinerary.cost_confidence === 'official' ? 'Official rates' : 'Estimated fare'}
            color={itinerary.cost_confidence === 'official' ? 'success' : 'warning'}
          />
          <Box sx={{ flex: 1 }} />
          <ExpandMore
            sx={{
              fontSize: 20,
              opacity: 0.6,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform .2s',
            }}
          />
        </Stack>
      </CardActionArea>

      <Collapse in={open} unmountOnExit>
        <Divider sx={{ opacity: 0.5 }} />
        <Box sx={{ px: 2.5, py: 1 }}>
          {itinerary.legs.map((leg, i) => (
            <LegRow key={i} leg={leg} />
          ))}
        </Box>
      </Collapse>
    </Card>
  );
}

function LegChip({ leg }: { leg: Leg }) {
  const color = useModeColor(leg.mode);
  return (
    <Chip
      size="small"
      icon={<ModeIcon mode={leg.mode} sx={{ fontSize: 16, color: `${color} !important` }} />}
      label={`${leg.mode_label} ${taka(leg.cost_bdt)}`}
      variant="outlined"
      sx={{ borderColor: alpha(color, 0.4), bgcolor: alpha(color, 0.08) }}
    />
  );
}
