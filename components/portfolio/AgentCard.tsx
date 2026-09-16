'use client';

import { 
  Box, 
  Typography, 
  Grid, 
  Chip, 
  Button, 
  alpha 
} from '@mui/material';
import {
  TrendingUp as PerformanceIcon,
  Forum as InteractionIcon,
  Settings as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface Agent {
  id: number;
  name: string;
  status: string;
  performance: number;
  interactions: number;
  createdAt: string;
}

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Box
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: '24px',
        border: '1px solid rgba(79, 191, 155, 0.2)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) => `0 8px 30px -10px ${alpha(theme.palette.primary.main, 0.2)}`,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }} className="glow-text">
            {agent.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
            Commissioned: <span style={{ color: (theme) => alpha(theme.palette.text.primary, 0.7) }}>{agent.createdAt}</span>
          </Typography>
        </Box>
        <Chip 
          label={agent.status} 
          size="small"
          sx={{ 
            backgroundColor: 'rgba(52, 211, 153, 0.1)', 
            color: '#34d399', 
            fontWeight: 700,
            borderRadius: '8px'
          }} 
        />
      </Box>

      <Grid container spacing={4} alignItems="center">
        <Grid item xs={6} sm={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, borderRadius: '12px', backgroundColor: 'rgba(79, 191, 155, 0.1)' }}>
              <PerformanceIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>Efficiency</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{agent.performance}%</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, borderRadius: '12px', backgroundColor: 'rgba(240, 180, 96, 0.1)' }}>
              <InteractionIcon sx={{ color: '#F0B460', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>Signal Hits</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#F0B460' }}>{agent.interactions}</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box className="flex gap-3">
            <Button 
              fullWidth 
              variant="contained" 
              startIcon={<ViewIcon />}
              sx={{ 
                py: 1.5, 
                borderRadius: '14px', 
                backgroundColor: 'rgba(79, 191, 155, 0.1)',
                color: 'white',
                boxShadow: 'none',
                '&:hover': { backgroundColor: 'rgba(79, 191, 155, 0.2)' }
              }}
            >
              Monitor
            </Button>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<EditIcon />}
              sx={{ 
                py: 1.5, 
                borderRadius: '14px', 
                borderColor: 'rgba(255,255,255,0.1)',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
              }}
            >
              Modify
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}