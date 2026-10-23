import { simulate } from './simulation/index';
import type { SimulationParameters } from './simulation/types';

// Worker lifecycle is tied to one parameter set; stale computations are terminated.
self.onmessage = (event: MessageEvent<SimulationParameters>) => {
  try {
    self.postMessage({ result: simulate(event.data) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Simulation failed.' });
  }
};
