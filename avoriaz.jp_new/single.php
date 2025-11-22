<?php
/**
 * The template for displaying all single posts
 */

get_header(); 
?>

<style>
    /* --- 個別記事ページ専用スタイル --- */
    .single-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* 共通ヒーロー (NEWS & TOPICS) */
    .news-hero {
        height: 30vh; /* 一覧より少し低めに */
        min-height: 250px;
        background-image: url('<?php echo get_stylesheet_directory_uri(); ?>/images/news_hero.jpg'); 
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
    .news-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.3);
    }
    .news-hero h1 { 
        font-size: 2rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
        letter-spacing: 0.05em;
    }

    /* 記事本文エリア */
    .single-container {
        padding: 60px 20px;
        max-width: 800px; /* 読みやすい幅に制限 */
        margin: 0 auto;
    }

    /* 記事ヘッダー */
    .post-header {
        margin-bottom: 40px;
        border-bottom: 1px solid #eee;
        padding-bottom: 20px;
    }
    .post-meta {
        font-size: 0.9rem;
        color: #888;
        margin-bottom: 10px;
    }
    .post-date { margin-right: 15px; }
    .post-category {
        background: #2C5F2D;
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        text-decoration: none;
    }
    .post-title {
        font-size: 2rem;
        font-weight: bold;
        line-height: 1.4;
        margin: 0;
        color: #333;
    }

    /* アイキャッチ画像 */
    .post-thumbnail {
        margin-bottom: 40px;
        border-radius: 8px;
        overflow: hidden;
    }
    .post-thumbnail img {
        width: 100%;
        height: auto;
        display: block;
    }

    /* 本文スタイル */
    .post-content {
        line-height: 1.8;
        font-size: 1rem;
        margin-bottom: 60px;
    }
    .post-content p { margin-bottom: 1.5em; }
    .post-content h2 {
        font-size: 1.5rem;
        border-left: 5px solid #2C5F2D;
        padding-left: 15px;
        margin: 40px 0 20px;
        font-weight: bold;
    }
    .post-content h3 {
        font-size: 1.2rem;
        margin: 30px 0 15px;
        font-weight: bold;
        color: #2C5F2D;
    }
    .post-content img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 20px 0;
    }
    .post-content ul, .post-content ol {
        padding-left: 20px;
        margin-bottom: 20px;
    }
    .post-content li { margin-bottom: 10px; }

    /* 前後の記事ナビゲーション */
    .post-navigation {
        display: flex;
        justify-content: space-between;
        margin-top: 60px;
        padding-top: 40px;
        border-top: 1px solid #eee;
    }
    .nav-link {
        max-width: 45%;
    }
    .nav-link a {
        color: #333;
        text-decoration: none;
        display: block;
        font-size: 0.9rem;
        transition: color 0.3s;
    }
    .nav-link a:hover {
        color: #E76F51;
    }
    .nav-label {
        display: block;
        font-size: 0.8rem;
        color: #888;
        margin-bottom: 5px;
    }

    /* 戻るボタン */
    .back-btn-wrap {
        text-align: center;
        margin-top: 40px;
    }
    .back-btn {
        display: inline-block;
        border: 1px solid #ccc;
        padding: 10px 30px;
        border-radius: 30px;
        text-decoration: none;
        color: #333;
        transition: all 0.3s;
    }
    .back-btn:hover {
        background-color: #eee;
    }

    @media (max-width: 768px) {
        .post-title { font-size: 1.5rem; }
        .single-container { padding: 40px 20px; }
    }
</style>

<div class="single-wrapper">
    <div class="news-hero">
        <h1>NEWS & TOPICS</h1>
    </div>

    <div class="single-container">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>

            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                
                <header class="post-header">
                    <div class="post-meta">
                        <span class="post-date"><?php echo get_the_date('Y.m.d'); ?></span>
                        <?php 
                            $categories = get_the_category();
                            if ( ! empty( $categories ) ) {
                                echo '<span class="post-category">' . esc_html( $categories[0]->name ) . '</span>';
                            }
                        ?>
                    </div>
                    <h1 class="post-title"><?php the_title(); ?></h1>
                </header>

                <?php if ( has_post_thumbnail() ) : ?>
                    <div class="post-thumbnail">
                        <?php the_post_thumbnail('large'); ?>
                    </div>
                <?php endif; ?>

                <div class="post-content">
                    <?php the_content(); ?>
                </div>

            </article>

            <div class="post-navigation">
                <div class="nav-link prev">
                    <?php previous_post_link( '<span class="nav-label">« 前の記事</span>%link', '%title' ); ?>
                </div>
                <div class="nav-link next" style="text-align: right;">
                    <?php next_post_link( '<span class="nav-label">次の記事 »</span>%link', '%title' ); ?>
                </div>
            </div>

            <div class="back-btn-wrap">
                <a href="<?php echo home_url('/news'); ?>" class="back-btn">一覧へ戻る</a>
            </div>

        <?php endwhile; endif; ?>
    </div>
</div>

<?php get_footer(); ?>