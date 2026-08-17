'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { taka } from '@/lib/api';
import type { Itinerary } from '@/lib/types';

/**
 * The trade-off, drawn. X is minutes, Y is taka, and every point is an option
 * that nothing else beats on both. Google shows you one axis; this shows the
 * shape of the choice.
 */

const W = 560;
const H = 240;
const PAD = { top: 18, right: 18, bottom: 34, left: 52 };

export default function ParetoChart({
  front,
  selectedId,
  onSelect,
}: {
  front: Itinerary[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const theme = useTheme();
  if (front.length === 0) return null;

  const times = front.map((i) => i.duration_min);
  const costs = front.map((i) => i.cost_bdt);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const cMin = Math.min(...costs);
  const cMax = Math.max(...costs);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + (tMax === tMin ? innerW / 2 : ((t - tMin) / (tMax - tMin)) * innerW);
  const y = (c: number) =>
    PAD.top + innerH - (cMax === cMin ? innerH / 2 : ((c - cMin) / (cMax - cMin)) * innerH);

  const sorted = [...front].sort((a, b) => a.duration_min - b.duration_min);
  const path = sorted.map((i) => `${x(i.duration_min)},${y(i.cost_bdt)}`).join(' ');

  const grid = theme.palette.divider;
  const muted = theme.palette.text.secondary;

  return (
    <Box>
      <Box
        component="svg"
        viewBox={`0 0 ${W} ${H}`}
        sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="Cost against duration for every non-dominated option"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = PAD.top + innerH * f;
          const value = cMax - (cMax - cMin) * f;
          return (
            <g key={f}>
              <line x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} stroke={grid} strokeWidth={1} />
              <text x={PAD.left - 8} y={gy + 4} textAnchor="end" fontSize={11} fill={muted}>
                {taka(value)}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke={grid}
        />
        <text x={PAD.left} y={H - PAD.bottom + 20} fontSize={11} fill={muted}>
          {Math.round(tMin)} min
        </text>
        <text x={W - PAD.right} y={H - PAD.bottom + 20} fontSize={11} fill={muted} textAnchor="end">
          {Math.round(tMax)} min
        </text>

        <polyline
          points={path}
          fill="none"
          stroke={theme.palette.primary.main}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.5}
        />

        {sorted.map((it) => {
          const selected = it.id === selectedId;
          const labelled = Boolean(it.label);
          const fill = selected
            ? theme.palette.primary.main
            : labelled
              ? theme.palette.primary.main
              : theme.palette.background.default;
          return (
            <g
              key={it.id}
              onClick={() => onSelect?.(it.id)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <circle
                cx={x(it.duration_min)}
                cy={y(it.cost_bdt)}
                r={selected ? 9 : labelled ? 7 : 5}
                fill={fill}
                stroke={theme.palette.primary.main}
                strokeWidth={2}
              />
              {labelled && (
                <text
                  x={x(it.duration_min)}
                  y={y(it.cost_bdt) - 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={theme.palette.text.primary}
                >
                  {it.label === 'best_value' ? 'best value' : it.label}
                </text>
              )}
              <title>{`${it.summary} — ${taka(it.cost_bdt)}, ${Math.round(it.duration_min)} min`}</title>
            </g>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Every point is an option nothing else beats on both money and time. {front.length} on the
        front.
      </Typography>
    </Box>
  );
}
