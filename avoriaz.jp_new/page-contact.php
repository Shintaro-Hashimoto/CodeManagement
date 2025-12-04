<?php
/*
 * Template Name: お問い合わせページ (編集可能)
 * Description: 汎用お問い合わせフォーム用のテンプレート
 */

get_header(); 
?>

<style>
    /* --- お問い合わせページ専用スタイル --- */
    .contact-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* ヒーローエリア */
    .contact-hero {
        height: 40vh;
        min-height: 300px;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        background-color: #2C5F2D;
        position: relative;
    }
    .contact-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.3);
    }
    .contact-hero h1 { 
        font-size: 2.5rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
    }

    /* コンテンツエリア */
    .contact-section {
        padding: 80px 20px;
        max-width: 800px; /* フォームなので少し狭めに */
        margin: 0 auto;
    }

    /* インフォメーションボックス */
    .contact-info-box {
        background: #f9f9f9;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 50px;
        border: 1px solid #eee;
    }
    .contact-tel {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2C5F2D;
        margin: 10px 0;
        display: block;
    }
    .contact-note {
        font-size: 0.9rem;
        color: #666;
    }

    @media (max-width: 768px) {
        .contact-hero h1 { font-size: 1.8rem; }
        .contact-section { padding: 40px 20px; }
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

<div class="contact-wrapper">
    <?php
    // 投稿本文（管理画面のエディタ内容）を表示
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>