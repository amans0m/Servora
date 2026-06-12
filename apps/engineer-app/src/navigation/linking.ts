import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

import type { AppStackParamList } from './types';

/** Deep-link config with an allowlist of safe routes only (SECURITY.md B4). */
export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [Linking.createURL('/'), 'servora-engineer://'],
  config: {
    screens: {
      Tabs: {
        screens: { Home: 'home', Earnings: 'earnings', Rewards: 'rewards', Profile: 'profile' },
      },
    },
  },
};
