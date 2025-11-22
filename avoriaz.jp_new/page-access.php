<?php
/*
 * Template Name: アクセスページ (編集可能)
 * Description: GoogleMapや交通手段を表示するテンプレート
 */

get_header(); 
?>

<style>
    /* --- アクセスページ専用スタイル --- */
    .access-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    .access-section {
        padding: 60px 20px;
        max-width: 1000px;
        margin: 0 auto;
    }
    .access-section h2 {
        font-size: 1.8rem;
        text-align: center;
        margin-bottom: 40px;
        color: #2C5F2D;
        font-weight: bold;
        border-bottom: 2px solid #eee;
        padding-bottom: 15px;
    }

    /* Google Maps */
    .map-container {
        position: relative;
        padding-bottom: 56.25%; /* 16:9 */
        height: 0;
        overflow: hidden;
        margin-bottom: 40px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .map-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 0;
    }

    /* 住所・基本情報 */
    .access-info-box {
        background: #f9f9f9;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 60px;
    }
    .access-address {
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 10px;
    }

    /* 交通手段グリッド */
    .transport-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
    }
    .transport-card {
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 30px;
    }
    .transport-card h3 {
        font-size: 1.3rem;
        color: #2C5F2D;
        margin-bottom: 20px;
        border-left: 5px solid #E76F51;
        padding-left: 15px;
    }
    .route-step {
        margin-bottom: 15px;
        padding-left: 20px;
        border-left: 2px solid #ddd;
        position: relative;
    }
    .route-step::before {
        content: "●";
        position: absolute;
        left: -6px;
        top: 0;
        color: #E76F51;
        font-size: 0.8rem;
    }
    .time-label {
        display: inline-block;
        background: #eee;
        font-size: 0.8rem;
        padding: 2px 8px;
        border-radius: 4px;
        margin-left: 10px;
    }

    @media (max-width: 768px) {
        .transport-grid { grid-template-columns: 1fr; }
    }
</style>

<div class="access-wrapper">
    <div class="access-section">
        <h1 style="text-align:center; margin-bottom:40px; font-size:2.2rem;">アクセス</h1>
        <?php
        if ( have_posts() ) :
            while ( have_posts() ) : the_post();
                the_content();
            endwhile;
        endif;
        ?>
    </div>
</div>

<?php get_footer(); ?>