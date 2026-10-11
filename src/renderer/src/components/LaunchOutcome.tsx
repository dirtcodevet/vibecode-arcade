import type { LaunchResult } from '../../../shared/bridge.ts';

export function LaunchOutcome({ result }: { result: LaunchResult }) {
  return (
    <p className="outcome" data-launch={result.kind}>
      {describe(result)}
    </p>
  );
}

function describe(result: LaunchResult): string {
  switch (result.kind) {
    case 'web':
      return `Opened ${result.title} in the sandboxed frame.`;
    case 'native':
      return `Started ${result.path} natively${result.pid === null ? '' : ` (pid ${result.pid})`}.`;
    case 'rejected': {
      const count = result.violations.length;
      return `Refused: the package failed admission again (${count} ${count === 1 ? 'violation' : 'violations'}), so nothing was started.`;
    }
    case 'unavailable':
    case 'error':
      return result.reason;
  }
}
