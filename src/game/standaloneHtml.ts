/**
 * Utility to download the standalone single-file HTML version of Type Fighter.
 */

export function downloadStandaloneHtml() {
  fetch('/type-fighter.html')
    .then((res) => res.text())
    .then((htmlContent) => {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TypeFighter.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error('Failed to download standalone HTML file:', err);
    });
}
