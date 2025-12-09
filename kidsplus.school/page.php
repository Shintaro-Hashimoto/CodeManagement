<?php
/**
 * The template for displaying all pages.
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;
get_header();
?>
<main class="pages">
  <article>
    <section class="subheader">
      <?php
        $page = get_post( get_the_ID() );
        $page_slug = $page->post_name;
      ?>
      <div class="page-header <?php echo $page_slug ?>-img">
        <div class="container">
          <div class="row">
            <div class="col-md-8">
              <h1 class="page-title"><?php the_title(); ?></h1>
            </div>
          </div>
        </div>
      </div>
      <figure class="ill"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/mv_ill.png" alt=""></figure>
    </section>

    <section class="container">
      <div class="row">
        <div class="col-12">
          <div class="page-contents">
<?php while ( have_posts() ) : the_post(); ?>
<?php get_template_part( 'loop-templates/content', 'page' ); ?>
<?php endwhile; // end of the loop. ?>
          </div>
        </div>
      </div>
    </section>

  </article>
</main>
<?php get_footer(); ?>