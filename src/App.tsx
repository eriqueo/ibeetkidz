import { useState, type FC } from "react";
import { BootGate } from "./components/BootGate.tsx";
import { Shell } from "./components/Shell.tsx";

export const App: FC = () => {
  const [started, setStarted] = useState(false);
  return started ? <Shell /> : <BootGate onStarted={() => setStarted(true)} />;
};
