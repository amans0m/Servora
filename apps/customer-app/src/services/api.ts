import { createApiClient } from '@servora/mobile-shared';

import { config } from './config';

/** The single typed API client all features go through (services/, §9.4). */
export const apiClient = createApiClient({ baseUrl: config.apiBaseUrl });
