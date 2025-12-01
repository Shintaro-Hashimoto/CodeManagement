<?php get_header(); ?>

<div class="site-main">
    <div class="inner">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
            
            <h2 class="page-title"><?php the_title(); ?></h2>
            
            <div class="page-content">
                <?php the_content(); ?>
            </div>

        <?php endwhile; endif; ?>
    </div>
</div>

<?php get_footer(); ?>