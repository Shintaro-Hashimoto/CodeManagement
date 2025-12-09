<?php
/**
 * bau functions and definitions
 *
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

//js読み込み
if (!is_admin()) {
  function register_script(){
    //共通・プラグイン
    wp_register_script('bootstrap', home_url().'/assets/js/bootstrap.bundle.min.js', array(), '5.1.3', true);
    wp_register_script('swiper','https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js', array(), '11.0.0', true);
    wp_register_script('lib', home_url().'/assets/js/lib.js', array(), '1.0', true);
    wp_register_script('top', home_url().'/assets/js/top.js', array(), '1.0', true);
  }
  function add_script() {
    register_script();
    // 全ページ共通
    //wp_enqueue_script('jq');
    wp_enqueue_script('bootstrap');
    wp_enqueue_script('lib');
    if ( is_front_page() ){
      wp_enqueue_script('swiper');
      wp_enqueue_script('top');
    }
  }
  add_action('wp_print_scripts', 'add_script');

  function bau_enqueue_styles() {
    wp_enqueue_style('bau-bootstrap',home_url() . '/assets/css/custom_bootstrap.min.css');
    wp_enqueue_style('bau-bootstrapicon','https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css');
    if ( is_front_page() || is_home() ){
      wp_enqueue_style('bau-swiper','https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css');
    }
    wp_enqueue_style('bau-style',home_url() . '/assets/css/custom.css');
  }
  add_action( 'wp_enqueue_scripts', 'bau_enqueue_styles' );
}

//removemenu
add_action( 'admin_menu', 'remove_menus' );
function remove_menus(){
  if (current_user_can('editor')) {
    remove_menu_page( 'edit-comments.php' );
    //remove_menu_page( 'tools.php' );
    //remove_menu_page( 'options-general.php' );
    //remove_menu_page( 'edit.php?post_type=acf-field-group' );
  }
}

// remove wp version
function vc_remove_wp_ver_css_js( $src ) {
    if ( strpos( $src, 'ver=' . get_bloginfo( 'version' ) ) )
        $src = remove_query_arg( 'ver', $src );
    return $src;
}
add_filter( 'style_loader_src', 'vc_remove_wp_ver_css_js', 9999 );
add_filter( 'script_loader_src', 'vc_remove_wp_ver_css_js', 9999 );

//title生成
add_theme_support( 'title-tag' );

//titlセパレータ
add_filter( 'document_title_separator', 'my_document_title_separator' );
function my_document_title_separator( $sep ) {
  $sep = '|';
  return $sep;
}

//UNIXタイムスタンプ
add_filter('acf/update_value/type=date_time_picker', 'my_update_value_date_time_picker', 10, 3);
function my_update_value_date_time_picker( $value, $post_id, $field ) {
    return strtotime( $value );
}

// ウィジェット
if (function_exists('register_sidebar')) {
  register_sidebar(array(
  'name' => 'サイドエリア',
  'id' => 'rightside',
  'before_widget' => '<div class="sidebar">',
  'after_widget' => '</div>',
  'before_title' => '<h3 class="widget-title">',
  'after_title' => '</h3>'
  ));
}

// カスタムメニュー
register_nav_menus(
  array(
    'place_global' => 'グローバル',
    'place_mobile' => 'モバイル',
    'place_footer-left' => 'フッターレフト',
    'place_footer-right' => 'フッターライト'
  )
);

//「投稿」を変更、
function edit_admin_menus() {
  global $menu;
  $menu[5][0] = 'ブログ';    // 投稿
}
add_action( 'admin_menu', 'edit_admin_menus' );


//コメント停止
function add_comment_close( $open ) {
  $open = false;
  return $open;
}
add_filter( 'comments_open', 'add_comment_close', 10, 2 );


//ページネーション
function pagination($pages = '', $range = 2)
{
     $showitems = ($range * 2)+1;//表示するページ数（５ページを表示）
     global $paged;//現在のページ値
     if(empty($paged)) $paged = 1;//デフォルトのページ
     if($pages == '')
     {
         global $wp_query;
         $pages = $wp_query->max_num_pages;//全ページ数を取得
         if(!$pages)//全ページ数が空の場合は、１とする
         {
             $pages = 1;
         }
     }
     if(1 != $pages)//全ページが１でない場合はページネーションを表示する
     {
     echo "<div class=\"Page navigation\">\n";
     echo "<ul class=\"pagination justify-content-center\">\n";
         if($paged > 1) echo "<li class=\"prev\"><a href='".get_pagenum_link($paged - 1)."'><i class='ri-arrow-left-s-fill'></i></a></li>\n";
         for ($i=1; $i <= $pages; $i++)
         {
             if (1 != $pages &&( !($i >= $paged+$range+1 || $i <= $paged-$range-1) || $pages <= $showitems ))
             {
                echo ($paged == $i)? "<li class=\"active\">".$i."</li>\n":"<li><a href='".get_pagenum_link($i)."'>".$i."</a></li>\n";
             }
         }
    if ($paged < $pages) echo "<li class=\"next\"><a href=\"".get_pagenum_link($paged + 1)."\"><i class='ri-arrow-right-s-fill'></i></a></li>\n";
    echo "</ul>\n";
    echo "</div>\n";
     }
}

// メール確認
add_filter( 'wpcf7_validate_email', 'wpcf7_validate_email_filter_extend', 11, 2 );
add_filter( 'wpcf7_validate_email*', 'wpcf7_validate_email_filter_extend', 11, 2 );
function wpcf7_validate_email_filter_extend( $result, $tag ) {
    $type = $tag['type'];
    $name = $tag['name'];
    $_POST[$name] = trim( strtr( (string) $_POST[$name], "n", " " ) );
    if ( 'email' == $type || 'email*' == $type ) {
        if (preg_match('/(.*)_confirm$/', $name, $matches)){ //確認用メルアド入力フォーム名を ○○○_confirm としています。
            $target_name = $matches[1];
            if ($_POST[$name] != $_POST[$target_name]) {
                if (method_exists($result, 'invalidate')) {
                    $result->invalidate( $tag,"確認用のメールアドレスが一致していません");
                } else {
                    $result['valid'] = false;
                    $result['reason'][$name] = '確認用のメールアドレスが一致していません';
                }
            }
        }
    }
    return $result;
}

add_filter('wpcf7_autop_or_not', 'wpcf7_autop_return_false');
function wpcf7_autop_return_false() {
  return false;
}

//カスタム投稿タイプのページでナビにcurrent付与
function my_special_nav_class( $classes, $item ) {
  if ( is_singular( 'blog' ) && $item->type === 'post_type_archive' && $item->object === 'blog' ) {
    if ( ! in_array( 'current-post-ancestor', $classes ) ) {
      $classes[] = 'current-post-ancestor';
    }
  }
  else if( is_singular( 'info' ) && $item->type === 'post_type_archive' && $item->object === 'info' ) {
    if ( ! in_array( 'current-post-ancestor', $classes ) ) {
      $classes[] = 'current-post-ancestor';
    }
  }
  return $classes;
}
add_filter( 'nav_menu_css_class', 'my_special_nav_class', 10, 2 );

//アイキャッチ画像の表示
function add_thumbnail_size() {
    add_theme_support( 'post-thumbnails' );
    add_image_size('blog-thumb', 1200, 630, true );
    //add_image_size('slide-img', 1200, 800, true, array( 'center', 'center') );
}
add_action( 'after_setup_theme', 'add_thumbnail_size' );