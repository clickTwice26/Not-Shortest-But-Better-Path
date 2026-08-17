'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { api } from '@/lib/api';
import type { ParsedTrip } from '@/lib/types';

const EXAMPLE = 'cng e dhanmondi 27 theke farmgate 150 nilo, jam chilo tai beshi';

/**
 * The moat, one line at a time. Nobody fills a six-field form, so the input is
 * a sentence and the parse happens server-side.
 */
export default function TripLogCard() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedTrip | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'warn' | 'error'; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await api.logTrip(text.trim());
      setParsed(res.parsed);
      setStatus(
        res.stored
          ? { kind: 'ok', message: 'Logged. This corrects the fare estimates for everyone.' }
          : { kind: 'warn', message: `Parsed, but not stored — ${res.reason ?? 'no database'}.` },
      );
      if (res.stored) setText('');
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
        <AutoAwesomeIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1">What did you actually pay?</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Type it however you say it. Real fares are the only thing that makes these estimates true.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={EXAMPLE}
        sx={{ mb: 1.5 }}
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Button variant="contained" onClick={submit} disabled={!text.trim() || busy}>
          {busy ? 'Reading…' : 'Log trip'}
        </Button>
        <Button size="small" onClick={() => setText(EXAMPLE)} disabled={busy}>
          Use example
        </Button>
      </Stack>

      {parsed && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Extracted ({parsed.source})
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
            {parsed.mode && <Chip size="small" label={`mode: ${parsed.mode}`} />}
            {parsed.origin_text && <Chip size="small" label={`from: ${parsed.origin_text}`} />}
            {parsed.dest_text && <Chip size="small" label={`to: ${parsed.dest_text}`} />}
            {parsed.fare_paid != null && (
              <Chip size="small" color="primary" label={`৳${parsed.fare_paid}`} />
            )}
            {parsed.conditions && <Chip size="small" label={parsed.conditions} />}
            <Chip
              size="small"
              variant="outlined"
              label={`confidence ${(parsed.confidence * 100).toFixed(0)}%`}
            />
          </Stack>
        </Box>
      )}

      {status && (
        <Alert
          severity={status.kind === 'ok' ? 'success' : status.kind === 'warn' ? 'warning' : 'error'}
          sx={{ mt: 2, borderRadius: 3 }}
        >
          {status.message}
        </Alert>
      )}
    </Card>
  );
}
