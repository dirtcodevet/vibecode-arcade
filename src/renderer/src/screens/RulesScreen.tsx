import { useEffect, useState } from 'react';
import { RULES } from '../../../framework/rules.ts';
import type { LaunchResult, PackageReport } from '../../../shared/bridge.ts';
import { EXAMPLE_PACKAGES, REFERENCE_CARTRIDGE } from '../../../shared/examples.ts';
import { AdmissionResult } from '../components/AdmissionResult.tsx';
import type { RunningGame } from '../components/GameFrame.tsx';
import { LaunchOutcome } from '../components/LaunchOutcome.tsx';

export function RulesScreen({ onLaunchWeb }: { onLaunchWeb: (game: RunningGame) => void }) {
  const [selected, setSelected] = useState(REFERENCE_CARTRIDGE.dir);
  const [report, setReport] = useState<PackageReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LaunchResult | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    let current = true;
    setReport(null);
    setLoadError(null);
    setOutcome(null);
    window.arcade.loadPackage(selected).then(
      (result) => current && setReport(result),
      (error: unknown) => current && setLoadError(String(error)),
    );
    return () => {
      current = false;
    };
  }, [selected]);

  async function launch() {
    setLaunching(true);
    setOutcome(null);
    try {
      const result = await window.arcade.launchPackage(selected);
      if (result.kind === 'web') onLaunchWeb(result);
      else setOutcome(result);
    } catch (error) {
      setOutcome({ kind: 'error', reason: String(error) });
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="screen screen--wide" data-screen="rules">
      <header className="screen-head">
        <p className="eyebrow">Admission</p>
        <h1>Rules</h1>
        <p className="lede">
          Every package passes the same {RULES.length} checks before it can launch. This list is read from the rules
          module the host enforces.
        </p>
      </header>

      <div className="rules-layout">
        <ol className="rule-list">
          {RULES.map((rule) => (
            <li key={rule.id}>
              <div className="rule-head">
                <h3>{rule.title}</h3>
                <code className="rule-id">{rule.id}</code>
              </div>
              <p>{rule.summary}</p>
              {rule.detail && <p className="rule-detail">{rule.detail}</p>}
            </li>
          ))}
        </ol>

        <section className="card check" aria-live="polite">
          <h2 className="section-label">Check a package</h2>
          <div className="segmented" role="group" aria-label="Package">
            {EXAMPLE_PACKAGES.map((pkg) => (
              <button
                key={pkg.dir}
                type="button"
                aria-pressed={pkg.dir === selected}
                onClick={() => setSelected(pkg.dir)}
              >
                {pkg.label}
              </button>
            ))}
          </div>
          <p className="check-path">{selected}/arcade.json</p>

          {loadError !== null ? (
            <p className="outcome">{loadError}</p>
          ) : report === null ? (
            <p className="muted">Checking…</p>
          ) : (
            <AdmissionResult report={report} />
          )}

          <div className="check-actions">
            <button
              type="button"
              className="button"
              data-action="launch"
              disabled={report === null || launching}
              onClick={launch}
            >
              Admit &amp; launch
            </button>
            <span className="hint">Launch re-reads the package and re-runs every rule first.</span>
          </div>
          {outcome && <LaunchOutcome result={outcome} />}
        </section>
      </div>
    </div>
  );
}
