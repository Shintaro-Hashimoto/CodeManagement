<?php
/**
 * kidsplus-theme functions
 */

/* ---------------------------------------------
 * グローバルメニュー登録
 * --------------------------------------------- */
function kidsplus_setup() {
  register_nav_menus([
    'global' => 'グローバルメニュー',
  ]);
  
  // ★ アイキャッチ画像を使えるようにする
  add_theme_support('post-thumbnails');
}
add_action('after_setup_theme', 'kidsplus_setup');


/* ---------------------------------------------
 * CSS と JavaScript を読み込む
 * --------------------------------------------- */
function kidsplus_enqueue_assets() {
  
  // CSS（style.css）を読み込む
  wp_enqueue_style(
    'kidsplus-style',
    get_stylesheet_uri(),
    [],
    '1.5' /* ★ バージョンを 1.5 に変更（キャッシュ対策） */
  );

  // JavaScript (js/main.js) を読み込む（追加）
  wp_enqueue_script(
    'kidsplus-main',
    get_template_directory_uri() . '/js/main.js',
    [],    // S
    '1.5', /* ★ バージョンを 1.5 に変更（キャッシュ対策） */
    true   // trueにすると </body> 直前で読み込む
  );
}
add_action('wp_enqueue_scripts', 'kidsplus_enqueue_assets');