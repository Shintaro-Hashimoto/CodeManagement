<?php
// タイトルタグの自動生成などを有効化
function approg_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
}
add_action('after_setup_theme', 'approg_setup');

// スタイルシートの読み込み
function approg_scripts() {
    // 第4引数に現在時刻(time)を入れることで、毎回違うファイルとして読み込ませる
    // ※開発が終わったら '1.0.0' など固定の数字に戻すと良いです
    wp_enqueue_style('main-style', get_stylesheet_uri(), array(), time());
}
add_action('wp_enqueue_scripts', 'approg_scripts');
?>