<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kami Sedang Menghubungkan Ulang — CafeNow</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #faf7f2;
            color: #2c1810;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
        }
        .card {
            background: #fff;
            border: 1px solid #e7e0d8;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(44, 24, 16, 0.08);
            max-width: 440px;
            width: 100%;
            padding: 40px 32px;
            text-align: center;
        }
        .logo {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            border-radius: 18px;
            background: linear-gradient(135deg, #f97316, #f59e0b);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
            color: #fff;
        }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        p { font-size: 14px; color: #6b5344; line-height: 1.6; margin-bottom: 24px; }
        button {
            background: #f97316;
            color: #fff;
            border: 0;
            border-radius: 12px;
            padding: 12px 28px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover { background: #ea580c; }
        .hint { font-size: 12px; color: #a08d7e; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">CN</div>
        <h1>Koneksi Terputus Sementara</h1>
        <p>Kami sedang mencoba menghubungkan kembali ke server. Silakan muat ulang halaman ini untuk melanjutkan.</p>
        <button type="button" onclick="window.location.reload()">Muat Ulang Halaman</button>
        <p class="hint">Jika masalah berlanjut, coba lagi dalam beberapa saat.</p>
    </div>
</body>
</html>
