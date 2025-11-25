<?php
/*
 * Template Name: キャンプページ (編集可能)
 * Description: キャンプ場空庭専用のデザインテンプレート。本文は管理画面で編集。
 */

get_header(); 
?>

<style>
    /* --- キャンプページ専用スタイル --- */
    .camp-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* 共通セクション */
    .camp-section {
        padding: 80px 20px;
        max-width: 1100px;
        margin: 0 auto;
    }
    .camp-section h2 {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 50px;
        color: #2C5F2D;
        font-weight: bold;
        letter-spacing: 0.05em;
        position: relative;
    }
    .camp-section h2::after {
        content: "";
        display: block;
        width: 50px;
        height: 3px;
        background: #8D6E63;
        margin: 15px auto 0;
    }

    /* ヒーローエリア */
    .camp-hero {
        height: 60vh;
        min-height: 400px;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.7);
        background-color: #2C5F2D;
        position: relative;
    }
    .camp-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.2);
    }
    .camp-hero-content {
        position: relative;
        z-index: 2;
        text-align: center;
    }
    
    /* ロゴ画像スタイル (h1タグ内) */
    .camp-hero-logo {
        width: auto;
        max-width: 600px;
        height: auto;
        max-height: 150px;
        display: block;
        margin: 0 auto 20px;
    }
    /* h1のリセット */
    .camp-hero h1 { margin: 0; line-height: 1; }

    /* イントロダクション */
    .camp-intro {
        text-align: center;
        font-size: 1.1rem;
        line-height: 2;
        max-width: 800px;
        margin: 0 auto 60px;
    }

    /* フォトギャラリー (自動スクロール) */
    .camp-gallery-section {
        background-color: #fff;
        padding: 60px 0;
        overflow: hidden;
    }
    .gallery-marquee { display: flex; width: max-content; }
    .gallery-track {
        display: flex; gap: 20px;
        animation: scroll-left 80s linear infinite;
    }
    .gallery-track:hover { animation-play-state: paused; }
    @keyframes scroll-left {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
    }
    .gallery-item {
        width: 300px; height: 400px; flex-shrink: 0;
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        transition: transform 0.3s;
    }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; }

    /* マップ画像 */
    .camp-map-img {
        width: 100% !important; max-width: 800px !important;
        height: auto !important; display: block !important; margin: 0 auto !important;
        border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    /* サイト紹介 */
    .site-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px; margin-bottom: 60px;
    }
    .site-card {
        border: 1px solid #eee; border-radius: 8px; overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05); background: #fff;
    }
    .site-card img { width: 100%; height: 200px; object-fit: cover; }
    .site-card-body { padding: 20px; }
    .site-card h3 {
        color: #2C5F2D; margin-bottom: 10px; font-size: 1.3rem;
        border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;
    }
    .site-card p { font-size: 0.95rem; line-height: 1.6; color: #555; }

    /* 設備アイコン */
    .facilities-list {
        display: flex; flex-wrap: wrap; justify-content: center;
        gap: 40px; margin-bottom: 60px; background: #f9fcf9;
        padding: 40px; border-radius: 12px;
    }
    .facility-item { text-align: center; width: 120px; }
    .facility-icon { font-size: 2.5rem; display: block; margin-bottom: 10px; }
    .facility-name { font-weight: bold; color: #2C5F2D; }

    /* 設備スライドショー */
    .facility-slider {
        position: relative; max-width: 800px; height: 500px;
        margin: 0 auto 20px; border-radius: 12px; overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1); background: #f0f0f0;
    }
    .facility-slide { display: none; height: 100%; width: 100%; }
    /* CSSのみで1枚目を表示 (JS読み込み前用) */
    .facility-slide:first-child { display: block; }
    .facility-slide.active { display: block; animation: fade 0.5s; }
    @keyframes fade {from {opacity: .4} to {opacity: 1}}
    .facility-slide img { width: 100%; height: 100%; object-fit: cover; }
    
    .slider-dots {
        display: flex; justify-content: center; gap: 12px;
        margin-top: 20px; padding-bottom: 20px;
    }
    .dot {
        cursor: pointer; height: 14px; width: 14px;
        background-color: #ccc; border-radius: 50%;
        transition: background-color 0.3s ease;
    }
    .dot.active, .dot:hover { background-color: #2C5F2D; }

    /* 料金表 */
    .camp-price-table {
        width: 100%; border-collapse: collapse; margin-bottom: 40px; border: 1px solid #ddd;
    }
    .camp-price-table th, .camp-price-table td {
        padding: 15px 20px; border-bottom: 1px solid #eee; text-align: left; font-size: 1rem;
    }
    .camp-price-table th {
        background-color: #2C5F2D !important; 
        color: #fff !important; font-weight: bold; width: 30%;
        border-right: 1px solid #eee;
    }
    .camp-price-table td { background-color: #fff !important; color: #333 !important; }
    .camp-price-table tr:last-child th, .camp-price-table tr:last-child td { border-bottom: none; }
    
    .season-title {
        margin-top: 30px; font-size: 1.2rem; font-weight: bold; color: #333;
        border-left: 5px solid #E76F51; padding-left: 10px; margin-bottom: 15px;
    }

    /* レンタル・販売 */
    .rental-list dl { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #eee; }
    .rental-list dt { padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; }
    .rental-list dd { padding: 10px; border-bottom: 1px solid #eee; margin: 0; text-align: right; }

    /* 規約アコーディオン */
    .terms-accordion {
        border: 1px solid #ddd; border-radius: 8px; margin-bottom: 40px;
        background: #fff; overflow: hidden;
    }
    .accordion-header {
        background: #f5f5f5; padding: 15px 20px; cursor: pointer; font-weight: bold;
        display: flex; justify-content: space-between; align-items: center; transition: background 0.3s;
    }
    .accordion-header:hover { background: #eee; }
    .accordion-header::after { content: '+'; font-size: 1.5rem; color: #2C5F2D; font-weight: normal; }
    .accordion-header.active::after { content: '-'; }
    .accordion-content {
        display: none; padding: 20px; border-top: 1px solid #ddd;
        font-size: 0.9rem; line-height: 1.8; color: #444;
    }
    .accordion-content.open { display: block; }
    .term-list { padding-left: 20px; margin: 10px 0; }
    .term-list li { margin-bottom: 5px; }
    .risk-box {
        background: #fff5f5; padding: 15px; border: 1px solid #ffcccc;
        border-radius: 4px; margin-top: 20px;
    }

    /* 予約CTA */
    .camp-cta {
        text-align: center; padding: 80px 20px; background-color: #f4f4f4; margin-top: 40px;
    }
    .btn-camp {
        display: inline-block; background-color: #E76F51; color: #fff;
        padding: 15px 50px; font-size: 1.2rem; font-weight: bold;
        border-radius: 4px; text-decoration: none; transition: all 0.3s;
        box-shadow: 0 5px 15px rgba(231, 111, 81, 0.3);
    }
    .btn-camp:hover { background-color: #d65a3b; color: #fff; transform: translateY(-3px); }

    /* 追従予約ボタン */
    .floating-reserve {
        position: fixed !important;
        bottom: 80px !important; right: 30px !important;
        z-index: 9990 !important;
        opacity: 0; visibility: hidden; transform: translateY(20px);
        transition: all 0.3s ease;
    }
    .floating-reserve.visible { opacity: 1; visibility: visible; transform: translateY(0); }
    .btn-float {
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        width: 75px; height: 75px; background-color: #E76F51; color: #fff;
        border-radius: 50%; text-decoration: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        font-weight: bold; font-size: 0.75rem; line-height: 1.3;
        transition: transform 0.3s, background 0.3s;
        text-align: center; padding-top: 2px;
    }
    .btn-float:hover { background-color: #d65a3b; transform: scale(1.05); color: #fff; }
    .btn-float span { font-size: 1.4rem; margin-bottom: 2px; display: block; line-height: 1; }

    /* FAQボタン */
    .btn-faq-link {
        display: inline-block; background-color: #fff; color: #2C5F2D;
        border: 2px solid #2C5F2D; padding: 10px 25px; border-radius: 30px;
        text-decoration: none; font-weight: bold; transition: all 0.3s;
    }
    .btn-faq-link:hover { background-color: #f0f8f0; }

    @media (max-width: 768px) {
        .camp-hero h1 { font-size: 2.2rem; }
        .camp-hero-logo { max-width: 90%; max-height: 100px; } /* スマホ用ロゴ調整 */
        .site-grid { grid-template-columns: 1fr; }
        .camp-price-table th, .camp-price-table td { display: block; width: 100%; border-right: none; }
        .camp-price-table th { margin-top: 0; background-color: #f0f0f0; border-left: 5px solid #2C5F2D; }
        .gallery-item { width: 260px; height: 350px; }
        .facility-slider { height: 300px; }
        .floating-reserve { bottom: 120px !important; right: 15px !important; }
        .btn-float { width: 65px; height: 65px; font-size: 0.65rem; }
        .btn-float span { font-size: 1.2rem; }
    }
</style>

<div class="camp-wrapper">
    <?php
    // ★コンテンツ出力: 管理画面に入力されたHTMLを表示
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>