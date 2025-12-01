<?php
/**
 * Template Name: お知らせ一覧ページ (編集可能)
 * Description: 投稿記事をカードデザインで一覧表示するテンプレート
 */

get_header(); 
?>

<style>
    /* --- お知らせページ専用スタイル --- */
    .news-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* ヒーローエリア */
    .news-hero {
        height: 40vh;
        min-height: 300px;
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
        font-size: 2.5rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
    }

    /* 記事一覧エリア */
    .news-container {
        padding: 80px 20px;
        max-width: 900px;
        margin: 0 auto;
    }

    /* 記事カード */
    .news-card {
        display: flex;
        gap: 30px;
        margin-bottom: 40px;
        border-bottom: 1px solid #eee;
        padding-bottom: 40px;
    }
    .news-card:last-child {
        border-bottom: none;
    }
    .news-thumb {
        width: 250px;
        height: 180px;
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
        background: #f0f0f0;
    }
    .news-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s;
    }
    .news-thumb:hover img {
        transform: scale(1.05);
    }
    
    .news-content {
        flex-grow: 1;
    }
    .news-meta {
        font-size: 0.9rem;
        color: #888;
        margin-bottom: 10px;
    }
    .news-date {
        margin-right: 15px;
    }
    .news-category {
        background: #2C5F2D;
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
    }
    .news-title {
        font-size: 1.4rem;
        font-weight: bold;
        margin-bottom: 15px;
        line-height: 1.4;
    }
    .news-title a {
        color: #333;
        text-decoration: none;
        transition: color 0.3s;
    }
    .news-title a:hover {
        color: #E76F51;
    }
    .news-excerpt {
        font-size: 0.95rem;
        color: #666;
        line-height: 1.6;
        margin-bottom: 15px;
    }
    .read-more {
        color: #E76F51;
        font-weight: bold;
        text-decoration: none;
        font-size: 0.9rem;
    }

    /* ページネーション */
    .pagination {
        text-align: center;
        margin-top: 40px;
        display: flex;
        justify-content: center;
        gap: 10px;
    }
    .page-numbers {
        display: inline-block;
        padding: 8px 15px;
        border: 1px solid #ddd;
        color: #333;
        text-decoration: none;
        border-radius: 4px;
    }
    .page-numbers.current {
        background: #2C5F2D;
        color: #fff;
        border-color: #2C5F2D;
    }

    @media (max-width: 768px) {
        .news-card { flex-direction: column; gap: 15px; }
        .news-thumb { width: 100%; height: 200px; }
        .news-title { font-size: 1.2rem; }
    }
</style>

<div class="news-wrapper">
    <div class="news-hero">
        <h1 class="fade-in-up">NEWS & EVENT</h1>
    </div>

    <div class="news-container">
        <?php 
        // ページネーション対応のクエリ
        $paged = ( get_query_var( 'paged' ) ) ? get_query_var( 'paged' ) : 1;
        $args = array(
            'post_type'      => 'post',
            'posts_per_page' => 10,
            'paged'          => $paged,
            'orderby'        => 'date',
            'order'          => 'DESC',
        );
        
        $the_query = new WP_Query( $args );
        
        if ( $the_query->have_posts() ) : 
            while ( $the_query->have_posts() ) : $the_query->the_post(); ?>
                
                <article class="news-card">
                    <div class="news-thumb">
                        <a href="<?php the_permalink(); ?>">
                            <?php if ( has_post_thumbnail() ) : ?>
                                <?php the_post_thumbnail('medium'); ?>
                            <?php else : ?>
                                <img src="<?php echo get_stylesheet_directory_uri(); ?>/images/no_image.jpg" alt="No Image">
                            <?php endif; ?>
                        </a>
                    </div>
                    <div class="news-content">
                        <div class="news-meta">
                            <span class="news-date"><?php echo get_the_date('Y.m.d'); ?></span>
                            <?php 
                                $categories = get_the_category();
                                if ( ! empty( $categories ) ) {
                                    echo '<span class="news-category">' . esc_html( $categories[0]->name ) . '</span>';
                                }
                            ?>
                        </div>
                        <h2 class="news-title">
                            <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                        </h2>
                        <div class="news-excerpt">
                            <?php the_excerpt(); ?>
                        </div>
                        <a href="<?php the_permalink(); ?>" class="read-more">続きを読む →</a>
                    </div>
                </article>

            <?php endwhile; ?>

            <div class="pagination">
                <?php
                echo paginate_links( array(
                    'total' => $the_query->max_num_pages,
                    'current' => $paged,
                    'prev_text' => '«',
                    'next_text' => '»',
                ) );
                ?>
            </div>
            
            <?php wp_reset_postdata(); ?>

        <?php else : ?>
            <p style="text-align:center;">現在、お知らせはありません。</p>
        <?php endif; ?>
    </div>
</div>

<?php get_footer(); ?>