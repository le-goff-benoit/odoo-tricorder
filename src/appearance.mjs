// One palette for the interface and terminals. No terminal/session is recreated.
export function resolveTheme(preference, systemDark) {
  return ['light', 'dark'].includes(preference) ? preference : systemDark ? 'dark' : 'light';
}

export function terminalTheme(css) {
  const color = name => css.getPropertyValue(name).trim();
  return {
    background: color('--bg'), foreground: color('--text'), cursor: color('--accent'),
    cursorAccent: color('--bg'), selectionBackground: color('--selection'),
    black: color('--ansi-black'), brightBlack: color('--text-3'),
    red: color('--danger'), brightRed: color('--danger'),
    green: color('--ok'), brightGreen: color('--ok'),
    yellow: color('--warn'), brightYellow: color('--warn'),
    blue: color('--accent'), brightBlue: color('--accent'),
    magenta: color('--orch'), brightMagenta: color('--orch'),
    cyan: color('--info'), brightCyan: color('--info'),
    white: color('--ansi-white'), brightWhite: color('--text'),
  };
}
