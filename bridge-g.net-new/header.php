<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class( 'text-gray-800 bg-white' ); ?>>
<?php wp_body_open(); ?>

<!-- ヘッダー (固定表示) -->
<header class="fixed w-full top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 transition-all duration-300">
    <div class="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <!-- ロゴエリア -->
        <h1 class="font-bold tracking-wider text-brand-dark leading-none">
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="hover:opacity-70 transition-opacity block">
                <!-- ロゴ画像読み込み -->
                <!-- クラス h-10 (高さ40px) w-auto (幅自動) でサイズ調整しています -->
                <img src="<?php echo get_template_directory_uri(); ?>/images/logo.png" alt="bridge, llc." class="h-10 w-auto">
            </a>
        </h1>

        <!-- ナビゲーション -->
        <nav>
            <ul class="flex space-x-6 text-sm font-medium text-gray-600">
                <li><a href="#about" class="hover:text-black transition-colors">COMPANY</a></li>
                <li><a href="#business" class="hover:text-black transition-colors">BUSINESS</a></li>
            </ul>
        </nav>
    </div>
</header>

<!-- コンテンツ開始 -->
<div id="content" class="pt-16">