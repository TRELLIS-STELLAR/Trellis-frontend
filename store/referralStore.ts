import { create } from 'zustand';
import { ReferralService } from '../../features/referral-sharing/services/referralService';
import {
  ReferralLink,
  ReferralStats,
  ReferralReward,
} from '../../features/referral-sharing/types';

interface ReferralState {
  stats: ReferralStats | null;
  links: ReferralLink[];
  rewards: ReferralReward[];
  loading: boolean;
  error: string | null;
}

interface ReferralActions {
  fetchReferralData: (userId: string) => Promise<void>;
  generateLink: (params: {
    userId: string;
    reward?: string;
  }) => Promise<ReferralLink>;
  claimReferralReward: (rewardId: string) => Promise<string>;
  clearError: () => void;
}

export type ReferralStore = ReferralState & ReferralActions;

export const useReferralStore = create<ReferralStore>((set, get) => ({
  stats: null,
  links: [],
  rewards: [],
  loading: false,
  error: null,

  fetchReferralData: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [stats, links, rewards] = await Promise.all([
        ReferralService.getReferralStats(userId),
        ReferralService.getUserReferralLinks(userId),
        ReferralService.getReferralRewards(userId),
      ]);
      set({ stats, links, rewards, loading: false });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch referral data',
      });
    }
  },

  generateLink: async ({ userId, reward }: { userId: string; reward?: string }) => {
    try {
      const newLink = await ReferralService.generateReferralLink(userId, reward);
      set((state) => ({
        links: [newLink, ...state.links],
        stats: state.stats
          ? { ...state.stats, activeLinks: state.stats.activeLinks + 1 }
          : state.stats,
      }));
      return newLink;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate link';
      set({ error: message });
      throw new Error(message);
    }
  },

  claimReferralReward: async (rewardId: string) => {
    try {
      const success = await ReferralService.claimReward(rewardId);
      if (!success) throw new Error('Claim failed');
      const rewards = get().rewards.map((reward) =>
        reward.id === rewardId
          ? { ...reward, status: 'claimed' as const }
          : reward,
      );
      set({ rewards });
      return rewardId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to claim reward';
      set({ error: message });
      throw new Error(message);
    }
  },

  clearError: () => set({ error: null }),
}));
