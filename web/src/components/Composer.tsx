'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TuneIcon from '@mui/icons-material/Tune';
import { alpha } from '@mui/material/styles';

/**
 * Docked composer, the way a chat app does it. This is the primary input:
 * people think "Farmgate theke Uttara, taka bachate chai", not in form fields.
 * The tune button opens the same trip as structured controls.
 */

const EXAMPLES = [
  'Farmgate theke Uttara, taka bachate chai but 40 min er beshi na',
  'Mirpur 10 to Motijheel, taratari jete hobe',
  'Dhanmondi 27 theke Banani, bus e jabo na',
  'ধানমন্ডি থেকে উত্তরা, সবচেয়ে সস্তা রাস্তা',
];

export default function Composer({
  onSubmit,
  onOpenSettings,
  loading,
  geminiActive,
  summary,
  leftOffset = 0,
}: {
  onSubmit: (text: string) => void;
  onOpenSettings: () => void;
  loading: boolean;
  geminiActive?: boolean;
  summary?: string;
  /** Width to clear on the left so the results rail can run full height. */
  leftOffset?: number;
}) {
  const [text, setText] = useState('');

  const send = (value?: string) => {
    const q = (value ?? text).trim();
    if (!q || loading) return;
    onSubmit(q);
    setText('');
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        pl: { xs: 2, md: `${leftOffset + 16}px` },
        pr: 2,
        pb: 2,
        pt: 6,
        pointerEvents: 'none',
        background: (t) =>
          `linear-gradient(to top, ${t.palette.background.default} 30%, ${alpha(
            t.palette.background.default,
            0,
          )})`,
      }}
    >
      <Box sx={{ maxWidth: 760, mx: 'auto', pointerEvents: 'auto' }}>
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{ flexWrap: 'wrap', mb: 1, justifyContent: 'center' }}
        >
          {EXAMPLES.slice(0, 3).map((ex) => (
            <Chip
              key={ex}
              size="small"
              clickable
              disabled={loading}
              onClick={() => send(ex)}
              label={ex.length > 30 ? `${ex.slice(0, 30)}…` : ex}
              sx={{ fontWeight: 400, bgcolor: 'background.surfaceContainer' }}
            />
          ))}
        </Stack>

        <Paper
          elevation={8}
          sx={{
            p: 1,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surfaceContainerLowest',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
            <Tooltip title="Set the trip manually">
              <IconButton onClick={onOpenSettings} sx={{ mb: 0.25 }}>
                <TuneIcon />
              </IconButton>
            </Tooltip>

            <TextField
              fullWidth
              multiline
              maxRows={4}
              variant="standard"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={loading ? 'Reading…' : 'Where are you going? Bangla, Banglish or English'}
              slotProps={{
                input: { disableUnderline: true, sx: { fontSize: '1rem', py: 1 } },
              }}
            />

            <Tooltip title={geminiActive ? 'Parsed by Gemini' : 'Gemini offline — using keywords'}>
              <AutoAwesomeIcon
                sx={{ fontSize: 18, mb: 1.5, color: geminiActive ? 'primary.main' : 'text.disabled' }}
              />
            </Tooltip>

            <IconButton
              color="primary"
              onClick={() => send()}
              disabled={!text.trim() || loading}
              sx={{
                mb: 0.25,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
              }}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>

        {summary && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 1 }}
          >
            {summary}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
