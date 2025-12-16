<?php
/*
 * Template Name: キャンセル手続きページ (編集可能)
 * Description: 予約キャンセルフォーム用のテンプレート
 */

get_header(); 
?>

<style>
    /* --- キャンセルページ専用スタイル --- */
    .cancel-wrapper {
        background-color: #f6f7fb; /* 全体背景 */
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
        padding-bottom: 80px;
    }

    /* ヒーローエリア */
    .cancel-hero {
        height: 30vh;
        min-height: 250px;
        background-image: url('<?php echo get_stylesheet_directory_uri(); ?>/images/contact_hero.jpg'); /* お問い合わせと同じ画像でOK */
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        background-color: #2C5F2D;
        position: relative;
        margin-bottom: 60px;
    }
    .cancel-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.3);
    }
    .cancel-hero h1 { 
        font-size: 2rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
    }

    /* フォームコンテナ (共通スタイルを継承しつつ調整) */
    .cancel-container {
        max-width: 800px; /* 入力項目が少ないので少し幅を狭く */
        margin: 0 auto;
        padding: 40px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.05);
    }

    .cancel-notice {
        background: #fff3f3;
        border-left: 4px solid #ff5252;
        padding: 15px;
        font-size: 0.9rem;
        line-height: 1.6;
        margin-bottom: 30px;
    }

    @media (max-width: 768px) {
        .cancel-container { padding: 30px 20px; }
    }
</style>

<div class="cancel-wrapper">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>