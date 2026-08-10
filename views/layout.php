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
<link rel="icon" type="image/svg+xml" href="/public/icons/icon.svg">
<link rel="apple-touch-icon" href="/public/icons/icon.svg">
<link rel="stylesheet" href="/public/css/tailwind.css">
</head>
<body class="h-full min-h-screen bg-fondo text-texto antialiased">
<?php if ($autenticado): ?>
    <?php require __DIR__ . '/partials/topbar.php'; ?>
    <div class="flex" style="min-height: calc(100vh - 3.5rem)">
        <?php require __DIR__ . '/partials/sidebar.php'; ?>
        <main id="app" class="flex-1 min-w-0 p-4 md:p-6"></main>
    </div>
<?php else: ?>
    <main id="app" class="min-h-screen flex items-center justify-center p-4"></main>
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
<script type="module" src="/public/js/core/App.js"></script>
</body>
</html>
