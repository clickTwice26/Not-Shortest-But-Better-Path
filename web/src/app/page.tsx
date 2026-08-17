'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InsightsIcon from '@mui/icons-material/Insights';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorScheme } from '@mui/material/styles';
import Composer from '@/components/Composer';
import ItineraryCard from '@/components/ItineraryCard';
import JourneyView from '@/components/JourneyView';
import ParetoChart from '@/components/ParetoChart';
import TripSettingsDialog from '@/components/TripSettingsDialog';
import type { JourneyFormValue } from '@/components/JourneyForm';
import { api, taka } from '@/lib/api';
import type { Itinerary, ParsedQuery, PlanResult } from '@/lib/types';

const DEFAULTS: JourneyFormValue = {
  origin: 'Dhanmondi 27',
  destination: 'Uttara Sector 7',
  vot: 2,
  comfort: 1,
  modes: ['walk', 'rickshaw', 'cng', 'bike_hail', 'car_hail', 'bus', 'metro'],
  owns: [],
  avoid: [],
};

const PANEL_WIDTH = 420;

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Box sx={{ width: 34, height: 34 }} />;

  const dark = mode === 'dark';
  return (
    <Tooltip title={dark ? 'Light' : 'Dark'}>
      <IconButton size="small" onClick={() => setMode(dark ? 'light' : 'dark')} aria-label="Toggle theme">
        {dark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

export default function Home() {
  const [form, setForm] = useState<JourneyFormValue>(DEFAULTS);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const [geminiActive, setGeminiActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    api.health().then((h) => setGeminiActive(h.gemini)).catch(() => setGeminiActive(false));
  }, []);

  const run = useCallback(async (value: JourneyFormValue) => {
    if (!value.origin || !value.destination) return;
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.plan({
        origin_text: value.origin,
        destination_text: value.destination,
        vot_bdt_per_min: value.vot,
        comfort_bdt_per_min: value.comfort,
        modes: value.modes,
        owns: value.owns,
        avoid: value.avoid,
      });
      // Drop stale responses — the sliders fire these in bursts.
      if (ticket !== latest.current) return;
      setResult(res);
      setSelected(res.itineraries[0]?.id);
    } catch (err) {
      if (ticket === latest.current) {
        setError((err as Error).message);
        setResult(null);
      }
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  const runNatural = useCallback(async (text: string) => {
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.planNatural(text);
      if (ticket !== latest.current) return;
      setResult(res);
      setParsed(res.parsed_query ?? null);
      setSelected(res.itineraries[0]?.id);
      setForm((f) => ({
        ...f,
        origin: res.origin.name,
        destination: res.destination.name,
        vot: res.vot_bdt_per_min,
        comfort: res.parsed_query?.comfort_bdt_per_min ?? f.comfort,
        avoid: res.parsed_query?.avoid ?? [],
      }));
    } catch (err) {
      if (ticket === latest.current) setError((err as Error).message);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(DEFAULTS);
  }, [run]);

  const shown: Itinerary | undefined = useMemo(() => {
    if (!result) return undefined;
    return (
      result.pareto_front.find((i) => i.id === selected) ??
      result.itineraries.find((i) => i.id === selected) ??
      result.itineraries[0]
    );
  }, [result, selected]);

  const headline = useMemo(() => {
    if (!result) return null;
    const fastest = result.itineraries.find((i) => i.label === 'fastest');
    // Lead with the mixed-mode option — that is the whole differentiator.
    const mixed = result.itineraries.find((i) => i.kind === 'multimodal');
    const best = mixed ?? result.itineraries[0];
    if (!best || !fastest || best.id === fastest.id || best.savings_vs_fastest <= 0) return null;
    return {
      saves: best.savings_vs_fastest,
      costsMin: Math.max(0, Math.round(best.minutes_vs_fastest)),
      exclusive: best.kind === 'multimodal',
    };
  }, [result]);

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100dvh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* The selected journey, drawn large. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pt: { xs: 8, md: 9 },
          pb: { xs: 22, md: 20 },
          pl: { xs: 0, md: `${PANEL_WIDTH + 40}px` },
        }}
      >
        <JourneyView itinerary={shown} />
      </Box>

      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 3,
          px: 2,
          py: 1,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.surfaceContainerLowest',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            পথ
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Poth
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}
          >
            {result
              ? `${result.origin.name} → ${result.destination.name}`
              : 'cheaper ways across Dhaka'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {result && (
            <Tooltip title="Cost against time">
              <IconButton
                size="small"
                onClick={() => setShowChart((v) => !v)}
                color={showChart ? 'primary' : 'default'}
              >
                <InsightsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <ThemeToggle />
        </Stack>
        {loading && (
          <LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />
        )}
      </Paper>

      {/* Results rail, floating like a directions panel. */}
      <Box
        sx={{
          position: 'absolute',
          zIndex: 2,
          top: { xs: 66, md: 70 },
          left: { xs: 12, md: 16 },
          right: { xs: 12, md: 'auto' },
          bottom: { xs: 'auto', md: 16 },
          width: { xs: 'auto', md: PANEL_WIDTH },
          maxHeight: { xs: '38dvh', md: 'none' },
          overflowY: 'auto',
          overflowX: 'hidden',
          pr: 0.5,
          pb: 2,
        }}
      >
        <Stack spacing={1.5}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {headline && (
            <Paper
              elevation={6}
              sx={{
                p: 1.75,
                borderRadius: 2,
                bgcolor: 'primary.light',
                color: 'primary.dark',
                border: '1px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                Save {taka(headline.saves)}
                {headline.costsMin > 0 ? ` for ${headline.costsMin} min` : ' and arrive sooner'}
              </Typography>
              {headline.exclusive && (
                <Typography variant="caption">
                  A mixed-mode route no other app will show you.
                </Typography>
              )}
            </Paper>
          )}

          {parsed && (
            <Alert
              severity="info"
              sx={{ borderRadius: 2, py: 0 }}
              onClose={() => setParsed(null)}
            >
              <Typography variant="caption">
                Read by <strong>{parsed.source}</strong> · ৳{parsed.vot_bdt_per_min?.toFixed(1)}/min
                {parsed.avoid.length > 0 && ` · avoiding ${parsed.avoid.join(', ')}`}
              </Typography>
            </Alert>
          )}

          {result?.itineraries.map((it) => (
            <ItineraryCard
              key={it.id}
              itinerary={it}
              highlight={it.id === selected}
              onSelect={() => setSelected(it.id)}
            />
          ))}

          <Collapse in={showChart} unmountOnExit>
            {result && (
              <Paper
                elevation={6}
                sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  The trade-off
                </Typography>
                <ParetoChart
                  front={result.pareto_front}
                  selectedId={selected}
                  onSelect={setSelected}
                />
              </Paper>
            )}
          </Collapse>

          {result && (
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', pb: 1 }}>
              <Chip size="small" variant="outlined" label={`${result.considered} routes`} />
              <Chip
                size="small"
                variant="outlined"
                label={result.geometry_source === 'osrm' ? 'road geometry' : 'estimated geometry'}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${result.pareto_front.length} undominated`}
              />
            </Stack>
          )}
        </Stack>
      </Box>

      <Composer
        onSubmit={runNatural}
        onOpenSettings={() => setSettingsOpen(true)}
        loading={loading}
        geminiActive={geminiActive}
        summary={result?.disclaimer}
        leftOffset={PANEL_WIDTH + 16}
      />

      <TripSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        value={form}
        onChange={setForm}
        onSubmit={() => run(form)}
        loading={loading}
      />
    </Box>
  );
}
