import { useEffect, useState } from 'react';
import { GameFrame, type RunningGame } from './components/GameFrame.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { StatusLine } from './components/StatusLine.tsx';
import { ArcadeScreen } from './screens/ArcadeScreen.tsx';
import { DealScreen } from './screens/DealScreen.tsx';
import { RulesScreen } from './screens/RulesScreen.tsx';
import { useSection } from './sections.ts';

export function App() {
  const section = useSection();
  const [running, setRunning] = useState<RunningGame | null>(null);

  // Moving to another section closes the game frame.
  useEffect(() => setRunning(null), [section]);

  return (
    <div className="app">
      <Sidebar active={section} />
      <main className={running ? 'main main--playing' : 'main'}>
        {running ? (
          <GameFrame game={running} onClose={() => setRunning(null)} />
        ) : section === 'arcade' ? (
          <ArcadeScreen />
        ) : section === 'deal' ? (
          <DealScreen />
        ) : (
          <RulesScreen onLaunchWeb={setRunning} />
        )}
      </main>
      <StatusLine />
    </div>
  );
}
