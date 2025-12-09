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
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
<link rel="shortcut icon" href="<?php echo esc_url( home_url() ); ?>/assets/img/favicon.ico" type="image/x-icon" />
<link rel="apple-touch-icon" href="<?php echo esc_url( home_url() ); ?>/assets/img/apple-touch-icon.png" />
<link rel="apple-touch-icon" sizes="144x144" href="<?php echo esc_url( home_url() ); ?>/assets/img/apple-touch-icon-144x144.png" />
<link rel="apple-touch-icon" sizes="180x180" href="<?php echo esc_url( home_url() ); ?>/assets/img/apple-touch-icon-180x180.png" />
<?php include_once("analyticstracking.php") ?>
</head>
<body <?php body_class();?>  >
<header id="g-nav">
  <section class="navbar navbar-wellness navbar-expand-lg justify-content-between">
    <h1 class="logo"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/logo.svg" alt="楽しく学ぶ。未来を創る。オンライン英会話 KIDS PLUS english"></a></h1>
    <div class="navbar-nav flex-row">
      <div class="collapse navbar-collapse">
        <div class="nav-item">
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
      <a class="mobile-icon btn navbar-toggler" data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample"></a>
    </div>
  </section>
</header>