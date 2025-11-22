<?php
/*
 * Template Name: キャンセルポリシーページ (編集可能)
 * Description: 規定を見やすく表示するテンプレート
 */

get_header(); 
?>

<style>
    .policy-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
        padding: 60px 20px;
    }
    .policy-container {
        max-width: 800px;
        margin: 0 auto;
    }
    .policy-title {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 50px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 20px;
    }
    
    /* ポリシーセクション */
    .policy-block {
        margin-bottom: 50px;
    }
    .policy-block h2 {
        font-size: 1.4rem;
        background: #f5f5f5;
        padding: 10px 15px;
        border-left: 5px solid #555;
        margin-bottom: 20px;
    }
    
    /* テーブル */
    .policy-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }
    .policy-table th, .policy-table td {
        border: 1px solid #ddd;
        padding: 12px;
    }
    .policy-table th {
        background: #fafafa;
        width: 40%;
        text-align: left;
        font-weight: bold;
    }
    
    /* 免除規定などのリスト */
    .policy-list {
        padding-left: 20px;
        line-height: 1.8;
    }
    .policy-list li {
        margin-bottom: 10px;
    }
</style>

<div class="policy-wrapper">
    <div class="policy-container">
        <h1 class="policy-title">キャンセルポリシー</h1>
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