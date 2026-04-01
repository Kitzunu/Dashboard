const MAX_POINTS = 120; // 120 × 30 s = 60 min

const history = [];

function record(cpu, memory) {
  history.push({ time: Date.now(), cpu, memory });
  if (history.length > MAX_POINTS) history.shift();
}

function getHistory() { return [...history]; }

module.exports = { record, getHistory };
