import { useEffect, useState } from 'react';
import type { SimulationParameters, SimulationResult } from '../simulation/types';

type Computation = { parameters: SimulationParameters; result?: SimulationResult; error?: string; retainedResult?: SimulationResult };

export function useSimulation(parameters: SimulationParameters) {
  const [computation, setComputation] = useState<Computation>();
  useEffect(() => {
    let worker: Worker | undefined;
    // Debounce slider changes; both timer and active worker are cancelled on new input.
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('../simulation.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ result?: SimulationResult; error?: string }>) => {
          const { result, error } = event.data;
          setComputation(previous => ({ parameters, result, error,
            retainedResult: result?.diagnostics.modelWithinDomain ? result : previous?.retainedResult }));
          worker?.terminate();
        };
        worker.onerror = () => {
          setComputation(previous => ({ parameters, retainedResult: previous?.retainedResult, error: 'Unable to start the calculation worker. Reload the page and try again.' }));
          worker?.terminate();
        };
        worker.postMessage(parameters);
      } catch (error) {
        setComputation(previous => ({ parameters, retainedResult: previous?.retainedResult, error: String(error) }));
      }
    }, 120);
    return () => { window.clearTimeout(timer); worker?.terminate(); };
  }, [parameters]);
  const current = computation?.parameters === parameters;
  return { result: current ? computation?.result : undefined, retainedResult: computation?.retainedResult,
    error: current ? computation?.error : undefined, pending: !current };
}
