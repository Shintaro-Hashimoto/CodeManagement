<?php
/*
 * Template Name: 宿泊ページ (編集可能)
 * Description: CSSはここで管理し、本文は管理画面のエディタで編集するテンプレート
 */

get_header(); 
?>

<style>
    /* --- 宿泊ページ専用スタイル --- */
    .stay-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* 共通セクション */
    .stay-section {
        padding: 60px 20px;
        max-width: 1000px;
        margin: 0 auto;
    }
    .stay-section h2 {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 40px;
        color: #2C5F2D;
        position: relative;
        font-weight: bold;
    }
    .stay-section h2::after {
        content: "";
        display: block;
        width: 60px;
        height: 3px;
        background: #E76F51;
        margin: 15px auto 0;
    }

    /* ヒーローエリア */
    .stay-hero {
        height: 60vh;
        min-height: 400px;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        background-color: #333;
        position: relative;
    }
    .stay-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.2); 
    }
    .stay-hero h1 { 
        font-size: 3rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
    }

    /* 2カラムレイアウト */
    .two-col {
        display: flex;
        flex-wrap: wrap;
        gap: 40px;
        align-items: center;
        margin-bottom: 60px;
    }
    .two-col.reverse { flex-direction: row-reverse; }
    .two-col img {
        flex: 1;
        min-width: 300px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        height: 300px; /* PCでは高さ固定 */
        object-fit: cover;
    }
    .two-col-text {
        flex: 1;
        min-width: 300px;
    }
    .two-col-text h3 {
        font-size: 1.5rem;
        color: #2C5F2D;
        margin-bottom: 15px;
        border-left: 4px solid #E76F51;
        padding-left: 15px;
    }
    .two-col-text p {
        line-height: 1.8;
        margin-bottom: 15px;
    }

    /* 料理セクション */
    .food-highlight {
        background-color: #f9fcf9;
    }
    .food-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 40px;
    }
    .food-item img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 10px;
    }
    .food-item p { font-size: 0.9rem; font-weight: bold; color: #555; }

    /* 料金表エリア */
    .price-block {
        margin-bottom: 50px;
    }
    .price-title {
        font-size: 1.2rem;
        font-weight: bold;
        color: #2C5F2D;
        margin-bottom: 10px;
        border-left: 5px solid #E76F51;
        padding-left: 10px;
        background: #f9f9f9;
        padding: 10px;
    }
    
    .price-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #ddd;
        background-color: #fff;
        font-size: 0.95rem;
        min-width: 500px;
    }
    .table-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-bottom: 20px;
    }
    
    .price-table th, .price-table td {
        padding: 12px;
        border: 1px solid #eee;
        text-align: center;
        vertical-align: middle;
    }
    .price-table thead th {
        background-color: #2C5F2D !important;
        color: #fff !important;
        font-weight: bold;
        white-space: nowrap;
        line-height: 1.4;
    }
    .price-table thead th small {
        font-size: 0.8rem;
        font-weight: normal;
        display: block;
        opacity: 0.9;
    }
    .price-table tbody th {
        background-color: #f4f4f4;
        text-align: left;
        font-weight: bold;
        color: #333;
        width: 25%;
        min-width: 150px;
    }
    .price-table td {
        color: #333;
    }

    /* 予約CTA */
    .reserve-cta {
        text-align: center;
        padding: 60px 20px;
        background-color: #f4f4f4;
    }
    .btn-big {
        display: inline-block;
        background-color: #E76F51;
        color: #fff;
        padding: 15px 50px;
        font-size: 1.2rem;
        font-weight: bold;
        border-radius: 4px;
        text-decoration: none;
        transition: transform 0.3s, background 0.3s;
        box-shadow: 0 5px 15px rgba(231, 111, 81, 0.4);
    }
    .btn-big:hover {
        background-color: #d65a3b;
        transform: translateY(-3px);
        color: #fff;
    }

    /* --- スマホ対応 --- */
    @media (max-width: 768px) {
        .stay-hero { 
            height: 40vh;
            min-height: 250px;
        }
        .stay-hero h1 { font-size: 1.8rem; }

        /* ★修正: スマホでは画像の高さを自動(auto)にして縦横比を保つ */
        .two-col img {
            height: auto !important; /* 強制的に自動調整 */
            max-height: 300px; /* 高くなりすぎないように制限 */
        }

        .stay-section h2 { font-size: 1.5rem; }
        .two-col { flex-direction: column; }
        .two-col.reverse { flex-direction: column; }
    }

        /* ★追加: アニメーション用CSS */
    .fade-in {
        animation: fadeIn 1.5s ease-out forwards;
        opacity: 0;
        transform: translateY(20px);
    }

    @keyframes fadeIn {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
</style>

<div class="stay-wrapper">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>