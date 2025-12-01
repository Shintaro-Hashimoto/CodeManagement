<?php get_header(); ?>

<div class="site-main front-page-main">
    <div class="inner">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
            
            <div class="page-content">
                <?php the_content(); ?>
            </div>

        <?php endwhile; endif; ?>
    </div>
</div>

<?php get_footer(); ?>