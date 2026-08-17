'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { api } from '@/lib/api';
import type { Place } from '@/lib/types';

/**
 * Searches the server as you type. The 30 seeded landmarks are only a warm
 * start — everything else comes from OpenStreetMap, so arbitrary Dhaka places
 * ("EMK Center", "Jamuna Future Park") resolve without being hardcoded.
 */
export default function PlaceInput({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const [input, setInput] = useState(value);
  const [options, setOptions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => setInput(value), [value]);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    // Debounce: one request per pause, not per keystroke.
    const timer = setTimeout(async () => {
      const ticket = ++seq.current;
      setLoading(true);
      try {
        const res = await api.places(q);
        if (ticket === seq.current) setOptions(res);
      } catch {
        if (ticket === seq.current) setOptions([]);
      } finally {
        if (ticket === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [input]);

  const names = useMemo(() => options.map((o) => o.name), [options]);
  const bySource = useMemo(
    () => new Map(options.map((o) => [o.name, o.source] as const)),
    [options],
  );

  return (
    <Autocomplete
      freeSolo
      options={names}
      filterOptions={(x) => x} // server already filtered; don't filter twice
      inputValue={input}
      onInputChange={(_, v, reason) => {
        setInput(v);
        if (reason === 'input') onChange(v);
      }}
      onChange={(_, v) => {
        if (typeof v === 'string') {
          setInput(v);
          onChange(v);
        }
      }}
      loading={loading}
      renderOption={(props, option) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        return (
          <Box component="li" key={key} {...rest}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" noWrap>
                {option}
              </Typography>
            </Box>
            {bySource.get(option) === 'landmark' && (
              <Chip size="small" variant="outlined" label="saved" sx={{ ml: 1 }} />
            )}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: icon ? (
                <InputAdornment position="start">{icon}</InputAdornment>
              ) : undefined,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
