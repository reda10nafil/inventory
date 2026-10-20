import { isMeshRequestAuthorized } from '../src/services/meshAuth';

const token = '0123456789ABCDEF';
const requestUrl = () => new URL('http://mesh.local/pull');

describe('mesh request authentication', () => {
  it('rejects requests when the room has no active token', () => {
    expect(isMeshRequestAuthorized(requestUrl(), undefined, null)).toBe(false);
  });

  it('rejects requests without a credential', () => {
    expect(isMeshRequestAuthorized(requestUrl(), undefined, token)).toBe(false);
  });

  it('rejects a mismatched bearer credential', () => {
    expect(isMeshRequestAuthorized(requestUrl(), 'Bearer wrong', token)).toBe(false);
  });

  it('accepts the matching bearer credential', () => {
    expect(isMeshRequestAuthorized(requestUrl(), `Bearer ${token}`, token)).toBe(true);
  });

  it('accepts the matching query credential for compatibility', () => {
    expect(isMeshRequestAuthorized(new URL(`http://mesh.local/pull?token=${token}`), undefined, token)).toBe(true);
  });

  it('does not fall back to a query credential when an explicit bearer is wrong', () => {
    expect(isMeshRequestAuthorized(new URL(`http://mesh.local/pull?token=${token}`), 'Bearer wrong', token)).toBe(false);
  });
});
