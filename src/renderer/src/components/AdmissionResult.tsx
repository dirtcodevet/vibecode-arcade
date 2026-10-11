import { RULES } from '../../../framework/rules.ts';
import type { PackageReport } from '../../../shared/bridge.ts';
import { viewManifest, type ManifestView } from '../manifest-view.ts';
import { ViolationList } from './ViolationList.tsx';

export function AdmissionResult({ report }: { report: PackageReport }) {
  const { admission } = report;
  const view = viewManifest(report.manifest);
  const count = admission.violations.length;
  return (
    <div className="admission" data-admission={admission.ok ? 'pass' : 'fail'}>
      <div className="admission-head">
        <span className={admission.ok ? 'badge badge--pass' : 'badge badge--fail'}>
          {admission.ok ? 'Admitted' : 'Rejected'}
        </span>
        <span className="muted">
          {admission.ok ? `Passes all ${RULES.length} rules.` : `${count} ${count === 1 ? 'violation' : 'violations'}`}
        </span>
      </div>
      {view.title !== undefined && <ManifestSummary view={view} />}
      {!admission.ok && <ViolationList violations={admission.violations} />}
    </div>
  );
}

function ManifestSummary({ view }: { view: ManifestView }) {
  return (
    <dl className="manifest">
      <dt>title</dt>
      <dd>
        {view.title}
        {view.tagline && <span className="muted"> — {view.tagline}</span>}
      </dd>
      <dt>maker</dt>
      <dd>{view.maker ?? '—'}</dd>
      <dt>license</dt>
      <dd>{view.license ?? '—'}</dd>
      <dt>builds</dt>
      <dd className="manifest-builds">
        {view.builds.length === 0
          ? '—'
          : view.builds.map(([platform, path]) => (
              <span key={platform}>
                <b>{platform}</b> {path}
              </span>
            ))}
      </dd>
    </dl>
  );
}
