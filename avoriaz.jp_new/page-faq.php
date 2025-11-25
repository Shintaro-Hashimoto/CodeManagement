<?php
/*
 * Template Name: FAQページ (編集可能)
 * Description: よくあるご質問用のテンプレート
 */

get_header(); 
?>

<style>
    /* --- FAQページ専用スタイル --- */
    .faq-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    .faq-section {
        padding: 80px 20px;
        max-width: 900px;
        margin: 0 auto;
    }
    .faq-title {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 60px;
        color: #2C5F2D;
        font-weight: bold;
    }

    /* FAQリスト */
    .faq-list {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }
    .faq-item {
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 30px;
        background: #fafafa;
    }
    .faq-q {
        font-weight: bold;
        font-size: 1.1rem;
        color: #2C5F2D;
        margin-bottom: 15px;
        display: flex;
        align-items: baseline;
        gap: 10px;
    }
    .faq-q::before {
        content: "Q.";
        font-size: 1.3rem;
        color: #E76F51;
        font-weight: 900;
    }
    .faq-a {
        font-size: 0.95rem;
        line-height: 1.8;
        padding-left: 35px; /* Qのアイコン分あける */
    }

    /* カテゴリ見出し */
    .faq-category {
        font-size: 1.4rem;
        font-weight: bold;
        margin: 60px 0 30px;
        border-left: 5px solid #E76F51;
        padding-left: 15px;
        color: #333;
    }
    .faq-category:first-of-type { margin-top: 0; }

    @media (max-width: 768px) {
        .faq-q { font-size: 1rem; }
        .faq-a { padding-left: 0; margin-top: 10px; }
    }
</style>

<div class="faq-wrapper">
    <div class="faq-section">
        <h1 class="faq-title">よくあるご質問</h1>
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