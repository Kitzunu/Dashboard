// Maps SGR foreground color codes to CSS color values tuned for a dark terminal background.
const SGR_FG = {
  30: '#666666',  // black → dark gray (black invisible on dark bg)
  31: '#e05c5c',  // red
  32: '#3ddc84',  // green
  33: '#c9a227',  // yellow
  34: '#5b9bd5',  // blue
  35: '#c06dc0',  // magenta
  36: '#5bbdbd',  // cyan
  37: '#d4d8e8',  // white
  90: '#7a85a0',  // bright black / dark gray
  91: '#f08080',  // bright red
  92: '#6de8a0',  // bright green
  93: '#e8c048',  // bright yellow
  94: '#7bb5e5',  // bright blue
  95: '#d07dd0',  // bright magenta
  96: '#6dcdcd',  // bright cyan
  97: '#ffffff',  // bright white
};

// Parse a string containing SGR ANSI escape codes into an array of styled segments.
// Each segment: { text: string, color: string|null, bold: boolean }
export function parseAnsi(str) {
  const segments = [];
  // Match SGR sequences only: \x1B[ ... m
  const re = /\x1B\[([0-9;]*)m/g;
  let lastIndex = 0;
  let color = null;
  let bold = false;

  let match;
  while ((match = re.exec(str)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: str.slice(lastIndex, match.index), color, bold });
    }
    lastIndex = re.lastIndex;

    const codes = match[1] === '' ? [0] : match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0)              { color = null; bold = false; }
      else if (code === 1)         { bold = true; }
      else if (code === 22)        { bold = false; }
      else if (SGR_FG[code])       { color = SGR_FG[code]; }
      else if (code === 39)        { color = null; }  // default fg
    }
  }

  if (lastIndex < str.length) {
    segments.push({ text: str.slice(lastIndex), color, bold });
  }

  return segments;
}
