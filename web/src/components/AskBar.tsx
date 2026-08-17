'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { alpha } from '@mui/material/styles';

/**
 * The primary way in. Dhaka commuters do not think in form fields — they think
 * "Farmgate theke Uttara, taka bachate chai". Gemini turns that into an origin,
 * a destination and a value-of-time weight; the structured form underneath is
 * the fallback, not the main path.
 */

const EXAMPLES = [
  'Farmgate theke Uttara, taka bachate chai but 40 min er beshi na',
  'Mirpur 10 to Motijheel, taratari jete hobe',
  'Dhanmondi 27 theke Banani, bus e jabo na',
  'ধানমন্ডি থেকে উত্তরা, সবচেয়ে সস্তা রাস্তা',
];

export default function AskBar({
  onSubmit,
  loading,
  geminiActive,
}: {
  onSubmit: (text: string) => void;
  loading: boolean;
  geminiActive?: boolean;
}) {
  const [text, setText] = useState('');

  const send = (value?: string) => {
    const q = (value ?? text).trim();
    if (q) onSubmit(q);
  };

  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 7,
        border: '1px solid',
        borderColor: 'primary.main',
        background: (t) =>
          `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.1)}, ${alpha(
            t.palette.info.main,
            0.08,
          )})`,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <AutoAwesomeIcon fontSize="small" color="primary" />
        <Typography variant="h6">Just say where you're going</Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          size="small"
          label={geminiActive ? 'Gemini' : 'Gemini offline'}
          color={geminiActive ? 'primary' : 'default'}
          variant={geminiActive ? 'filled' : 'outlined'}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Bangla, Banglish or English. Say how much of a hurry you're in and it sets the sliders for
        you.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={EXAMPLES[0]}
        slotProps={{
          input: {
            sx: { fontSize: '1.05rem', bgcolor: 'background.surfaceContainerLowest' },
            startAdornment: (
              <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                <AutoAwesomeIcon fontSize="small" color="primary" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.5 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<AutoAwesomeIcon />}
          onClick={() => send()}
          disabled={!text.trim() || loading}
        >
          {loading ? 'Reading…' : 'Plan this trip'}
        </Button>
      </Stack>

      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5 }}>
        {EXAMPLES.map((ex) => (
          <Chip
            key={ex}
            size="small"
            variant="outlined"
            clickable
            disabled={loading}
            onClick={() => {
              setText(ex);
              send(ex);
            }}
            label={ex.length > 34 ? `${ex.slice(0, 34)}…` : ex}
            sx={{ maxWidth: '100%' }}
          />
        ))}
      </Stack>
    </Box>
  );
}
