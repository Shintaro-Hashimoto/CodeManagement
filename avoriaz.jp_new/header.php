<?php
/**
 * The header for our theme
 */
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>

<header class="site-header">
    <div class="header-container">
        <div class="site-logo">
            <a href="<?php echo home_url(); ?>">
                <img src="<?php echo get_stylesheet_directory_uri(); ?>/images/avoriaz_logo.png" alt="LODGE AVORIAZ">
            </a>
        </div>

        <nav class="site-navigation" id="site-navigation">
            <?php
            wp_nav_menu( array(
                'theme_location' => 'global-menu',
                'container'      => false,         
                'menu_class'     => '',            
                'items_wrap'     => '<ul>%3$s</ul>', 
                'fallback_cb'    => false,         
            ) );
            ?>
        </nav>

        <div class="header-cta">
            <a href="<?php echo home_url('/reservation-stay'); ?>" class="btn-reserve">宿泊予約</a>
        </div>
        
        <button class="menu-toggle" id="menu-toggle" aria-label="メニューを開く">
            <span></span>
            <span></span>
            <span></span>
        </button>
    </div>
</header>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // 1. ハンバーガーメニュー制御
    var toggleBtn = document.getElementById('menu-toggle');
    var nav = document.getElementById('site-navigation');
    if (toggleBtn && nav) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            nav.classList.toggle('is-open');
            toggleBtn.classList.toggle('open');
        });
    }

    // 2. キャンセルポリシーモーダル制御 (改良版)
    var modal = document.getElementById('policyModal');
    var closeBtn = document.getElementById('closePolicyModal');

    // ★重要: リンクが動的に生成されても反応するように「document」全体で監視します
    document.addEventListener('click', function(e) {
        // クリックされた要素が「open-policy-modal」クラスを持っているか確認
        if (e.target && e.target.classList.contains('open-policy-modal')) {
            e.preventDefault(); // リンク遷移を無効化
            if (modal) {
                modal.classList.add('is-open'); // モーダルを開く
            }
        }
        
        // 背景クリックで閉じる処理
        if (e.target === modal) {
            modal.classList.remove('is-open');
        }
    });

    // 閉じるボタンの処理
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('is-open');
        });
    }
});
</script>