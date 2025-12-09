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
          <div class="archive-contents">
            <ul class="nav justify-content-center cat-list mb-3">
<!--               <li><a href="<?php echo esc_url( home_url( '/blog/' ) ); ?>">全て</a></li> -->
              <?php wp_list_categories('title_li=&child_of=0&hierarchical=0&hide_empty=0'); ?>
            </ul>
            <div class="row gy-3 top-blog ">
<?php while ( have_posts() ) : the_post(); ?>
  <?php get_template_part('loop-templates/list','blog'); ?>
<?php endwhile; // end of the loop. ?>
            </div>
            <div class="row">
              <div class="col-12">
<?php if (function_exists("pagination")) { pagination($wp_query->max_num_pages); } ?>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

  </article>
</main>
<?php get_footer(); ?>