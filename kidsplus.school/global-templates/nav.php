<?php
/**
 * The header for our theme.
 *
 * Displays all of the <head> section and everything up till <div id="content">
 *
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;
?>
<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasExample" aria-labelledby="offcanvasmenu">
  <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
  <div class="offcanvas-header">
    <div class="offcanvas-title logo" id="offcanvasmenu"><a href="index.html"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/logo.svg" alt="KIDS PLUS english 楽しく学ぶ。未来を創る。オンライン英会話"></a></div>
  </div>
  <div class="offcanvas-body">
      <?php wp_nav_menu(
        array(
          'theme_location'  => 'place_global',
          'container' => false,
          'menu_class'      => 'nav-item-link',
          'fallback_cb'     => '',
          'menu_id'         => 'main-menu',
          'depth'           => 2,
          //'walker'          => new bau_WP_Bootstrap_Navwalker(),
        )
      ); ?>
  </div>
</div>