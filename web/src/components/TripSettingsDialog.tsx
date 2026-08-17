'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import JourneyForm, { type JourneyFormValue } from './JourneyForm';
import TripLogCard from './TripLogCard';

export default function TripSettingsDialog({
  open,
  onClose,
  value,
  onChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  value: JourneyFormValue;
  onChange: (v: JourneyFormValue) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Trip settings</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <JourneyForm
          value={value}
          onChange={onChange}
          onSubmit={() => {
            onSubmit();
            onClose();
          }}
          loading={loading}
          hideSubmit
        />

        <Divider sx={{ my: 3 }} />

        <Box>
          <TripLogCard flat />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onSubmit();
            onClose();
          }}
          disabled={loading}
        >
          Update the plan
        </Button>
      </DialogActions>
    </Dialog>
  );
}
