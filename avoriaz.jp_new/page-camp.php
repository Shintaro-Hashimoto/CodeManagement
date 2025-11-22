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
        color: #2C5F2D; /* フォレストグリーン */
        font-weight: bold;
        letter-spacing: 0.05em;
        position: relative;
    }
    .camp-section h2::after {
        content: "";
        display: block;
        width: 50px;
        height: 3px;
        background: #8D6E63; /* アースカラー */
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
    .camp-hero h1 { 
        font-size: 3.5rem; 
        font-weight: bold; 
        margin: 0 0 10px; 
    }

    /* イントロダクション */
    .camp-intro {
        text-align: center;
        font-size: 1.1rem;
        line-height: 2;
        max-width: 800px;
        margin: 0 auto 60px;
    }

    /* サイト紹介 (3カラムカード) */
    .site-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-bottom: 60px;
    }
    .site-card {
        border: 1px solid #eee;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        background: #fff;
    }
    .site-card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
    }
    .site-card-body {
        padding: 20px;
    }
    .site-card h3 {
        color: #2C5F2D;
        margin-bottom: 10px;
        font-size: 1.3rem;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 10px;
    }
    .site-card p {
        font-size: 0.95rem;
        line-height: 1.6;
        color: #555;
    }

    /* 設備アイコンリスト */
    .facilities-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 40px;
        margin-bottom: 60px;
        background: #f9fcf9;
        padding: 40px;
        border-radius: 12px;
    }
    .facility-item {
        text-align: center;
        width: 120px;
    }
    .facility-icon {
        font-size: 2.5rem;
        display: block;
        margin-bottom: 10px;
    }
    .facility-name {
        font-weight: bold;
        color: #2C5F2D;
    }

    /* 料金表スタイル (修正版：背景色を強制適用) */
    .camp-price-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 40px;
        border: 1px solid #ddd;
        background-color: #fff; /* テーブル全体の背景 */
    }
    .camp-price-table th, .camp-price-table td {
        padding: 15px 20px;
        border-bottom: 1px solid #eee;
        text-align: left;
        font-size: 1rem;
    }
    .camp-price-table th {
        /* ★修正: !importantをつけて緑背景を強制 */
        background-color: #2C5F2D !important; 
        color: #fff !important;
        font-weight: bold;
        width: 30%;
        border-right: 1px solid #eee;
    }
    .camp-price-table td {
        background-color: #fff !important;
        color: #333 !important;
    }
    .camp-price-table tr:last-child th,
    .camp-price-table tr:last-child td {
        border-bottom: none;
    }
    
    .season-title {
        margin-top: 30px;
        font-size: 1.2rem;
        font-weight: bold;
        color: #333;
        border-left: 5px solid #E76F51;
        padding-left: 10px;
        margin-bottom: 15px;
    }

    /* レンタル・販売リスト */
    .rental-list dl {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-top: 1px solid #eee;
    }
    .rental-list dt {
        padding: 10px;
        border-bottom: 1px solid #eee;
        font-weight: bold;
    }
    .rental-list dd {
        padding: 10px;
        border-bottom: 1px solid #eee;
        margin: 0;
        text-align: right;
    }

    /* 予約CTA */
    .camp-cta {
        text-align: center;
        padding: 80px 20px;
        background-color: #f4f4f4;
        margin-top: 40px;
    }
    .btn-camp {
        display: inline-block;
        background-color: #E76F51;
        color: #fff;
        padding: 15px 50px;
        font-size: 1.2rem;
        font-weight: bold;
        border-radius: 4px;
        text-decoration: none;
        transition: all 0.3s;
        box-shadow: 0 5px 15px rgba(231, 111, 81, 0.3);
    }
    .btn-camp:hover {
        background-color: #d65a3b;
        color: #fff;
        transform: translateY(-3px);
    }

    @media (max-width: 768px) {
        .camp-hero h1 { font-size: 2.2rem; }
        .site-grid { grid-template-columns: 1fr; }
        
        /* スマホ時のテーブル調整 */
        .camp-price-table th, .camp-price-table td { 
            display: block; 
            width: 100%; 
            border-right: none;
        }
    }
</style>

<div class="camp-wrapper">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>