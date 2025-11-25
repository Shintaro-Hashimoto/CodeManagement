<?php
/**
 * Template Name: カスタムホーム (Code Editor)
 * Description: コードエディタで構築した軽量トップページ
 */

get_header(); // 共通ヘッダーを読み込み
?>

<style>
    /* 共通設定 */
    .custom-home-wrapper {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #333;
    }
    
    /* ヒーローセクション */
    .hero-section {
        position: relative;
        height: 80vh;
        min-height: 500px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #fff;
        overflow: hidden;
        background-color: #333;
    }

    /* スライダー関連 */
    .hero-slider, .hero-slide {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    }
    .hero-slide {
        background-size: cover;
        background-position: center;
        opacity: 0; transition: opacity 2.5s ease-in-out; z-index: 1;
    }
    .hero-slide.active { opacity: 1; z-index: 2; }

    .hero-overlay {
        background: rgba(0, 0, 0, 0.3);
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;
    }
    .hero-content {
        position: relative; z-index: 4; padding: 20px;
    }
    .hero-title {
        font-size: 3rem; margin-bottom: 20px; font-weight: bold; text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
    .hero-subtitle {
        font-size: 1.2rem; margin-bottom: 40px; line-height: 1.6;
    }

    /* シュトーレン特設バナー */
    .promo-section {
        max-width: 1000px; margin: -60px auto 60px; position: relative; z-index: 5; padding: 0 20px;
    }
    .promo-box {
        background-color: #fff; border: 2px solid #8D6E63; border-radius: 12px; padding: 30px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        background-image: linear-gradient(to bottom right, #fff, #fffbf5);
        overflow: hidden;
    }
    .promo-content-wrapper { display: flex; align-items: center; gap: 30px; }
    .promo-image { flex: 1; max-width: 45%; }
    .promo-image img { width: 100%; height: auto; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: block; }
    .promo-text-area { flex: 1.2; text-align: left; }
    .promo-badge {
        display: inline-block; background-color: #c62828; color: #fff; font-size: 0.85rem; font-weight: bold;
        padding: 4px 15px; border-radius: 20px; margin-bottom: 15px; letter-spacing: 0.05em;
    }
    .promo-title { font-size: 1.8rem; color: #333; margin-bottom: 15px; font-weight: bold; line-height: 1.3; }
    .promo-text { font-size: 0.95rem; color: #666; margin-bottom: 25px; line-height: 1.8; }
    .btn-promo {
        display: inline-block; background-color: #8D6E63; color: #fff; padding: 12px 40px; border-radius: 50px;
        font-weight: bold; text-decoration: none; transition: transform 0.3s, background 0.3s;
        box-shadow: 0 4px 10px rgba(141, 110, 99, 0.4);
    }
    .btn-promo:hover { background-color: #6d4c41; transform: translateY(-2px); }

    /* 3つの入り口 */
    .service-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 30px;
        max-width: 1200px;
        margin: 0 auto 80px; 
        padding: 0 20px;
        position: relative;
        z-index: 3;
    }
    .service-card {
        background: #fff; text-align: center; border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.08); transition: transform 0.3s ease;
        display: flex; flex-direction: column; overflow: hidden; height: 100%;
    }
    .service-card:hover { transform: translateY(-5px); }
    .service-img-frame { width: 100%; height: 220px; overflow: hidden; }
    .service-img-frame img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
    .service-card:hover .service-img-frame img { transform: scale(1.05); }
    .service-body { padding: 25px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .service-title { font-size: 1.4rem; margin-bottom: 15px; color: #2C5F2D; font-weight: bold; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
    .service-desc { font-size: 0.95rem; margin-bottom: 25px; line-height: 1.8; color: #666; flex-grow: 1; }
    .btn-custom {
        display: inline-block; padding: 10px 30px; background-color: #E76F51; color: #fff;
        text-decoration: none; border-radius: 50px; font-weight: bold; transition: background 0.3s; align-self: center;
    }
    .btn-custom:hover { background-color: #d65a3b; }
    .btn-custom.green { background-color: #2C5F2D; }
    .btn-custom.brown { background-color: #8D6E63; }

    /* NEWS & EVENT */
    .news-list { list-style: none; padding: 0; margin: 0 0 30px; text-align: left; }
    .news-list li { border-bottom: 1px solid #eee; padding: 15px 0; }
    .news-list li:last-child { border-bottom: none; }
    .news-date { font-size: 0.9rem; color: #888; margin-right: 15px; display: inline-block; min-width: 80px; }
    .news-list a { color: #333; text-decoration: none; font-weight: 500; transition: color 0.2s; }
    .news-list a:hover { color: #E76F51; text-decoration: underline; }

    /* ★追加: Instagramセクション用スタイル */
    .insta-section {
        max-width: 1200px; margin: 0 auto 60px; padding: 0 20px; text-align: center;
    }
    .insta-header {
        display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px;
    }
    .insta-title { font-size: 1.5rem; font-weight: bold; color: #333; margin: 0; }
    /* アイコンはFontAwesome等ではなくSVG直書きで崩れ防止 */
    .insta-icon-svg { width: 32px; height: 32px; fill: url(#insta-gradient); }

    /* スマホ対応 */
    @media (max-width: 768px) {
        .hero-title { font-size: 2rem; }
        .promo-section { margin-top: -30px; margin-bottom: 40px; }
        .promo-content-wrapper { flex-direction: column; text-align: center; }
        .promo-image { max-width: 100%; margin-bottom: 20px; }
        .promo-text-area { text-align: center; }
        .promo-title { font-size: 1.5rem; }
        .service-grid { grid-template-columns: 1fr; margin-top: 0; gap: 40px; }
        .news-date { display: block; margin-bottom: 5px; }
    }
</style>

<svg style="width:0;height:0;position:absolute;" aria-hidden="true" focusable="false">
  <linearGradient id="insta-gradient" x2="1" y2="1">
    <stop offset="0%" stop-color="#405de6" />
    <stop offset="50%" stop-color="#5851db" />
    <stop offset="100%" stop-color="#833ab4" />
    <stop offset="100%" stop-color="#c13584" />
    <stop offset="100%" stop-color="#e1306c" />
    <stop offset="100%" stop-color="#fd1d1d" />
  </linearGradient>
</svg>

<div class="custom-home-wrapper">

    <section class="hero-section">
        <div class="hero-slider">
            <div class="hero-slide active" style="background-image: url('<?php echo get_stylesheet_directory_uri(); ?>/images/hero1.jpg');"></div>
            <div class="hero-slide" style="background-image: url('<?php echo get_stylesheet_directory_uri(); ?>/images/hero2.jpg');"></div>
            <div class="hero-slide" style="background-image: url('<?php echo get_stylesheet_directory_uri(); ?>/images/hero3.jpg');"></div>
            <div class="hero-slide" style="background-image: url('<?php echo get_stylesheet_directory_uri(); ?>/images/hero4.jpg');"></div>
        </div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <h1 class="hero-title">手作りの温もりと、<br>信州の旬を味わう。</h1>
            <p class="hero-subtitle">
                地元野菜の創作料理と焼きたてパン。<br>
                アボリアでしか味わえない「美味しい」時間。
            </p>
        </div>
    </section>

    <section class="promo-section">
        <div class="promo-box">
            <div class="promo-content-wrapper">
                <div class="promo-image">
                    <img src="<?php echo get_stylesheet_directory_uri(); ?>/images/stollen-promo.jpg" alt="自家製シュトーレン">
                </div>
                <div class="promo-text-area">
                    <span class="promo-badge">Seasonal Special</span>
                    <h2 class="promo-title">自家製シュトーレン<br>予約受付中</h2>
                    <p class="promo-text">
                        毎年ご好評いただいているパン工房MARIKOの特製シュトーレン。ドライフルーツとナッツがぎっしり詰まった、この時期だけの贅沢な味わいです。<br>
                        クリスマスを待つ幸せな時間を、こだわりの味と共に。
                    </p>
                    <a href="/stollen-order/" class="btn-promo">ご注文はこちら &rarr;</a>
                </div>
            </div>
        </div>
    </section>

    <section class="service-grid">
        <div class="service-card">
            <div class="service-img-frame">
                <img src="<?php echo get_stylesheet_directory_uri(); ?>/images/home_card_stay.jpg" alt="宿泊">
            </div>
            <div class="service-body">
                <div>
                    <h2 class="service-title">宿泊</h2>
                    <p class="service-desc">
                        標高1,300mの静寂。<br>
                        <strong style="color: #2C5F2D;">評判の創作料理</strong>と温かいおもてなし。ゆったりとした時間をお過ごしください。
                    </p>
                </div>
                <a href="<?php echo home_url('/stay'); ?>" class="btn-custom green">プランを見る</a>
            </div>
        </div>
        <div class="service-card">
            <div class="service-img-frame">
                <img src="<?php echo get_stylesheet_directory_uri(); ?>/images/home_card_camp.jpg" alt="キャンプ空庭">
            </div>
            <div class="service-body">
                <div>
                    <h2 class="service-title">CAMP 空庭</h2>
                    <p class="service-desc">
                        1日1組限定、満天の星空。<br>プライベートキャンプ場「空庭」。
                    </p>
                </div>
                <a href="<?php echo home_url('/camp'); ?>" class="btn-custom green">キャンプ場へ</a>
            </div>
        </div>
        <div class="service-card">
            <div class="service-img-frame">
                <img src="<?php echo get_stylesheet_directory_uri(); ?>/images/home_card_bakery.jpg" alt="パン工房">
            </div>
            <div class="service-body">
                <div>
                    <h2 class="service-title">パン工房 MARIKO</h2>
                    <p class="service-desc">
                        35年焼き続ける自慢の味。<br>シュトーレンのご注文はこちら。
                    </p>
                </div>
                <a href="<?php echo home_url('/bakery'); ?>" class="btn-custom brown">パン工房へ</a>
            </div>
        </div>
    </section>

    <section style="max-width: 800px; margin: 0 auto 80px; padding: 20px;">
        <h3 style="font-size: 1.8rem; margin-bottom: 30px; color:#333; text-align: center;">NEWS & EVENT</h3>
        <ul class="news-list">
            <?php
            $news_query = new WP_Query( array(
                'post_type'      => 'post',
                'posts_per_page' => 2,
                'ignore_sticky_posts' => 1
            ) );
            if ( $news_query->have_posts() ) :
                while ( $news_query->have_posts() ) : $news_query->the_post();
            ?>
                <li>
                    <span class="news-date"><?php echo get_the_date('Y.m.d'); ?></span>
                    <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                </li>
            <?php
                endwhile;
                wp_reset_postdata();
            else :
            ?>
                <li style="text-align: center; border:none;">現在、お知らせはありません。</li>
            <?php endif; ?>
        </ul>
        <div style="text-align: center;">
            <a href="<?php echo home_url('/news'); ?>" style="color: #2C5F2D; text-decoration: underline; font-weight: bold;">お知らせ一覧へ &rarr;</a>
        </div>
    </section>

    <section class="insta-section">
        <div class="insta-header">
            <svg class="insta-icon-svg" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <h3 class="insta-title">avoriaz_jp</h3>
        </div>
        
        <?php echo do_shortcode('[instagram-feed feed=1]'); ?>
        
        <div style="margin-top: 20px;">
            <a href="https://www.instagram.com/avoriaz_jp/" target="_blank" class="btn-custom" style="background:#fff; color:#333; border:1px solid #ddd; font-size:0.9rem;">
                Instagramでフォロー
            </a>
        </div>
    </section>

</div>

<?php get_footer(); ?>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var slides = document.querySelectorAll('.hero-slide');
    var current = 0;
    var slideInterval = setInterval(nextSlide, 5000);

    function nextSlide() {
        if (slides.length > 0) {
            slides[current].classList.remove('active');
            current = (current + 1) % slides.length;
            slides[current].classList.add('active');
        }
    }
});
</script>