'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import FlagIcon from '@mui/icons-material/Flag';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { alpha } from '@mui/material/styles';
import ModeIcon, { useModeColor } from './ModeIcon';
import { minutes, taka } from '@/lib/api';
import type { Itinerary, Leg } from '@/lib/types';

/**
 * The journey at a glance: one big tile per leg, sized and coloured by mode.
 * Reads as a strip you can take in without parsing numbers — the mode chain is
 * the thing that makes this app different, so it gets the room.
 */

function LegTile({ leg }: { leg: Leg }) {
  const color = useModeColor(leg.mode);
  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: 'center',
        minWidth: 118,
        px: 1.25,
        py: 1.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: alpha(color, 0.35),
        bgcolor: alpha(color, 0.08),
      }}
    >
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(color, 0.18),
          color,
        }}
      >
        <ModeIcon mode={leg.mode} sx={{ fontSize: 32 }} />
      </Box>

      <Typography variant="subtitle2" sx={{ textAlign: 'center', lineHeight: 1.2 }}>
        {leg.mode_label}
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, color }}>
        {leg.cost_bdt > 0 ? taka(leg.cost_bdt) : 'free'}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        {minutes(leg.duration_min)} · {leg.distance_km.toFixed(1)} km
      </Typography>
      {leg.wait_min > 0 && (
        <Typography variant="caption" color="text.secondary">
          +{Math.round(leg.wait_min)} min wait
        </Typography>
      )}
    </Stack>
  );
}

function Waypoint({ name, kind }: { name: string; kind: 'origin' | 'transfer' | 'destination' }) {
  const icon =
    kind === 'origin' ? (
      <MyLocationIcon fontSize="small" color="primary" />
    ) : kind === 'destination' ? (
      <FlagIcon fontSize="small" color="error" />
    ) : null;

  return (
    <Stack spacing={0.5} sx={{ alignItems: 'center', maxWidth: 120 }}>
      {icon ?? (
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '3px solid',
            borderColor: 'text.disabled',
          }}
        />
      )}
      <Typography
        variant="caption"
        color={kind === 'transfer' ? 'text.secondary' : 'text.primary'}
        sx={{ textAlign: 'center', fontWeight: kind === 'transfer' ? 400 : 600, lineHeight: 1.25 }}
      >
        {name}
      </Typography>
      {kind === 'transfer' && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
          change here
        </Typography>
      )}
    </Stack>
  );
}

export default function JourneyView({ itinerary }: { itinerary?: Itinerary }) {
  if (!itinerary) {
    return (
      <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Typography color="text.secondary">
          Ask where you're going and the options appear here.
        </Typography>
      </Stack>
    );
  }

  const legs = itinerary.legs;

  return (
    <Stack
      sx={{
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        p: { xs: 2, md: 3 },
        overflow: 'auto',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 980, m: 'auto' }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'baseline', justifyContent: 'center', mb: 0.5, flexWrap: 'wrap' }}
        >
          <Typography variant="h2" sx={{ fontWeight: 700 }}>
            {taka(itinerary.cost_bdt)}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <ScheduleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="h5" color="text.secondary">
              {minutes(itinerary.duration_min)}
            </Typography>
          </Stack>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}
        >
          <Chip
            size="small"
            icon={<AirlineSeatReclineNormalIcon />}
            label={itinerary.comfort_label}
            color={
              itinerary.comfort >= 4
                ? 'success'
                : itinerary.comfort >= 3.2
                  ? 'info'
                  : itinerary.comfort >= 2.4
                    ? 'warning'
                    : 'error'
            }
            variant="outlined"
          />
          {itinerary.transfers > 0 && (
            <Chip size="small" variant="outlined" label={`${itinerary.transfers} transfers`} />
          )}
          <Chip
            size="small"
            variant="outlined"
            color={itinerary.cost_confidence === 'official' ? 'success' : 'warning'}
            label={itinerary.cost_confidence === 'official' ? 'Official rates' : 'Estimated fare'}
          />
          {itinerary.worst_leg && (
            <Chip size="small" variant="outlined" label={itinerary.worst_leg} />
          )}
        </Stack>

        {/* origin → [leg] → waypoint → [leg] → … → destination */}
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}
        >
          <Waypoint name={legs[0]?.from_name ?? ''} kind="origin" />
          {legs.map((leg, i) => (
            <Stack
              key={i}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Divider sx={{ width: 20, borderBottomWidth: 2 }} />
              <LegTile leg={leg} />
              <Divider sx={{ width: 20, borderBottomWidth: 2 }} />
              <Waypoint
                name={leg.to_name}
                kind={i === legs.length - 1 ? 'destination' : 'transfer'}
              />
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
