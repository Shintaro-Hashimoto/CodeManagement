<?php
// テーマのセットアップ
function bridge_theme_setup() {
    // タイトルタグを自動生成
    add_theme_support( 'title-tag' );
    // アイキャッチ画像を使用可能に
    add_theme_support( 'post-thumbnails' );
}
add_action( 'after_setup_theme', 'bridge_theme_setup' );

// スクリプトとスタイルの読み込み
function bridge_enqueue_scripts() {
    // Tailwind CSS (CDN) の読み込み
    // ※本格運用時はビルド環境推奨ですが、今回は手軽さを優先してCDNを使用します
    wp_enqueue_script( 'tailwindcss', 'https://cdn.tailwindcss.com', array(), '3.0', false );

    // Tailwindの設定
    wp_add_inline_script( 'tailwindcss', "
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['\"Noto Sans JP\"', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            dark: '#1a1a1a',
                            gray: '#f4f4f4',
                            accent: '#6b7280'
                        }
                    }
                }
            }
        }
    " );

    // Google Fonts
    wp_enqueue_style( 'google-fonts', 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap', array(), null );
    
    // style.css
    wp_enqueue_style( 'main-style', get_stylesheet_uri() );
}
add_action( 'wp_enqueue_scripts', 'bridge_enqueue_scripts' );