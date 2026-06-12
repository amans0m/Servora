import { SetMetadata } from '@nestjs/common';

export const SKIP_ANTI_REPLAY = 'skipAntiReplay';

/**
 * Exempt a route from the anti-replay signature requirement (§A3). Use only
 * where a per-session signing key isn't available (e.g. logout during session
 * teardown). Public routes are exempt automatically.
 */
export const SkipAntiReplay = () => SetMetadata(SKIP_ANTI_REPLAY, true);
