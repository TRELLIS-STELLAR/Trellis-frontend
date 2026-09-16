'use client';

import { QuotaVisualization } from '@/features/agent-telemetry/components/QuotaVisualization';
import { BonusDashboard } from '@/features/trading-bonuses/components/BonusDashboard';
import { WaitlistStatus } from '@/components/WaitlistStatus';
import { AgentCard } from '@/components/portfolio/AgentCard';
import { 
  Box, 
  Typography, 
  Chip, 
} from '@mui/material';

export default function Portfolio() {
  const agents = [
    {
      id: 1,
      name: 'MyDataBot',
      status: 'Active',
      performance: 94,
      interactions: 1250,
      createdAt: '2024-12-15',
    },
    {
      id: 2,
      name: 'ContentHelper',
      status: 'Active',
      performance: 87,
      interactions: 856,
      createdAt: '2024-11-20',
    },
  ];

  return (
    <main className="pt-24 pb-20 px-4 sm:px-6 overflow-x-hidden">
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }} className="glow-text">
            Agent Portfolio
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Coordinate and supervise your constellation of AI agents.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, mb: 12 }}>
          {/* Waitlist Status Section */}
          <WaitlistStatus />
          
          {/* Real-time Quota and Rate Limit Visualization */}
          <QuotaVisualization userId="user-123" />

          {/* Trading Bonuses Feature */}
          <BonusDashboard />
        </Box>

        <Box sx={{ mt: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            Deployed Units
            <Chip label={agents.length} size="small" sx={{ backgroundColor: 'rgba(79, 191, 155, 0.2)', color: 'primary.light', fontWeight: 700 }} />
          </Typography>
          
          <Box className="space-y-6">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </Box>
        </Box>
      </Box>
    </main>
  );
}