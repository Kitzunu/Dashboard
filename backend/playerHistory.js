const MAX_POINTS = 120;
const history = [];

function record(count) {
  history.push({ time: Date.now(), count });
  if (history.length > MAX_POINTS) history.shift();
}

function getHistory() { return [...history]; }

module.exports = { record, getHistory };
