<?php
/**
 * The main template file.
 * これは、特定のテンプレートが割り当てられていないページのための汎用テンプレートです。
 */

get_header(); 
?>

<style>
    .generic-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
        padding: 80px 20px;
    }
    .generic-container {
        max-width: 900px;
        margin: 0 auto;
        line-height: 1.8;
    }
    .generic-container h1 {
        font-size: 2rem;
        margin-bottom: 40px;
        border-bottom: 1px solid #eee;
        padding-bottom: 20px;
    }
</style>

<div class="generic-wrapper">
    <div class="generic-container">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
            
            <h1><?php the_title(); ?></h1>
            
            <div class="entry-content">
                <?php the_content(); ?>
            </div>

        <?php endwhile; endif; ?>
    </div>
</div>

<?php get_footer(); ?>