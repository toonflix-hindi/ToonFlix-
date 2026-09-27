<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Watch - ToonFlix Hindi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="style.css">
</head>
<body class="watch-body">

<!-- ═══ HEADER ═══ -->
<header class="cr-header">
  <a href="index.html" class="cr-logo">Toon<span>Flix</span></a>
  <div class="cr-header-actions">
    <button class="icon-btn" onclick="goBack()"><i class="fas fa-arrow-left"></i></button>
    <a href="login.html" class="icon-btn"><i class="fas fa-cog"></i></a>
  </div>
</header>

<!-- ═══ WATCH CONTENT ═══ -->
<div class="watch-container" id="watchContainer">
  <div style="padding:60px 20px;text-align:center;">
    <p class="empty-msg">⏳ Loading...</p>
  </div>
</div>

<!-- ═══ SCRIPTS ═══ -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="analytics.js"></script>
<script src="watch.js"></script>
</body>
</html>
