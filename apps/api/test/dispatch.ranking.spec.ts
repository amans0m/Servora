import {
  etaMinutes,
  scoreCandidate,
} from '../src/modules/dispatch/dispatch.constants';

describe('dispatch ranking (§7: distance + rating + load)', () => {
  it('prefers a nearer engineer, all else equal', () => {
    const near = scoreCandidate(1000, 0, 4.5);
    const far = scoreCandidate(8000, 0, 4.5);
    expect(near).toBeLessThan(far);
  });

  it('prefers a higher-rated engineer at equal distance/load', () => {
    const better = scoreCandidate(2000, 1, 4.9);
    const worse = scoreCandidate(2000, 1, 4.0);
    expect(better).toBeLessThan(worse);
  });

  it('penalises a busier engineer', () => {
    const free = scoreCandidate(2000, 0, 4.5);
    const busy = scoreCandidate(2000, 2, 4.5);
    expect(free).toBeLessThan(busy);
  });

  it('ranks a slightly-farther idle 5-star over a near busy low-rated one', () => {
    const idleFarTopRated = scoreCandidate(3000, 0, 5.0);
    const nearBusyLowRated = scoreCandidate(1500, 2, 3.5);
    expect(idleFarTopRated).toBeLessThan(nearBusyLowRated);
  });

  it('estimates ETA from distance (~30 km/h), min 1 minute', () => {
    expect(etaMinutes(0)).toBe(1);
    expect(etaMinutes(15000)).toBe(30);
  });

  it('gives higher-tier engineers priority dispatch (§8.4)', () => {
    // Same distance/load/rating; platinum (rank 3) should outrank bronze (rank 0).
    const platinum = scoreCandidate(2000, 0, 4.5, 3);
    const bronze = scoreCandidate(2000, 0, 4.5, 0);
    expect(platinum).toBeLessThan(bronze);
  });
});
