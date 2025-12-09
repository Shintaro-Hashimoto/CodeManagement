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
  <section class="bread">
    <div class="container-fluid">
      <div class="row">
      <div class="col-12">
        <div class="breadcrumbs" typeof="BreadcrumbList" vocab="https://schema.org/">
          <?php if(function_exists('bcn_display')) { bcn_display(); }?>
        </div>
      </div>
    </div>
  </div>
  </section>