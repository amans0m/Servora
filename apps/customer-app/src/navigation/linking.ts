import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

import type { AppStackParamList } from './types';

/**
 * Deep-link config with validation (SECURITY.md B4). Only an allowlist of
 * routes is mapped; `serviceId` is validated before it reaches a screen, so a
 * crafted link can't drive arbitrary navigation or inject params.
 */
export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [Linking.createURL('/'), 'servora://'],
  config: {
    screens: {
      Tabs: {
        screens: { Home: 'home', Bookings: 'bookings', Offers: 'offers', Profile: 'profile' },
      },
      ServiceDetail: {
        path: 'service/:serviceId',
        // Reject anything that isn't a plausible service id.
        parse: { serviceId: (id: string) => (/^[a-zA-Z0-9_-]{1,40}$/.test(id) ? id : '') },
      },
    },
  },
};
