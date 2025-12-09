<?php
/**
 * Single post partial template.
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;
?>
  <div class="type-blog">
    <span class="cat-box"><?php the_category(' '); ?></span>
    <h1 class="page-title"><?php the_title(); ?></h1>
    <?php the_content(); ?>
  </div>