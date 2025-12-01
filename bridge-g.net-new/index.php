<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme.
 * It is required in all themes.
 */

get_header(); ?>

<main class="w-full max-w-3xl mx-auto px-6 py-20">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) :
            the_post();
            the_content();
        endwhile;
    else :
        echo '<p>記事が見つかりませんでした。</p>';
    endif;
    ?>
</main>

<?php get_footer(); ?>