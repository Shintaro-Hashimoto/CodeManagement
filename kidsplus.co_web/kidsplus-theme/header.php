<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php wp_title('|', true, 'right'); bloginfo('name'); ?></title>

  <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>

<div class="site-header">
  <div class="site-header-inner">

    <div class="site-logo">
      <a href="<?php echo home_url('/'); ?>">
        <img src="<?php echo get_template_directory_uri(); ?>/assets/logo.png"
             alt="KIDS PLUS ロゴ">
      </a>
    </div>

    <nav class="global-nav" id="global-nav">
      <?php
        wp_nav_menu([
          'theme_location' => 'global',
          'container'      => false,
          'items_wrap'     => '<ul>%3$s</ul>',
        ]);
      ?>
    </nav>

    <button type="button" class="menu-toggle" aria-controls="global-nav" aria-expanded="false">
      <span class="screen-reader-text" style="display:none;">メニューを開閉</span>
      <span></span>
      <span></span>
      <span></span>
    </button>

  </div>
</div>