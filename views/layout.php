<?php
/** @var bool $autenticado */
/** @var array|null $usuario */
/** @var string $vistaInicial */

use App\Core\Auth;

$temaInicial = ($usuario['tema'] ?? 'claro') === 'oscuro' ? 'dark' : '';
?>
<!DOCTYPE html>
<html lang="es" class="<?= $temaInicial ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= APP_NAME ?></title>
<meta name="theme-color" content="#4F46E5">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/img/icon.svg">
<link rel="apple-touch-icon" href="/img/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/css/tailwind.css">
</head>
<body class="min-h-screen bg-fondo text-texto antialiased flex flex-col">
<?php if ($autenticado): ?>
    <?php require __DIR__ . '/partials/topbar.php'; ?>
    <div class="flex flex-1 min-h-0">
        <?php require __DIR__ . '/partials/sidebar.php'; ?>
        <div class="flex-1 min-w-0 flex flex-col">
            <main id="app" class="flex-1 min-w-0 w-full max-w-[1600px] mx-auto p-4 md:p-8"></main>
            <footer class="shrink-0 bg-fondo px-4 py-3 text-center text-xs text-texto-secundario">
                © <?= date('Y') ?> <?= htmlspecialchars(APP_NAME) ?>
            </footer>
        </div>
    </div>
<?php else: ?>
    <main id="app" class="flex-1 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,var(--color-acento-suave),transparent_60%)]"></main>
    <footer class="shrink-0 bg-fondo px-4 py-3 text-center text-xs text-texto-secundario">
        © <?= date('Y') ?> <?= htmlspecialchars(APP_NAME) ?>
    </footer>
<?php endif; ?>

<div id="toasts" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"></div>

<script>
    window.__BOOTSTRAP__ = <?= json_encode([
        'autenticado' => $autenticado,
        'usuario' => $usuario,
        'csrfToken' => Auth::csrfToken(),
        'vistaInicial' => $vistaInicial,
        'appName' => APP_NAME,
    ], JSON_UNESCAPED_UNICODE) ?>;
</script>
<script type="module" src="/js/core/App.js"></script>
</body>
</html>
