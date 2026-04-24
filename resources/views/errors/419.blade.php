<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>419 - Session Expired</title>
    <style>
        :root { color-scheme: dark; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, Helvetica, sans-serif;
            background: radial-gradient(circle at top, #1f2937, #020617 65%);
            color: #e2e8f0;
        }
        .card {
            max-width: 720px;
            padding: 48px 36px;
            border: 1px solid rgba(251, 191, 36, 0.25);
            border-radius: 24px;
            background: rgba(15, 23, 42, 0.85);
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
            text-align: center;
        }
        h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); margin: 0 0 12px; }
        p { color: #cbd5e1; line-height: 1.6; }
        a {
            display: inline-block;
            margin: 12px 8px 0;
            padding: 12px 18px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 700;
        }
        .primary { background: #fbbf24; color: #020617; }
        .secondary { border: 1px solid rgba(148, 163, 184, 0.35); color: #e2e8f0; }
    </style>
</head>
<body>
    <main class="card">
        <div style="letter-spacing: .25em; text-transform: uppercase; color: #fbbf24; font-size: .85rem; margin-bottom: 16px;">Error 419</div>
        <h1>Session expired</h1>
        <p>Your session token is no longer valid. Refresh the page or sign in again to continue.</p>
        <div>
            <a class="primary" href="/">Refresh Home</a>
            <a class="secondary" href="/login">Login</a>
        </div>
    </main>
</body>
</html>
