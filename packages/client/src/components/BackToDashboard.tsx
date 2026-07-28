export function BackToDashboard() {
  const isSSO = localStorage.getItem('sso_source') === 'empcloud';
  if (!isSSO) return null;

  const returnUrl =
    localStorage.getItem('empcloud_return_url') ||
    'https://test-empcloud.empcloud.com/dashboard';

  return (
    <a
      href={returnUrl}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>&larr; EMP Cloud</span>
    </a>
  );
}
