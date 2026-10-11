import type { Violation } from '../../../framework/types.ts';

export function ViolationList({ violations }: { violations: readonly Violation[] }) {
  return (
    <ul className="violations">
      {violations.map((violation, index) => (
        <li key={index}>
          <code className="rule-id">{violation.rule}</code>
          <span>{violation.reason}</span>
        </li>
      ))}
    </ul>
  );
}
