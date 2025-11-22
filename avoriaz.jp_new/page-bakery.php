<?php
/*
 * Template Name: パン工房ページ (編集可能)
 * Description: パン工房MARIKO専用のデザインテンプレート。本文は管理画面で編集。
 */

get_header(); 
?>

<style>
    /* --- パン工房ページ専用スタイル --- */
    .bakery-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #4e342e; /* 濃い茶色の文字 */
    }

    /* 共通セクション */
    .bakery-section {
        padding: 80px 20px;
        max-width: 1000px;
        margin: 0 auto;
    }
    .bakery-section h2 {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 40px;
        color: #5D4037; /* チョコレートブラウン */
        position: relative;
        font-family: serif; /* 明朝体で少し上品に */
    }
    .bakery-section h2::after {
        content: "";
        display: block;
        width: 40px;
        height: 2px;
        background: #8D6E63;
        margin: 15px auto 0;
    }

    /* ヒーローエリア */
    .bakery-hero {
        height: 50vh;
        min-height: 400px;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        background-color: #5D4037;
        position: relative;
    }
    .bakery-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.2);
    }
    .bakery-hero h1 { 
        font-size: 3rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
        font-family: serif;
    }

    /* ストーリーセクション (テキストメイン) */
    .story-box {
        background-color: #fafafa;
        padding: 40px;
        border-radius: 8px;
        line-height: 2;
        margin-bottom: 60px;
        border: 1px solid #eee;
    }

    /* 2カラムレイアウト */
    .two-col {
        display: flex;
        flex-wrap: wrap;
        gap: 50px;
        align-items: center;
        margin-bottom: 60px;
    }
    .two-col.reverse { flex-direction: row-reverse; }
    .two-col img {
        flex: 1;
        min-width: 300px;
        border-radius: 50% 50% 0 0; /* パン屋っぽいアーチ型 */
        height: 350px;
        object-fit: cover; /* ★ここが重要：比率を維持してトリミング */
        width: 100%; /* 幅を指定 */
    }
    .two-col-text {
        flex: 1;
        min-width: 300px;
    }
    .two-col-text h3 {
        font-size: 1.4rem;
        color: #5D4037;
        margin-bottom: 20px;
    }
    .two-col-text p {
        line-height: 1.8;
        margin-bottom: 15px;
    }

    /* シュトーレン特設エリア */
    .stollen-highlight {
        background-color: #EFEBE9; /* 薄いブラウン */
        border-radius: 12px;
        padding: 60px 40px;
        text-align: center;
    }
    .stollen-label {
        display: inline-block;
        background: #c62828; /* クリスマスレッド */
        color: #fff;
        padding: 5px 15px;
        font-size: 0.9rem;
        font-weight: bold;
        border-radius: 20px;
        margin-bottom: 15px;
    }
    .stollen-price {
        font-size: 1.5rem;
        color: #c62828;
        font-weight: bold;
        margin: 20px 0;
    }
    
    /* 注文CTA */
    .bakery-cta {
        text-align: center;
        margin-top: 40px;
    }
    .btn-bakery {
        display: inline-block;
        background-color: #5D4037;
        color: #fff;
        padding: 15px 50px;
        font-size: 1.1rem;
        font-weight: bold;
        border-radius: 4px;
        text-decoration: none;
        transition: all 0.3s;
    }
    .btn-bakery:hover {
        background-color: #8D6E63;
        color: #fff;
        transform: translateY(-3px);
    }

    /* スマホ対応 (修正箇所) */
    @media (max-width: 768px) {
        .bakery-hero h1 { font-size: 2rem; }
        
        .two-col { 
            flex-direction: column; 
            gap: 30px;
        }
        .two-col.reverse { flex-direction: column; }
        
        /* ★修正: 画像が縦に伸びないよう調整 */
        .two-col img {
            flex: none;       /* Flex伸縮を解除 */
            width: 100%;      /* 横幅いっぱい */
            min-width: 0;     /* 最小幅制限解除 */
            height: 300px;    /* 高さを少し抑える */
            object-fit: cover;/* 確実に比率維持 */
        }

        .stollen-highlight { padding: 40px 20px; }
    }
</style>

<div class="bakery-wrapper">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>