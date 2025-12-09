<?php
/**
 * The template for displaying all single posts.
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
              <div class="page-title">サポートブログ</div>
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
  <?php get_template_part( 'loop-templates/content', 'single' ); ?>
<?php endwhile; // end of the loop. ?>

            <div class="d-flex postnav justify-content-between">
            <?php
              $allowed_html = array('br' => array(),);
              $prev_post = get_previous_post();
              if (!empty( $prev_post )): ?>
                <a class="postnav-older" title="PREV" href="<?php echo get_permalink( $prev_post->ID ); ?>"><i class="ri-arrow-left-s-fill"></i> PREV</a>
              <?php elseif (empty( $prev_post )): ?>
              <div class="emptybox"></div>
            <?php endif; ?>
               <a class="postnav-up" href="<?php echo esc_url( home_url( '/blog/' ) ); ?>">一覧に戻る</a>
            <?php
              $next_post = get_next_post();
              if (!empty( $next_post )): ?>
                <a class="postnav-newer" title="NEXT" href="<?php echo get_permalink( $next_post->ID ); ?>">NEXT <i class="ri-arrow-right-s-fill"></i></a>
              <?php elseif (empty( $next_post )): ?>
              <div class="emptybox"></div>
            <?php endif; ?>
            </div>

          </div>
        </div>
      </div>
    </section>

  </article>
</main>
<?php get_footer(); ?>