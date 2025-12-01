<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    <header class="site-header">
        <div class="inner">
            <h1 class="logo">
                <a href="<?php echo home_url(); ?>">
                <img src="<?php echo get_template_directory_uri(); ?>/images/logo.png" alt="APProg" class="logo-img">
                </a>
            </h1>
            <nav class="global-nav">
    <ul>
        <li><a href="<?php echo home_url('/'); ?>">Home</a></li>
        <li><a href="<?php echo home_url('/service/'); ?>">Service</a></li>
        <li><a href="<?php echo home_url('/works/'); ?>">Works</a></li>
        <li><a href="<?php echo home_url('/company/'); ?>">Company</a></li>
        <li><a href="<?php echo home_url('/contact/'); ?>">Contact</a></li>
    </ul>
</nav>
        </div>
    </header>
    <main class="site-main">