<?php
/*
 * Template Name: コンセプトページ (編集可能)
 * Description: アボリアの魅力・歴史を伝えるページ
 */

get_header(); 
?>

<style>
    .concept-wrapper {
        background-color: #fff;
        font-family: "Yu Mincho", "YuMincho", "HiraMinProN-W3", "Hiragino Mincho ProN", "HGMinchoE", "MS PMincho", "MS P明朝", serif; /* 明朝体で物語風に */
        color: #333;
        line-height: 2.2;
    }

    .concept-section {
        padding: 80px 20px;
        max-width: 900px;
        margin: 0 auto;
    }
    
    /* 縦書き見出し（和の雰囲気も少し入れる場合） */
    .vertical-title-wrap {
        display: flex;
        justify-content: center;
        margin-bottom: 60px;
    }
    .concept-title {
        font-size: 2rem;
        font-weight: normal;
        border-bottom: 1px solid #2C5F2D;
        padding-bottom: 20px;
        display: inline-block;
        color: #2C5F2D;
    }

    /* ヒーロー */
    .concept-hero {
        height: 50vh;
        min-height: 400px;
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
    .concept-hero h1 {
        font-size: 2.5rem;
        font-family: sans-serif;
        font-weight: bold;
        letter-spacing: 0.1em;
    }

    /* コンテンツブロック */
    .concept-block {
        margin-bottom: 80px;
        text-align: center;
    }
    .concept-block img {
        width: 100%;
        max-width: 600px;
        height: auto;
        border-radius: 4px;
        margin: 30px auto;
        box-shadow: 0 10px 20px rgba(0,0,0,0.05);
    }
    .concept-lead {
        font-size: 1.2rem;
        margin-bottom: 30px;
        font-weight: bold;
        color: #2C5F2D;
    }

    /* 四季のギャラリー */
    .season-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 40px;
    }
    .season-item {
        position: relative;
        overflow: hidden;
        border-radius: 4px;
    }
    .season-item img {
        width: 100%;
        height: 250px;
        object-fit: cover;
        transition: transform 0.5s;
        margin: 0; /* リセット */
    }
    .season-item:hover img {
        transform: scale(1.1);
    }
    .season-name {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        background: rgba(0,0,0,0.5);
        color: #fff;
        text-align: center;
        padding: 10px 0;
        font-family: sans-serif;
    }

    @media (max-width: 768px) {
        .concept-hero h1 { font-size: 1.8rem; }
    }
</style>

<div class="concept-wrapper">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>
</div>

<?php get_footer(); ?>