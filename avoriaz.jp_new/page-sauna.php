<?php
/*
 * Template Name: サウナページ (編集可能)
 * Description: サウナ専用のデザインテンプレート。本文は管理画面で編集。
 */

get_header(); 
?>

<style>
    /* --- サウナページ専用スタイル --- */
    .sauna-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* 共通セクション */
    .sauna-section {
        padding: 80px 20px;
        max-width: 1100px; /* 全体の最大幅 */
        margin: 0 auto;
    }
    .sauna-section h2 {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 40px;
        color: #333;
        font-weight: bold;
        letter-spacing: 0.1em;
    }
    .sauna-section h2 span {
        display: block;
        font-size: 1rem;
        color: #8D6E63; /* サブカラー(茶) */
        margin-top: 10px;
        font-weight: normal;
    }

    /* ヒーローエリア */
    .sauna-hero {
        height: 60vh;
        min-height: 400px;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.7);
        background-color: #1a1a1a;
        position: relative;
    }
    .sauna-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.3);
    }
    .sauna-hero-content {
        position: relative;
        z-index: 2;
        text-align: center;
    }
    .sauna-hero h1 { 
        font-size: 3.5rem; 
        font-weight: bold; 
        margin: 0 0 10px; 
        letter-spacing: 0.1em;
    }
    .sauna-hero p {
        font-size: 1.2rem;
        opacity: 0.9;
    }

    /* Coming Soon バッジ */
    .coming-soon-badge {
        display: inline-block;
        background: #E76F51;
        color: #fff;
        padding: 5px 15px;
        border-radius: 50px;
        font-size: 0.9rem;
        font-weight: bold;
        margin-bottom: 20px;
        letter-spacing: 0.05em;
    }

    /* コンセプト */
    .concept-text {
        text-align: center;
        line-height: 2;
        font-size: 1.1rem;
        margin-bottom: 60px;
    }

    /* 施設概要エリア */
    .sauna-grid {
        display: block; 
        max-width: 800px; 
        margin: 0 auto 60px;
    }
    .sauna-grid img {
        width: 100%;
        height: 500px; 
        object-fit: cover;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        margin-bottom: 40px; 
    }
    .sauna-info h3 {
        text-align: center; 
        font-size: 1.8rem;
        margin-bottom: 30px;
        color: #333;
        font-weight: bold;
    }
    
    /* スペック表 */
    .sauna-specs dl {
        display: flex;
        flex-wrap: wrap;
        border-top: 1px solid #eee;
    }
    .sauna-specs dt {
        width: 30%;
        padding: 15px 0;
        font-weight: bold;
        border-bottom: 1px solid #eee;
        color: #2C5F2D;
    }
    .sauna-specs dd {
        width: 70%;
        padding: 15px 0;
        border-bottom: 1px solid #eee;
        margin: 0;
    }

    /* こだわりポイント */
    .points-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 30px;
        text-align: center;
        margin-top: 40px;
    }
    .point-item h3 {
        font-size: 1.2rem;
        margin-bottom: 10px;
        color: #2C5F2D;
    }
    .point-item p {
        font-size: 0.9rem;
        color: #666;
    }
    .point-icon {
        font-size: 2.5rem;
        margin-bottom: 15px;
        display: block;
    }

    /* 予約CTA */
    .sauna-cta {
        background-color: #f8f8f8;
        text-align: center;
        padding: 80px 20px;
        margin-top: 60px;
    }
    .btn-sauna {
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
    .btn-sauna:hover {
        background-color: #d65a3b;
        color: #fff;
        transform: translateY(-3px);
    }
    
    /* ★アニメーション用CSS */
    .fade-in-up {
        opacity: 0;
        transform: translateY(20px);
        animation: fadeInUp 1.5s ease-out forwards;
    }
    .delay-04 { animation-delay: 0.4s; }
    @keyframes fadeInUp {
        to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
        .sauna-hero h1 { font-size: 2.2rem; }
        .points-grid { grid-template-columns: 1fr; gap: 40px;}
        .sauna-grid img { height: 300px; } 
    }    
</style>

<div class="sauna-wrapper">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>