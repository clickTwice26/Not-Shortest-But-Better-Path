'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorScheme } from '@mui/material/styles';
import ItineraryCard from '@/components/ItineraryCard';
import JourneyForm, { type JourneyFormValue } from '@/components/JourneyForm';
import ParetoChart from '@/components/ParetoChart';
import TripLogCard from '@/components/TripLogCard';
import { api, taka } from '@/lib/api';
import type { ParsedQuery, Place, PlanResult } from '@/lib/types';

const DEFAULTS: JourneyFormValue = {
  origin: 'Dhanmondi 27',
  destination: 'Uttara Sector 7',
  vot: 2,
  modes: ['walk', 'rickshaw', 'cng', 'bike_hail', 'car_hail', 'bus', 'metro'],
  owns: [],
};

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Box sx={{ width: 40, height: 40 }} />;

  const dark = mode === 'dark';
  return (
    <Tooltip title={dark ? 'Light' : 'Dark'}>
      <IconButton onClick={() => setMode(dark ? 'light' : 'dark')} aria-label="Toggle theme">
        {dark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default function Home() {
  const [form, setForm] = useState<JourneyFormValue>(DEFAULTS);
  const [places, setPlaces] = useState<Place[]>([]);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const latest = useRef(0);

  useEffect(() => {
    api.places().then(setPlaces).catch(() => setPlaces([]));
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
        modes: value.modes,
        owns: value.owns,
      });
      // Drop stale responses — the slider fires these in bursts.
      if (ticket !== latest.current) return;
      setResult(res);
      setSelected(res.itineraries.find((i) => i.label === 'best_value')?.id);
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
      setSelected(res.itineraries.find((i) => i.label === 'best_value')?.id);
      if (res.parsed_query) {
        setForm((f) => ({
          ...f,
          origin: res.origin.name,
          destination: res.destination.name,
          vot: res.vot_bdt_per_min,
        }));
      }
    } catch (err) {
      if (ticket === latest.current) setError((err as Error).message);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  // First plan on mount.
  useEffect(() => {
    void run(DEFAULTS);
  }, [run]);

  const headline = useMemo(() => {
    if (!result) return null;
    const best = result.itineraries.find((i) => i.label === 'best_value');
    const fastest = result.itineraries.find((i) => i.label === 'fastest');
    if (!best || !fastest || best.id === fastest.id || best.savings_vs_fastest <= 0) return null;
    return {
      saves: best.savings_vs_fastest,
      costsMin: Math.max(0, Math.round(best.minutes_vs_fastest)),
      summary: best.summary,
    };
  }, [result]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          backdropFilter: 'blur(12px)',
          bgcolor: 'background.surfaceContainerLow',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline", flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
              পথ
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Poth
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              cheaper ways across Dhaka
            </Typography>
          </Stack>
          <ThemeToggle />
        </Toolbar>
        {loading && <LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />}
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
              <Card sx={{ p: { xs: 2.5, md: 3 } }}>
                <JourneyForm
                  places={places}
                  value={form}
                  onChange={setForm}
                  onSubmit={() => run(form)}
                  onNaturalSubmit={runNatural}
                  loading={loading}
                />
              </Card>

              {parsed && (
                <Alert severity="info" sx={{ borderRadius: 4 }} onClose={() => setParsed(null)}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Parsed by <strong>{parsed.source}</strong> — priority set the slider to ৳
                    {parsed.vot_bdt_per_min?.toFixed(1)}/min.
                  </Typography>
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {parsed.origin_text && <Chip size="small" label={`from: ${parsed.origin_text}`} />}
                    {parsed.destination_text && (
                      <Chip size="small" label={`to: ${parsed.destination_text}`} />
                    )}
                    {parsed.max_duration_min && (
                      <Chip size="small" label={`≤ ${parsed.max_duration_min} min`} />
                    )}
                  </Stack>
                </Alert>
              )}

              <TripLogCard />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 4 }}>
                  {error}
                </Alert>
              )}

              {headline && (
                <Box>
                  <Typography variant="h2" sx={{ letterSpacing: '-0.02em' }}>
                    Save {taka(headline.saves)}
                    {headline.costsMin > 0 ? (
                      <Typography component="span" variant="h2" color="text.secondary">
                        {' '}
                        for {headline.costsMin} min
                      </Typography>
                    ) : (
                      <Typography component="span" variant="h2" color="primary.main">
                        {' '}
                        and get there sooner
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                    {headline.summary} — the route no other app will show you.
                  </Typography>
                </Box>
              )}

              {result && (
                <>
                  <Stack spacing={2}>
                    {result.itineraries.map((it) => (
                      <ItineraryCard
                        key={it.id}
                        itinerary={it}
                        highlight={it.id === selected}
                      />
                    ))}
                  </Stack>

                  <Card sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                      The trade-off
                    </Typography>
                    <ParetoChart
                      front={result.pareto_front}
                      selectedId={selected}
                      onSelect={setSelected}
                    />
                  </Card>

                  <Stack
                    direction="row"
                    spacing={1}
                   
                    useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Chip size="small" variant="outlined" label={`${result.considered} routes enumerated`} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${result.pareto_front.length} on the Pareto front`}
                    />
                    {result.cached && <Chip size="small" variant="outlined" label="cached" />}
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    {result.disclaimer}
                  </Typography>
                </>
              )}

              {!result && !error && !loading && (
                <Card sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Pick a start and an end to see the options.
                  </Typography>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
